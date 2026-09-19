import * as tripModel from '../models/trips.js';

export const getAllTrips = async (req, res) => {
  try {
    const trips = await tripModel.getAllTrips();
    return res.json(trips);
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
