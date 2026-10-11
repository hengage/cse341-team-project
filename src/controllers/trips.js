import * as tripModel from '../models/trips.js';
import { getSchedulesByTripId } from '../models/schedules.js';

export const getTrips = async (req, res) => {
  try {
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);
    
    if (!Number.isInteger(page) || !Number.isInteger(limit) ||
        page < 1 || limit < 1 || limit > 50) {
      return res.status(400).json({ message: 'Invalid page or limit' });
    }

    const { trips, totalItems } = await tripModel.getPaginatedTrips(page, limit);
    
    return res.json({
      data: trips,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        hasNextPage: page * limit < totalItems,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getTripById = async (req, res) => {
  try {
    const trip = await tripModel.getTripById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    return res.json(trip);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getTripsPage = async (req, res) => {
  res.render('trips/list', {
    title: 'Scenic Train Trips'
  });
};

export const getTripDetailsPage = async (req, res) => {
  const { tripId } = req.params;
  const trip = await tripModel.getTripById(tripId);

  if (!trip) {
    return res.status(404).render('errors/404', {
      title: 'Trip Not Found'
    });
  }

  const schedules = await getSchedulesByTripId(tripId);
  return res.render('trips/details', {
    title: 'Trip Details',
    details: trip,
    schedules
  });
};
