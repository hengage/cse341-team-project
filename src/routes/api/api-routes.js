import express from 'express';
import * as tripController from '../../controllers/trips.js';

const router = express.Router();

/**
 * @swagger
 * /api/trips:
 *   get:
 *     summary: Retrieve a paginated list of trips
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *     responses:
 *       200:
 *         description: A paginated list of trips
 */
router.get('/trips', tripController.getTrips);

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