import Schedule from "./schemas/schedules.js";
import { getDb } from "../db/connect.js";

const isValidMonth = (month) => Number.isInteger(month) && month >= 1 && month <= 12;

export async function getSchedulesByTripId(tripId, month) {
  if (month === undefined || month === null) {
    return Schedule.find({ tripId }).lean();
  }

  if (!isValidMonth(month)) {
    return [];
  }

  const trip = await getDb().collection("trips").findOne({ id: tripId });

  if (!trip || !Array.isArray(trip.operatingMonths) || !trip.operatingMonths.includes(month)) {
    return [];
  }

  return Schedule.find({ tripId }).lean();
}
