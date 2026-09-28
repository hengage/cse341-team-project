import * as tripModel from '../models/trips.js';

export const getTripAdminPage = async (req, res) => {
  res.render('admin/trips', {
    title: 'Trip Admin'
  });
};

export const updateTrip = async (req, res) => {
  try {
    // Logic to update trip
    res.json({ message: 'Trip updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTrip = async (req, res) => {
  try {
    // Logic to delete trip
    res.json({ message: 'Trip deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
