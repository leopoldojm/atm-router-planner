import axios from "axios";

const TOMTOM_API_KEY = process.env.REACT_APP_TOMTOM_API_KEY;

if (!TOMTOM_API_KEY) {
  console.warn(
    "WARNING: REACT_APP_TOMTOM_API_KEY environment variable is not set! Please set it in your .env file."
  );
}

/**
 * Mendapatkan waktu tempuh (dalam detik) antara dua koordinat (start -> end)
 * @param {Array<number>} start [lng, lat]
 * @param {Array<number>} end [lng, lat]
 * @returns {Promise<number>} waktu tempuh dalam detik
 */
export const getTravelTimeInSeconds = async (start, end) => {
  if (!TOMTOM_API_KEY) throw new Error("TOMTOM_API_KEY is not defined");

  const [startLng, startLat] = start;
  const [endLng, endLat] = end;

  const url = `https://api.tomtom.com/routing/1/calculateRoute/${startLat},${startLng}:${endLat},${endLng}/json?key=${TOMTOM_API_KEY}&travelMode=car&traffic=true`;

  try {
    const { data } = await axios.get(url);
    const route = data.routes?.[0];

    if (route) {
      return route.summary.travelTimeInSeconds;
    }

    throw new Error("No route found");
  } catch (error) {
    console.error("Error getting travel time:", error);
    throw error;
  }
};

/**
 * Mendapatkan data traffic flow pada titik tertentu
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<Object|null>}
 */
export const getTrafficFlow = async (lat, lon) => {
  if (!TOMTOM_API_KEY) {
    console.warn("TOMTOM_API_KEY is not set, cannot fetch traffic flow");
    return null;
  }

  const url =
    "https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json";

  try {
    const { data } = await axios.get(url, {
      params: {
        point: `${lat},${lon}`,
        key: TOMTOM_API_KEY,
      },
    });
    return data;
  } catch (error) {
    console.error("Error fetching traffic flow:", error);
    return null;
  }
};

/**
 * Mendapatkan matrix waktu tempuh antar lokasi
 * @param {Array<Array<number>>} locations array koordinat [lng, lat]
 * @returns {Promise<Array<Array<number>>|null>} matrix waktu (detik), [origin][destination]
 */
export const getMatrixTravelTime = async (locations) => {
  if (!TOMTOM_API_KEY) throw new Error("TOMTOM_API_KEY is not defined");

  const url = `https://api.tomtom.com/routing/1/matrix/driving/json?key=${TOMTOM_API_KEY}`;
  const body = {
    origins: locations.map(([lng, lat]) => ({ lat, lon: lng })),
    destinations: locations.map(([lng, lat]) => ({ lat, lon: lng })),
  };

  try {
    const { data } = await axios.post(url, body);
    return (
      data?.matrix?.[0]?.response?.matrix?.times ||
      data?.data?.times ||
      data.times
    );
  } catch (error) {
    console.error("Error fetching matrix travel times:", error);
    return null;
  }
};

/**
 * Mendapatkan rute lengkap (polyline) dari banyak titik (multi waypoint)
 * @param {Array<Array<number>>} points array koordinat [lng, lat]
 * @returns {Promise<Array<[number, number]>>} array polyline [lng, lat]
 */
export const getMultiWaypointRoute = async (points) => {
  if (!TOMTOM_API_KEY) throw new Error("TOMTOM_API_KEY is not defined");
  if (!points || points.length < 2)
    throw new Error("Minimal 2 titik diperlukan");

  const coordsStr = points.map(([lng, lat]) => `${lat},${lng}`).join(":");
  const url = `https://api.tomtom.com/routing/1/calculateRoute/${coordsStr}/json?key=${TOMTOM_API_KEY}&travelMode=car&traffic=false`;

  try {
    const { data } = await axios.get(url);
    const legs = data.routes?.[0]?.legs;

    if (!legs) throw new Error("No route found");

    const polyline = legs.flatMap((leg) =>
      leg.points.map(({ longitude, latitude }) => [longitude, latitude])
    );

    return polyline;
  } catch (error) {
    console.error("Error getting multi waypoint route:", error);
    throw error;
  }
};
