import express from 'express';
import * as tripController from '../../controllers/trips.js';

const router = express.Router();

/**
 * @swagger
 * /api/trips:
 *   get:
 *     summary: Retrieve a list of all trips
 *     responses:
 *       200:
 *         description: A list of trips
 */
router.get('/trips', tripController.getAllTrips);

/**
 * @swagger
 * /api/trips/{id}:
 *   get:
 *     summary: Retrieve a trip by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A single trip
 *       404:
 *         description: Trip not found
 */
router.get('/trips/:id', tripController.getTripById);

export default router;