import * as tripModel from '../models/trips.js';

export const getTripAdminPage = async (req, res) => {
  res.render('admin/trips', {
    title: 'Trip Admin'
  });
};

export const updateTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedTrip = await tripModel.updateTrip(id, req.body);
    if (!updatedTrip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    res.json(updatedTrip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTrip = async (req, res) => {
  try {
    const deletedTrip = await tripModel.deleteTrip(req.params.id);
    if (!deletedTrip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    res.json({ message: 'Trip deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
