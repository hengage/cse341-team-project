import { getSchedulesByTripId } from "../models/schedules.js";

const isValidMonth = (month) => Number.isInteger(month) && month >= 1 && month <= 12;

export async function getSchedulesForTrip(req, res) {
  try {
    const { id } = req.params;

    const schedules = await getSchedulesByTripId(id);

    return res.status(200).json(schedules);
  } catch (error) {
    console.error("Error fetching schedules:", error);

    return res.status(500).json({
      error: "Failed to fetch schedules",
    });
  }
}

export async function getSchedulesForTripAndMonth(req, res) {
  try {
    const { id } = req.params;
    const month = Number(req.query.month);

    if (!isValidMonth(month)) {
      return res.status(400).json({
        error: "Month must be an integer from 1 to 12",
      });
    }

    const schedules = await getSchedulesByTripId(id, month);

    return res.status(200).json(schedules);
  } catch (error) {
    console.error("Error fetching schedules:", error);

    return res.status(500).json({
      error: "Failed to fetch schedules",
    });
  }
}
