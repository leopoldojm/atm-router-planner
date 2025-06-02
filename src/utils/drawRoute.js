import tt from "@tomtom-international/web-sdk-maps";

// Cache untuk menyimpan rute yang sudah diambil
const routeCache = new Map();

// String unik terakhir untuk membandingkan apakah koordinat berubah
let lastCoordStr = "";

// Simpan GeoJSON terakhir yang digambar di peta
let lastGeojsonStr = "";

// Status untuk mencegah menggambar ulang saat proses sedang berjalan
let isDrawing = false;

// Hitung jumlah request ke API TomTom
let apiRequestCount = 0;

/**
 * Fungsi utama untuk menggambar rute di peta
 * @param {*} map - objek peta TomTom
 * @param {*} userLocation - koordinat pengguna [lat, lng]
 * @param {*} route - array objek ATM yang berisi properti coords: [lat, lng]
 * @param {*} onRouteDrawn - callback saat rute sudah tergambar
 */
export const drawRoute = async (map, userLocation, route, onRouteDrawn) => {
  if (!map || !userLocation || !Array.isArray(route) || isDrawing) return;

  const apiKey = process.env.REACT_APP_TOMTOM_API_KEY;
  if (!apiKey) {
    console.error("API key TomTom belum di-set");
    return;
  }

  // Gabungkan userLocation dengan titik-titik rute (maksimum 50 titik)
  const points = [userLocation, ...route.map((r) => r.coords)].slice(0, 50);

  // Validasi semua koordinat
  if (!points.every(isValidCoords)) {
    console.warn("Terdapat koordinat tidak valid.");
    return;
  }

  // Buat string koordinat untuk pengecekan cache
  const coordStr = points.map(([lat, lng]) => `${lng},${lat}`).join(":");
  if (coordStr === lastCoordStr) return; // Jika sudah digambar, skip
  lastCoordStr = coordStr;

  isDrawing = true;

  try {
    // Bangun URL dan key untuk request
    const { key, url } = buildSingleRouteUrl(points, apiKey);

    // Ambil data rute dari API atau cache
    const legs = await fetchSegment({ key, url });

    if (legs.length === 0) {
      console.warn("Tidak ada data rute yang valid.");
      isDrawing = false;
      return;
    }

    // Hitung waktu tempuh dan tampilkan
    const travelTime = getTotalTravelTime(legs);
    console.log("Estimasi waktu tempuh:", travelTime.formatted);

    // Gambar rute di peta
    renderRouteOnMap(map, legs);

    // Panggil callback jika tersedia
    if (onRouteDrawn) onRouteDrawn({ travelTime, legs });
  } catch (error) {
    console.error("Error saat menggambar rute:", error);
  } finally {
    isDrawing = false;
  }
};

// Validasi format koordinat [lat, lng]
const isValidCoords = ([lat, lng]) =>
  typeof lat === "number" && typeof lng === "number";

/**
 * Bangun URL API untuk request rute dari TomTom
 * @param {*} points - array koordinat [lat, lng]
 * @param {*} apiKey - API key dari TomTom
 * @returns key unik dan url API
 */
const buildSingleRouteUrl = (points, apiKey) => {
  const coordStr = points.map(([lat, lng]) => `${lng},${lat}`).join(":");
  return {
    key: coordStr,
    url: `https://api.tomtom.com/routing/1/calculateRoute/${coordStr}/json?key=${apiKey}&routeType=fastest&traffic=true`,
  };
};

/**
 * Ambil data rute dari API TomTom, gunakan cache jika tersedia
 * @param {*} key - key unik untuk cache
 * @param {*} url - url request API
 * @returns array legs rute
 */
async function fetchSegment({ key, url }) {
  if (routeCache.has(key)) return routeCache.get(key);

  apiRequestCount++;
  console.log(`Request API ke-${apiRequestCount}: ${url}`);

  try {
    const res = await fetch(url);
    const data = await res.json();

    // Validasi respons API
    if (!res.ok || !data.routes?.length) {
      throw new Error(data.error?.message || `Status ${res.status}`);
    }

    const legs = data.routes[0].legs ?? [];
    routeCache.set(key, legs); // Simpan ke cache
    return legs;
  } catch (err) {
    console.error(`Gagal fetch rute segmen ${key}:`, err.message);
    return [];
  }
}

/**
 * Gambar rute di peta dalam format GeoJSON
 * @param {*} map - objek peta
 * @param {*} legs - array legs dari rute
 */
function renderRouteOnMap(map, legs) {
  // Ubah semua legs menjadi fitur GeoJSON
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

  // Skip jika GeoJSON sama seperti sebelumnya
  if (geojsonStr === lastGeojsonStr) return;
  lastGeojsonStr = geojsonStr;

  // Hapus layer dan source lama jika ada
  if (map.getLayer("route")) map.removeLayer("route");
  if (map.getSource("route")) map.removeSource("route");

  // Tambahkan source dan layer baru
  map.addSource("route", { type: "geojson", data: geojson });
  map.addLayer({
    id: "route",
    type: "line",
    source: "route",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": ["get", "color"], "line-width": 5 },
  });

  // Sesuaikan tampilan peta agar mengikuti rute
  const allCoords = legs.flatMap((leg) =>
    leg.points.map((p) => [p.longitude, p.latitude])
  );
  if (allCoords.length) {
    const bounds = new tt.LngLatBounds(allCoords[0], allCoords[0]);
    allCoords.forEach((c) => bounds.extend(c));
    map.fitBounds(bounds, { padding: 50 });
  }
}

/**
 * Hitung total waktu tempuh dari semua legs dalam detik dan format readable
 * @param {*} legs - array legs dari rute
 * @returns total waktu dalam format detik, menit, jam, dan string formatted
 */
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

/**
 * Buat warna HSL unik untuk tiap segmen rute
 * @param {*} index - urutan segmen
 * @param {*} total - total segmen
 * @returns warna HSL string
 */
const generateColor = (index, total) =>
  `hsl(${Math.floor((360 / total) * index)}, 70%, 50%)`;
