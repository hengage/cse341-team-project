import { createBooking, getPaginatedBookings } from '../models/bookings.js';
import { getDb } from '../db/connect.js';
import { generateConfirmationCode } from '../includes/helpers.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const BOOKING_TICKET_CLASSES = ['standard', 'premium', 'first'];

const parsePositiveInteger = (value) => {
    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
        return null;
    }

    const parsedValue = Number(value);
    return Number.isSafeInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

const isValidDateOnly = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const year = Number(value.slice(0, 4));
    if (year < 1) {
        return false;
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const getAllBookingsHandler = async (req, res) => {
    try {
        const page = req.query.page === undefined
            ? DEFAULT_PAGE
            : parsePositiveInteger(req.query.page);
        if (page === null) {
            return res.status(400).json({ error: 'page must be a positive integer.' });
        }

        const limit = req.query.limit === undefined
            ? DEFAULT_LIMIT
            : parsePositiveInteger(req.query.limit);
        if (limit === null || limit > MAX_LIMIT) {
            return res.status(400).json({
                error: `limit must be a positive integer no greater than ${MAX_LIMIT}.`
            });
        }

        const ticketClass = req.query.ticketClass === undefined ? null : req.query.ticketClass;
        if (ticketClass !== null
            && (typeof ticketClass !== 'string' || !BOOKING_TICKET_CLASSES.includes(ticketClass))) {
            return res.status(400).json({
                error: `ticketClass must be one of: ${BOOKING_TICKET_CLASSES.join(', ')}.`
            });
        }

        const startDate = req.query.startDate === undefined ? null : req.query.startDate;
        if (startDate !== null && !isValidDateOnly(startDate)) {
            return res.status(400).json({ error: 'startDate must be a valid date in YYYY-MM-DD format.' });
        }

        const endDate = req.query.endDate === undefined ? null : req.query.endDate;
        if (endDate !== null && !isValidDateOnly(endDate)) {
            return res.status(400).json({ error: 'endDate must be a valid date in YYYY-MM-DD format.' });
        }

        if (startDate && endDate && startDate > endDate) {
            return res.status(400).json({ error: 'startDate cannot be later than endDate.' });
        }

        const filters = { ticketClass, startDate, endDate };
        const result = await getPaginatedBookings({ page, limit, filters });
        return res.status(200).json(result);
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

const bookingsAdminPage = (req, res) => {
    return res.render('bookings', {
        title: 'All Bookings'
    });
};

export { bookingPage, processBookingRequest, getAllBookingsHandler, bookingsAdminPage };