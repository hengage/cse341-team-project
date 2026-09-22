import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  region: { type: String, required: true },
  startStation: { type: String, required: true },
  endStation: { type: String, required: true },
  duration: { type: String, required: true },
  distance: { type: Number, required: true },
  highlights: [String],
  bestSeason: String,
  operatingMonths: [Number],
  imageUrl: String
});

export default mongoose.model('Trip', tripSchema);
