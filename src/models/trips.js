import Trip from './schemas/trips.js';

export const getPaginatedTrips = async (page, limit, filter = {}) => {
  const skip = (page - 1) * limit;
  const [trips, totalItems] = await Promise.all([
    Trip.find(filter).skip(skip).limit(limit),
    Trip.countDocuments(filter)
  ]);
  return { trips, totalItems };
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
