import express from 'express';
import * as tripController from '../controllers/trips.js';
import * as bookingController from '../controllers/bookings.js';

const router = express.Router();

// EJS routes
router.get('/trips', tripController.getTripsPage);

router.get('/bookings', bookingController.bookingsAdminPage);

export default router;
