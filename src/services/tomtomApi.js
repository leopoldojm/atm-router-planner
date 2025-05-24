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
export const getTravelTimeInSeconds = async (origin, destination) => {
  const key = process.env.REACT_APP_TOMTOM_API_KEY;
  const url = `https://api.tomtom.com/routing/1/calculateRoute/${origin[0]},${origin[1]}:${destination[0]},${destination[1]}/json?key=${key}&traffic=true`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.routes || !data.routes.length) throw new Error("No route found");

  return data.routes[0].summary.travelTimeInSeconds;
};
