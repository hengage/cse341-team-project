import Trip from './schemas/trips.js';

export const getPaginatedTrips = async (page, limit, filter = {}) => {
  const skip = (page - 1) * limit;
  const [trips, totalItems] = await Promise.all([
    Trip.find(filter).sort({ id: 1 }).skip(skip).limit(limit),
    Trip.countDocuments(filter)
  ]);
  return { trips, totalItems };
};

export const getTripById = async (id) => {
  return await Trip.findOne({ id: id });
};

export const createTrip = async (tripData) => {
  return await Trip.create(tripData);
};

export const updateTrip = async (id, tripData) => {
  return await Trip.findOneAndUpdate({ id: id }, tripData, { returnDocument: 'after' });
};

export const deleteTrip = async (id) => {
  return await Trip.findOneAndDelete({ id: id });
};
