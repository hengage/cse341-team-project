import { createBooking, getAllBookings } from '../models/bookings.js';
import { getDb } from '../db/connect.js';
import { generateConfirmationCode } from '../includes/helpers.js';

const getAllBookingsHandler = async (req, res) => {
    try {
        const bookings = await getAllBookings();
        return res.status(200).json(bookings);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const bookingPage = async (req, res) => {
    const { scheduleId } = req.params;

    const db = getDb();
    const schedule = await db.collection('schedules').findOne({ id: Number(scheduleId) });
    const trip = await db.collection('trips').findOne({ id: schedule.tripId });
    const ticketClasses = await db.collection('ticketClasses').find({}).toArray();
    const ticketOptions = ticketClasses.map((ticketClass) => ({
        class: ticketClass.class,
        name: ticketClass.name,
        price: trip.distance * ticketClass.pricePerKm,
        amenities: ticketClass.amenities,
        description: ticketClass.description
    }));

    res.render('trips/book', {
        title: 'Book Trip',
        schedule,
        ticketOptions
    });
};

const processBookingRequest = async (req, res) => {
    const booking = {
        id: generateConfirmationCode(),
        createdAt: new Date().toISOString(),
        ...req.body
    };
    await createBooking(booking);

    res.redirect(`/trips/confirmation/${booking.id}`);
};

const bookingsAdminPage = async (req, res) => {
    try {
        const bookings = await getAllBookings();
        return res.render('bookings', {
            title: 'All Bookings',
            bookings
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export { bookingPage, processBookingRequest, getAllBookingsHandler, bookingsAdminPage };