import * as tripModel from '../models/trips.js';

export const getTrips = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    // Filtering
    const filter = {};
    if (req.query.region) filter.region = req.query.region;
    if (req.query.bestSeason) filter.bestSeason = req.query.bestSeason;
    
    // Keyword search
    if (req.query.q) {
      filter.$or = [
        { name: { $regex: req.query.q, $options: 'i' } },
        { description: { $regex: req.query.q, $options: 'i' } }
      ];
    }
    
    if (page < 1 || limit < 1 || limit > 50) {
      return res.status(400).json({ message: 'Invalid page or limit' });
    }

    const { trips, totalItems } = await tripModel.getPaginatedTrips(page, limit, filter);
    
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

export const getTripDetailsPage = async (req, res) => {
  const { tripId } = req.params;
  const trip = await tripModel.getTripById(tripId);
  res.render('trips/details', {
    title: 'Trip Details',
    details: trip
  });
};
