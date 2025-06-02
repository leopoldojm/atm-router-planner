import axios from "axios";

// Ambil TOMTOM API Key dari environment variable
const TOMTOM_API_KEY = process.env.REACT_APP_TOMTOM_API_KEY;

// Jika API Key tidak ditemukan, tampilkan peringatan di console
if (!TOMTOM_API_KEY) {
  console.warn(
    "WARNING: REACT_APP_TOMTOM_API_KEY environment variable is not set! Please set it in your .env file."
  );
}

/**
 * Mendapatkan waktu tempuh (dalam detik) antara dua koordinat (start -> end)
 * Menggunakan endpoint Routing TomTom
 * @param {Array<number>} start [lng, lat] - Koordinat awal
 * @param {Array<number>} end [lng, lat] - Koordinat tujuan
 * @returns {Promise<number>} waktu tempuh dalam detik
 */
export const getTravelTimeInSeconds = async (start, end) => {
  if (!TOMTOM_API_KEY) throw new Error("TOMTOM_API_KEY is not defined");

  const [startLng, startLat] = start;
  const [endLng, endLat] = end;

  // Format URL dengan koordinat awal dan akhir
  const url = `https://api.tomtom.com/routing/1/calculateRoute/${startLat},${startLng}:${endLat},${endLng}/json?key=${TOMTOM_API_KEY}&travelMode=car&traffic=true`;

  try {
    const { data } = await axios.get(url);
    const route = data.routes?.[0];

    // Jika rute ditemukan, kembalikan waktu tempuh dalam detik
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
 * Mendapatkan data kondisi lalu lintas (traffic flow) pada titik tertentu
 * Menggunakan endpoint Traffic Flow TomTom
 * @param {number} lat - Latitude titik
 * @param {number} lon - Longitude titik
 * @returns {Promise<Object|null>} Objek data traffic atau null jika gagal
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
        point: `${lat},${lon}`, // Format koordinat
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
 * Mendapatkan matrix waktu tempuh antar beberapa titik
 * Setiap titik akan dihitung jarak ke titik lain
 * @param {Array<Array<number>>} locations - Array koordinat [lng, lat]
 * @returns {Promise<Array<Array<number>>|null>} Matriks waktu tempuh antar titik (dalam detik)
 */
export const getMatrixTravelTime = async (locations) => {
  if (!TOMTOM_API_KEY) throw new Error("TOMTOM_API_KEY is not defined");

  const url = `https://api.tomtom.com/routing/1/matrix/driving/json?key=${TOMTOM_API_KEY}`;

  // Format body permintaan dengan asal dan tujuan dari semua titik
  const body = {
    origins: locations.map(([lng, lat]) => ({ lat, lon: lng })),
    destinations: locations.map(([lng, lat]) => ({ lat, lon: lng })),
  };

  try {
    const { data } = await axios.post(url, body);

    // Tangani kemungkinan struktur respons berbeda
    return (
      data?.matrix?.[0]?.response?.matrix?.times || // format lama
      data?.data?.times || // format alternatif
      data.times // default
    );
  } catch (error) {
    console.error("Error fetching matrix travel times:", error);
    return null;
  }
};

/**
 * Mendapatkan rute lengkap dari beberapa titik (waypoint)
 * Digunakan untuk menggambar rute polyline di peta
 * @param {Array<Array<number>>} points - Array titik [lng, lat]
 * @returns {Promise<Array<[number, number]>>} Array polyline [lng, lat]
 */
export const getMultiWaypointRoute = async (points) => {
  if (!TOMTOM_API_KEY) throw new Error("TOMTOM_API_KEY is not defined");
  if (!points || points.length < 2)
    throw new Error("Minimal 2 titik diperlukan");

  // Format koordinat dalam string sesuai format TomTom
  const coordsStr = points.map(([lng, lat]) => `${lat},${lng}`).join(":");
  const url = `https://api.tomtom.com/routing/1/calculateRoute/${coordsStr}/json?key=${TOMTOM_API_KEY}&travelMode=car&traffic=false`;

  try {
    const { data } = await axios.get(url);
    const legs = data.routes?.[0]?.legs;

    if (!legs) throw new Error("No route found");

    // Ambil semua titik dari masing-masing leg dan bentuk polyline
    const polyline = legs.flatMap((leg) =>
      leg.points.map(({ longitude, latitude }) => [longitude, latitude])
    );

    return polyline;
  } catch (error) {
    console.error("Error getting multi waypoint route:", error);
    throw error;
  }
};
