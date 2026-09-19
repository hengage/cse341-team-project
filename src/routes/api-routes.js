import express from 'express';
import * as tripController from '../controllers/trips.js';

const router = express.Router();

// Trips
router.get('/trips', tripController.getAllTrips);
router.get('/trips/:id', tripController.getTripById);

export default router;
