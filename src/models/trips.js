import Trip from './schemas/trips.js';

export const getPaginatedTrips = async (page, limit) => {
  const skip = (page - 1) * limit;
  const [trips, totalItems] = await Promise.all([
    Trip.find({}).skip(skip).limit(limit),
    Trip.countDocuments({})
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
