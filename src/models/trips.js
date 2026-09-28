import Trip from './schemas/trips.js';

export const getAllTrips = async () => {
  return await Trip.find({});
};

export const getTripById = async (id) => {
  return await Trip.findOne({ id: id });
};

export const updateTrip = async (id, tripData) => {
  return await Trip.findOneAndUpdate({ id: id }, tripData, { new: true });
};

export const deleteTrip = async (id) => {
  return await Trip.findOneAndDelete({ id: id });
};
