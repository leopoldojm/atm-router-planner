import axios from "axios";

const TOMTOM_API_KEY = process.env.REACT_APP_TOMTOM_API_KEY;

export const getTrafficFlow = async (lat, lon) => {
  try {
    const response = await axios.get(
      `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json`,
      {
        params: {
          point: `${lat},${lon}`,
          key: TOMTOM_API_KEY,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching traffic flow data:", error);
    return null;
  }
};
export const getTravelTimeInSeconds = async (start, end) => {
  const key = process.env.REACT_APP_TOMTOM_API_KEY;

  // Tukar posisi koordinat dari [lng, lat] ke [lat, lng]
  const startLat = start[1];
  const startLng = start[0];
  const endLat = end[1];
  const endLng = end[0];

  const url = `https://api.tomtom.com/routing/1/calculateRoute/${startLat},${startLng}:${endLat},${endLng}/json?key=${key}&traffic=true`;

  try {
    const response = await axios.get(url);
    const data = response.data;

    if (data.routes && data.routes.length > 0) {
      return data.routes[0].summary.travelTimeInSeconds;
    } else {
      throw new Error("No route found");
    }
  } catch (err) {
    throw err;
  }
};
