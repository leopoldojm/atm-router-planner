import tt from "@tomtom-international/web-sdk-maps";
import _ from "lodash";

const routeCache = {};

// Fungsi untuk generate warna garis berdasarkan index dan total
const generateColor = (index, total) => {
  const hue = Math.floor((360 / total) * index);
  return `hsl(${hue}, 70%, 50%)`;
};

// Fungsi utama untuk gambar route, dengan debounce 1 detik
export const drawRoute = _.debounce(async (map, userLocation, route) => {
  if (!map || !userLocation || !Array.isArray(route)) return;

  const apiKey = process.env.REACT_APP_TOMTOM_API_KEY;
  if (!apiKey) {
    console.error("API key TomTom belum di-set");
    return;
  }

  const points = [userLocation, ...route.map((atm) => atm.coords)];

  if (points.length < 2) {
    console.warn("Minimal 2 titik diperlukan untuk menggambar route");
    return;
  }

  const coordStr = points
    .map((pt) => `${pt[1]},${pt[0]}`) // Format lat,lon sesuai TomTom
    .join(":");

  if (routeCache[coordStr]) {
    // Gunakan cache jika ada
    renderRouteOnMap(map, routeCache[coordStr]);
    return;
  }

  const url = `https://api.tomtom.com/routing/1/calculateRoute/${coordStr}/json?key=${apiKey}&routeType=fastest&traffic=true`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch route, status ${res.status}`);

    const data = await res.json();

    // Validasi response TomTom
    if (!data.routes || data.routes.length === 0) {
      throw new Error("Response TomTom routing kosong");
    }

    routeCache[coordStr] = data;

    renderRouteOnMap(map, data);
  } catch (error) {
    console.error("Gagal gambar rute:", error);
  }
}, 1000);

// Fungsi untuk render route ke peta
function renderRouteOnMap(map, data) {
  const legs = data.routes[0].legs || [];
  const totalLegs = legs.length;

  if (totalLegs === 0) {
    console.warn("Tidak ada legs pada data route");
    return;
  }

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

  if (map.getSource("route")) {
    map.getSource("route").setData(geojson);
  } else {
    map.addSource("route", { type: "geojson", data: geojson });
    map.addLayer({
      id: "route",
      type: "line",
      source: "route",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": ["get", "color"], "line-width": 5 },
    });
  }

  const fullRouteCoords = legs.flatMap((leg) =>
    leg.points.map((p) => [p.longitude, p.latitude])
  );

  if (fullRouteCoords.length === 0) return;

  // Pastikan bounds valid, ambil titik pertama sebagai titik awal bounds
  let bounds = new tt.LngLatBounds(
    [fullRouteCoords[0][0], fullRouteCoords[0][1]],
    [fullRouteCoords[0][0], fullRouteCoords[0][1]]
  );

  fullRouteCoords.forEach((coord) => bounds.extend(coord));

  map.fitBounds(bounds, { padding: 50 });
}
