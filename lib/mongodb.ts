import mongoose from 'mongoose';

// Define the MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

// Throw an error if MONGODB_URI is not defined in environment variables
if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

/**
 * Global type declaration for caching the mongoose connection
 * This prevents TypeScript errors when accessing global.mongoose
 */
declare global {
  // eslint-disable-next-line no-var
  var mongoose: {
    conn: mongoose.Connection | null;
    promise: Promise<mongoose.Connection> | null;
  };
}

/**
 * Global cache for the mongoose connection
 * In development, Next.js hot reloads can create multiple connections
 * This cache ensures we reuse the existing connection instead of creating new ones
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Establishes and returns a cached MongoDB connection using Mongoose
 * 
 * @returns Promise<mongoose.Connection> - The active MongoDB connection
 * 
 * How it works:
 * - On first call: Creates a new connection and caches both the promise and connection
 * - On subsequent calls: Returns the cached connection if available, or waits for the pending promise
 * - In production: Connection is established once per deployment
 * - In development: Connection persists across hot reloads via global cache
 */
async function connectDB(): Promise<mongoose.Connection> {
  // Return cached connection if it exists
  if (cached.conn) {
    return cached.conn;
  }

  // If no promise exists, create a new connection
  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false, // Disable mongoose buffering to fail fast on connection issues
    };

    // Create and cache the connection promise
    cached.promise = mongoose.connect(MONGODB_URI as string, opts).then((mongooseInstance) => {
      return mongooseInstance.connection;
    });
  }

  try {
    // Wait for the connection promise to resolve and cache the connection
    cached.conn = await cached.promise;
  } catch (error) {
    // Reset the promise cache on error to allow retry on next call
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default connectDB;
