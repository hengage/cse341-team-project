import { getDb } from '../db/connect.js';

export default async (req, res) => {
    const { bookingId } = req.params;

    const booking = await getDb().collection('bookings').findOne({ id: bookingId });

    res.render('trips/confirm', {
        title: 'Trip Confirmation',
        booking
    });
};
