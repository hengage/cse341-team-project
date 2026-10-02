import Booking from './schemas/bookings.js';

const createBooking = async (bookingData) => {
    const booking = new Booking(bookingData);
    await booking.save();
    return booking;
};

const getAllBookings = async () => {
    return await Booking.find({});
};

const getPaginatedBookings = async ({ page, limit, filters }) => {
    const filter = {};
    if (filters.ticketClass) {
        filter.ticketClass = filters.ticketClass;
    }

    if (filters.startDate || filters.endDate) {
        filter.createdAt = {};
        if (filters.startDate) {
            filter.createdAt.$gte = new Date(`${filters.startDate}T00:00:00.000Z`);
        }
        if (filters.endDate) {
            const endDateExclusive = new Date(`${filters.endDate}T00:00:00.000Z`);
            endDateExclusive.setUTCDate(endDateExclusive.getUTCDate() + 1);
            filter.createdAt.$lt = endDateExclusive;
        }
    }

    const [totalItems, bookings] = await Promise.all([
        Booking.countDocuments(filter),
        Booking.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
    ]);
    const totalPages = Math.ceil(totalItems / limit);

    return {
        bookings,
        pagination: {
            page,
            limit,
            totalItems,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1 && totalItems > 0
        },
        filters
    };
};

const getBookingById = async (id) => {
    return await Booking.findOne({ id });
};

export { createBooking, getBookingById, getAllBookings, getPaginatedBookings };