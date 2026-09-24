import mongoose from 'mongoose';

const passengerSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true }
});

const bookingSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    createdAt: { type: Date, required: true },
    ticketClass: { type: String, required: true },
    selectedDay: { type: String, required: true },
    passengers: { type: [passengerSchema], required: true }
});

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;