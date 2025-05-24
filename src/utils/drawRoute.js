import tt from "@tomtom-international/web-sdk-maps";

const routeCache = new Map(); // cache untuk legs tiap segmen
let lastCoordStr = "";
let isDrawing = false;
let lastGeojsonStr = "";

// Generate warna tiap segment
const generateColor = (index, total) =>
  `hsl(${Math.floor((360 / total) * index)}, 70%, 50%)`;

// Build URL tiap segment
const buildSegmentUrls = (points, apiKey) => {
  const urls = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    const pairStr = `${from[1]},${from[0]}:${to[1]},${to[0]}`;
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${pairStr}/json?key=${apiKey}&routeType=fastest&traffic=true`;
    urls.push({ key: pairStr, url });
  }
  return urls;
};

// Delay helper
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// Fetch dengan concurrency dan retry 1x
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
      // Retry sekali setelah delay
      await delay(300);
      return fetchSegment({ key, url }, false);
    }
    console.error(`Gagal fetch rute segmen ${key}:`, err);
    return [];
  }
}

// Batched fetch dengan concurrency limit 5
async function fetchAllSegments(urls, concurrency = 5) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < urls.length) {
      const i = index++;
      const legs = await fetchSegment(urls[i]);
      results.push(...legs);
    }
  }

  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  return results;
}

// Render geojson hanya jika data berbeda (compare JSON string)
function renderRouteOnMap(map, legs) {
  const totalLegs = legs.length;

  const features = legs.map((leg, index) => ({
    type: "Feature",
    properties: { color: generateColor(index, totalLegs) },
    geometry: {
      type: "LineString",
      coordinates: leg.points.map((p) => [p.longitude, p.latitude]),
    },
  }));

  const geojson = {
    type: "FeatureCollection",
    features,
  };

  const geojsonStr = JSON.stringify(geojson);
  if (geojsonStr === lastGeojsonStr) return; // skip render jika sama
  lastGeojsonStr = geojsonStr;

  // Hapus layer dan source jika ada
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

  // Fit bounds hanya 1x, tanpa debounce
  const allCoords = legs.flatMap((leg) =>
    leg.points.map((p) => [p.longitude, p.latitude])
  );
  if (allCoords.length > 0) {
    const bounds = new tt.LngLatBounds(allCoords[0], allCoords[0]);
    allCoords.forEach((c) => bounds.extend(c));
    map.fitBounds(bounds, { padding: 50 });
  }
}

// Fungsi utama drawRoute yang sangat optimal
export const drawRoute = async (map, userLocation, route) => {
  if (!map || !userLocation || !Array.isArray(route) || isDrawing) return;

  const apiKey = process.env.REACT_APP_TOMTOM_API_KEY;
  if (!apiKey) {
    console.error("API key TomTom belum di-set");
    return;
  }

  isDrawing = true;

  const points = [userLocation, ...route.map((atm) => atm.coords)];
  const MAX_POINTS = 20;
  const trimmedPoints = points.slice(0, MAX_POINTS);
  const coordStr = trimmedPoints.map((pt) => `${pt[1]},${pt[0]}`).join(":");

  if (coordStr === lastCoordStr) {
    // Kalau rute sama, skip fetch dan render
    isDrawing = false;
    return;
  }

  lastCoordStr = coordStr;

  const urls = buildSegmentUrls(trimmedPoints, apiKey);
  const allLegs = await fetchAllSegments(urls, 5);

  if (allLegs.length === 0) {
    console.warn("Tidak ada data rute yang valid.");
    isDrawing = false;
    return;
  }

  renderRouteOnMap(map, allLegs);
  isDrawing = false;
};
