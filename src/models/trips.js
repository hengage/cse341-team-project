import Trip from './schemas/trips.js';

export const getAllTrips = async () => {
  return await Trip.find({});
};

export const getTripById = async (id) => {
  return await Trip.findOne({ id: id });
};
