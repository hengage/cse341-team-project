import express from 'express';
import * as tripController from '../controllers/trips.js';

const router = express.Router();

// EJS routes
router.get('/trips', tripController.getTripsPage);
router.get('/trips/:tripId', tripController.getTripDetailsPage);

export default router;