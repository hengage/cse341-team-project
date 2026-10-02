import express from 'express';
import * as tripController from '../controllers/trips.js';
import { getSchedulesForTrip, getSchedulesForTripAndMonth } from '../controllers/schedules.js';
import * as bookingController from '../controllers/bookings.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Trip:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: alpine-panorama
 *         name:
 *           type: string
 *           example: Alpine Panorama Express
 *         description:
 *           type: string
 *         region:
 *           type: string
 *           example: central
 *         startStation:
 *           type: string
 *           example: nagoya
 *         endStation:
 *           type: string
 *           example: toyama
 *         duration:
 *           type: string
 *           example: 4.5 hours
 *         distance:
 *           type: number
 *           example: 180
 *         highlights:
 *           type: array
 *           items:
 *             type: string
 *         bestSeason:
 *           type: string
 *           example: autumn
 *         operatingMonths:
 *           type: array
 *           items:
 *             type: integer
 *           description: Months (1-12) the trip operates in.
 *         imageUrl:
 *           type: string
 *     Schedule:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         tripId:
 *           type: string
 *           example: alpine-panorama
 *         departureTime:
 *           type: string
 *           example: "08:30"
 *         arrivalTime:
 *           type: string
 *           example: "13:00"
 *         daysOfWeek:
 *           type: array
 *           items:
 *             type: string
 *           example: [monday, tuesday, wednesday, thursday, friday]
 *         status:
 *           type: boolean
 *     Booking:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: 1
 *         createdAt:
 *           type: string
 *           example: "2024-06-01T12:00:00Z"
 *         ticketClass:
 *           type: string
 *           example: economy
 *         selectedDay:
 *           type: string
 *           example: "2024-06-15"
 *         passengers:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Passenger'
 *     BookingPagination:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 *         totalItems:
 *           type: integer
 *         totalPages:
 *           type: integer
 *         hasNextPage:
 *           type: boolean
 *         hasPreviousPage:
 *           type: boolean
 *     Passenger:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *           example: John
 *         lastName:
 *           type: string
 *           example: Doe
 *         email:
 *           type: string
 *           example: john.doe@example.com
 *         phone:
 *           type: string
 *           example: "+1234567890"
 */

/**
 * @swagger
 * /api/trips:
 *   get:
 *     summary: Get all trips
 *     tags: [Trips]
 *     responses:
 *       200:
 *         description: An array of trips
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Trip'
 *       500:
 *         description: Server error
 */
router.get('/trips', tripController.getAllTrips);

/**
 * @swagger
 * /api/trips/{id}:
 *   get:
 *     summary: Get a single trip by id
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip id
 *     responses:
 *       200:
 *         description: The requested trip
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Trip'
 *       404:
 *         description: Trip not found
 *       500:
 *         description: Server error
 */
router.get('/trips/:id', tripController.getTripById);

/**
 * @swagger
 * /api/trips/{id}/schedules:
 *   get:
 *     summary: Get schedules for a trip, optionally filtered by operating month
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip id
 *       - in: query
 *         name: month
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Filters schedules according to the trip's operating months (1-12).
 *     responses:
 *       200:
 *         description: An array of schedules
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Schedule'
 *       400:
 *         description: Invalid month
 *       500:
 *         description: Server error
 */
// Schedules, optionally filtered by operating month via ?month=1-12
router.get('/trips/:id/schedules', (req, res) => {
    if (req.query.month === undefined) {
        return getSchedulesForTrip(req, res);
    }

    return getSchedulesForTripAndMonth(req, res);
});

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Get a page of bookings
 *     tags: [Bookings]
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number. Defaults to 1.
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of bookings per page. Defaults to 10; maximum is 50.
 *       - in: query
 *         name: ticketClass
 *         required: false
 *         schema:
 *           type: string
 *           enum: [standard, premium, first]
 *         description: Filter by exact ticket class.
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: '2026-10-01'
 *         description: Include bookings created at or after 00:00 UTC on this date (createdAt).
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: '2026-10-02'
 *         description: Include bookings through this date in UTC (createdAt).
 *     responses:
 *       200:
 *         description: A page of bookings matching the active filters, sorted newest first by createdAt.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bookings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *                 pagination:
 *                   $ref: '#/components/schemas/BookingPagination'
 *                 filters:
 *                   type: object
 *                   properties:
 *                     ticketClass:
 *                       type: string
 *                       nullable: true
 *                       enum: [standard, premium, first]
 *                       example: standard
 *                     startDate:
 *                       type: string
 *                       nullable: true
 *                       format: date
 *                       example: '2026-10-01'
 *                     endDate:
 *                       type: string
 *                       nullable: true
 *                       format: date
 *                       example: '2026-10-02'
 *       400:
 *         description: Invalid pagination or filter query parameter, malformed date, impossible date, or startDate later than endDate
 *       500:
 *         description: Server error
 */
router.get('/bookings', bookingController.getAllBookingsHandler);

export default router;
