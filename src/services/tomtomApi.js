import axios from "axios";

const TOMTOM_API_KEY = process.env.REACT_APP_TOMTOM_API_KEY;

if (!TOMTOM_API_KEY) {
  console.warn(
    "WARNING: TOMTOM_API_KEY environment variable is not set! Please set REACT_APP_TOMTOM_API_KEY in your .env file."
  );
}

/**
 * Mendapatkan waktu tempuh (detik) antara dua koordinat dengan info traffic
 * @param {Array<number>} start [lng, lat]
 * @param {Array<number>} end [lng, lat]
 * @returns {Promise<number>} waktu tempuh dalam detik
 */
export const getTravelTimeInSeconds = async (start, end) => {
  if (!TOMTOM_API_KEY) throw new Error("TOMTOM_API_KEY is not defined");

  const [startLng, startLat] = start;
  const [endLng, endLat] = end;

  const url = `https://api.tomtom.com/routing/1/calculateRoute/${startLat},${startLng}:${endLat},${endLng}/json?key=${TOMTOM_API_KEY}&travelMode=car&traffic=true`;
  console.log(url);

  try {
    const response = await axios.get(url);

    const data = response.data;
    if (data.routes && data.routes.length > 0) {
      return data.routes[0].summary.travelTimeInSeconds;
    } else {
      throw new Error("No route found");
    }
  } catch (error) {
    console.error("Error getting travel time:", error);
    throw error;
  }
};

/**
 * Mendapatkan data traffic flow di titik tertentu (lat, lon)
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<Object|null>} data traffic flow atau null jika gagal
 */
export const getTrafficFlow = async (lat, lon) => {
  if (!TOMTOM_API_KEY) {
    console.warn("TOMTOM_API_KEY not set, cannot fetch traffic flow data");
    return null;
  }

  try {
    const response = await axios.get(
      "https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json",
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
