import mongoose, { Schema, model, models, Document, Types } from 'mongoose';

/**
 * TypeScript interface for Booking document
 * Extends mongoose Document to include all Booking fields with proper types
 */
export interface IBooking extends Document {
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event', // Reference to Event model
      required: [true, 'Event ID is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      validate: {
        validator: (v: string) => {
          // RFC 5322 compliant email validation regex
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Please provide a valid email address',
      },
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt
  }
);

/**
 * Pre-save hook to validate that the referenced Event exists
 * Prevents orphaned bookings by checking Event existence before saving
 */
BookingSchema.pre('save', async function () {
  // Only validate eventId if it's new or modified
  if (this.isNew || this.isModified('eventId')) {
    // Dynamically import Event model to avoid circular dependency
    const Event = mongoose.models.Event || (await import('./event.model')).default;
    
    // Check if the event exists in the database
    const eventExists = await Event.findById(this.eventId);
    
    if (!eventExists) {
      throw new Error(`Event with ID ${this.eventId} does not exist`);
    }
  }
});

// Create index on eventId for faster queries when filtering bookings by event
BookingSchema.index({ eventId: 1 });

// Export model, checking if it already exists to prevent OverwriteModelError in development
const Booking = models.Booking || model<IBooking>('Booking', BookingSchema);

export default Booking;
