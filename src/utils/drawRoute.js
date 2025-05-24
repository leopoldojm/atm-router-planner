import tt from "@tomtom-international/web-sdk-maps";

const routeCache = new Map();
let lastCoordStr = "";
let lastGeojsonStr = "";
let isDrawing = false;

// Fungsi utama untuk menggambar rute
export const drawRoute = async (map, userLocation, route) => {
  if (!map || !userLocation || !Array.isArray(route) || isDrawing) return;

  const apiKey = process.env.REACT_APP_TOMTOM_API_KEY;
  if (!apiKey) return console.error("API key TomTom belum di-set");

  const points = [userLocation, ...route.map((r) => r.coords)].slice(0, 50);
  const coordStr = points.map(([lat, lng]) => `${lng},${lat}`).join(":");

  if (coordStr === lastCoordStr) return;
  lastCoordStr = coordStr;
  isDrawing = true;

  const { key, url } = buildSingleRouteUrl(points, apiKey);
  const legs = await fetchSegment({ key, url });

  if (legs.length === 0) {
    console.warn("Tidak ada data rute yang valid.");
    isDrawing = false;
    return;
  }

  // ✅ Estimasi waktu tempuh
  const travelTime = getTotalTravelTime(legs);
  console.log("Estimasi waktu tempuh:", travelTime.formatted);

  renderRouteOnMap(map, legs);
  isDrawing = false;
};

// =======================
// 🔽 UTILITAS PENDUKUNG 🔽
// =======================

// Buat URL tunggal untuk seluruh titik
const buildSingleRouteUrl = (points, apiKey) => {
  const coordStr = points.map(([lat, lng]) => `${lng},${lat}`).join(":");
  return {
    key: coordStr,
    url: `https://api.tomtom.com/routing/1/calculateRoute/${coordStr}/json?key=${apiKey}&routeType=fastest&traffic=true`,
  };
};

// Coba fetch data route, retry sekali jika gagal
async function fetchSegment({ key, url }, retry = true) {
  if (routeCache.has(key)) return routeCache.get(key);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    const legs = data.routes?.[0]?.legs ?? [];
    routeCache.set(key, legs);
    return legs;
  } catch (err) {
    if (retry) {
      await delay(300);
      return fetchSegment({ key, url }, false);
    }
    console.error(`Gagal fetch rute segmen ${key}:`, err);
    return [];
  }
}

// Tampilkan rute di peta dengan geojson + gradient warna per segmen
function renderRouteOnMap(map, legs) {
  const features = legs.map((leg, i) => ({
    type: "Feature",
    properties: { color: generateColor(i, legs.length) },
    geometry: {
      type: "LineString",
      coordinates: leg.points.map((p) => [p.longitude, p.latitude]),
    },
  }));

  const geojson = { type: "FeatureCollection", features };
  const geojsonStr = JSON.stringify(geojson);

  if (geojsonStr === lastGeojsonStr) return;
  lastGeojsonStr = geojsonStr;

  if (map.getLayer("route")) map.removeLayer("route");
  if (map.getSource("route")) map.removeSource("route");

  map.addSource("route", { type: "geojson", data: geojson });
  map.addLayer({
    id: "route",
    type: "line",
    source: "route",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": ["get", "color"], "line-width": 5 },
  });

  // Fit map ke bounds rute
  const allCoords = legs.flatMap((leg) =>
    leg.points.map((p) => [p.longitude, p.latitude])
  );
  if (allCoords.length) {
    const bounds = new tt.LngLatBounds(allCoords[0], allCoords[0]);
    allCoords.forEach((c) => bounds.extend(c));
    map.fitBounds(bounds, { padding: 50 });
  }
}

// Hitung total estimasi waktu perjalanan (dalam detik dan menit)
function getTotalTravelTime(legs) {
  const totalSeconds = legs.reduce(
    (sum, leg) => sum + (leg.summary?.travelTimeInSeconds || 0),
    0
  );
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return {
    totalSeconds,
    minutes,
    hours,
    remainingMinutes,
    formatted:
      hours > 0 ? `${hours} jam ${remainingMinutes} menit` : `${minutes} menit`,
  };
}

// Fungsi warna gradasi HSL berdasarkan index
const generateColor = (index, total) =>
  `hsl(${Math.floor((360 / total) * index)}, 70%, 50%)`;

// Delay helper
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
