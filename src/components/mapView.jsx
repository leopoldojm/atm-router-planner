import React, { useEffect, useRef, useState } from "react";
import "@tomtom-international/web-sdk-maps/dist/maps.css";

// Komponen uploader untuk mengunggah data ATM
import AtmUploader from "../components/AtmUploader";

// Service untuk mendapatkan waktu perjalanan dari API TomTom
import { getTravelTimeInSeconds } from "../services/tomtomApi";

// Utilitas pemetaan: inisialisasi peta dan penambahan marker
import { initializeMap, addMarkersToMap } from "../utils/mapUtils";

// Utilitas untuk membangun matriks waktu tempuh
import { buildTimeMatrixAsync } from "../utils/timeMatrixUtils";

// Algoritma A* untuk menentukan urutan kunjungan ATM
import { aStarRoute } from "../utils/aStarRoute";

// Menggambar rute di peta
import { drawRoute } from "../utils/drawRoute";

const MapView = () => {
  const mapRef = useRef(null); // DOM element container untuk peta
  const mapInstanceRef = useRef(null); // Instance TomTom map
  const [userLocation, setUserLocation] = useState(null); // Lokasi pengguna
  const [loadingRoute, setLoadingRoute] = useState(false); // Status loading rute
  const [timeMatrix, setTimeMatrix] = useState(null); // Matriks waktu antar ATM
  const [userToATMTime, setUserToATMTime] = useState(null); // Waktu dari user ke masing-masing ATM
  const [routeOrder, setRouteOrder] = useState([]); // Urutan kunjungan ATM
  const [atmListState, setAtmListState] = useState([]); // Daftar ATM yang diunggah
  const [alpha, setAlpha] = useState(0.7); // Bobot waktu
  const [beta, setBeta] = useState(0.3); // Bobot uang

  const userMarkerRef = useRef(null); // Marker untuk user
  const atmMarkersRef = useRef([]); // Marker untuk ATM
  const isFetchingRouteRef = useRef(false); // Flag agar tidak menggambar ulang saat sedang proses

  // Set lokasi default user ketika component pertama kali dimuat
  useEffect(() => {
    setUserLocation([106.966592, -6.257289]); // Lokasi dummy
  }, []);

  // Inisialisasi peta setelah userLocation tersedia
  useEffect(() => {
    if (!userLocation || mapInstanceRef.current) return;

    const mapInstance = initializeMap(mapRef.current, userLocation);

    const { userMarker, atmMarkers } = addMarkersToMap(
      mapInstance,
      userLocation,
      atmListState,
      userMarkerRef.current,
      atmMarkersRef.current
    );

    userMarkerRef.current = userMarker;
    atmMarkersRef.current = atmMarkers;
    mapInstanceRef.current = mapInstance;

    return () => {
      // Cleanup peta saat unmount atau lokasi berubah
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
      userMarkerRef.current = null;
      atmMarkersRef.current = [];
    };
  }, [userLocation, atmListState]);

  // Bangun matriks waktu setelah userLocation dan daftar ATM tersedia
  useEffect(() => {
    if (!userLocation || atmListState.length === 0) return;

    const buildMatrix = async () => {
      setLoadingRoute(true);
      try {
        const { userTimes, matrix } = await buildTimeMatrixAsync(
          userLocation,
          atmListState,
          getTravelTimeInSeconds
        );
        setUserToATMTime(userTimes);
        setTimeMatrix(matrix);
      } catch (error) {
        console.error("Error build time matrix:", error);
        setUserToATMTime(null);
        setTimeMatrix(null);
      } finally {
        setLoadingRoute(false);
      }
    };

    buildMatrix();
  }, [userLocation, atmListState]);

  // Gambar rute setelah matriks tersedia
  useEffect(() => {
    if (
      !mapInstanceRef.current ||
      !userLocation ||
      !timeMatrix ||
      !userToATMTime ||
      atmListState.length === 0 ||
      isFetchingRouteRef.current
    )
      return;

    const draw = async () => {
      isFetchingRouteRef.current = true;
      setLoadingRoute(true);

      try {
        const route = aStarRoute(
          atmListState,
          timeMatrix,
          userToATMTime,
          alpha,
          beta
        );

        setRouteOrder(route);

        if (route.length > 0) {
          await drawRoute(mapInstanceRef.current, userLocation, route);
        }
      } catch (err) {
        console.error("Gagal menggambar rute:", err);
      } finally {
        isFetchingRouteRef.current = false;
        setLoadingRoute(false);
      }
    };

    draw();
  }, [userLocation, timeMatrix, userToATMTime, atmListState, alpha, beta]);

  // Handler saat salah satu ATM diklik dari list rute
  const handleAtmClick = (routeIndex) => {
    if (!mapInstanceRef.current) return;

    const atmSelected = routeOrder[routeIndex];
    if (!atmSelected) return;

    const originalIndex = atmListState.findIndex(
      (atm) => atm.id === atmSelected.id
    );
    if (originalIndex === -1) return;

    const marker = atmMarkersRef.current[originalIndex];
    if (!marker) return;

    const lngLat = marker.getLngLat();

    mapInstanceRef.current.flyTo({
      center: lngLat,
      zoom: 15,
      essential: true,
    });

    marker.togglePopup();
  };

  // Reset peta dan semua state terkait
  const handleReset = () => {
    setAtmListState([]);
    setRouteOrder([]);
    setTimeMatrix(null);
    setUserToATMTime(null);

    if (atmMarkersRef.current.length > 0) {
      atmMarkersRef.current.forEach((marker) => marker.remove());
    }

    atmMarkersRef.current = [];
    setLoadingRoute(false);
  };

  return (
    <div
      className="mapview-container"
      style={{ display: "flex", height: "80vh" }}
    >
      {/* Container Peta */}
      <div
        ref={mapRef}
        className="map-container"
        style={{ width: "70%", height: "100%", position: "relative" }}
      >
        {loadingRoute && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(255,255,255,0.7)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 10,
            }}
          >
            <div
              style={{
                border: "6px solid #f3f3f3",
                borderTop: "6px solid #003d79",
                borderRadius: "50%",
                width: "50px",
                height: "50px",
                animation: "spin 1s linear infinite",
              }}
            />
          </div>
        )}
      </div>

      {/* Panel Kanan: List Rute dan Kontrol */}
      <div
        className="route-list-container"
        style={{
          width: "30%",
          padding: "1rem",
          backgroundColor: "#f8f8f8",
          overflowY: "auto",
        }}
      >
        <div style={{ marginBottom: "1rem" }}>
          <button
            style={{
              backgroundColor: "#d9534f",
              color: "white",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "4px",
              cursor: "pointer",
              marginBottom: "4px",
            }}
            onClick={handleReset}
          >
            Reset
          </button>

          {/* Slider Alpha */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block" }}>
              Bobot Waktu (α): <strong>{alpha}</strong>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={alpha}
              onChange={(e) => setAlpha(parseFloat(e.target.value))}
              style={{
                width: "100%",
                accentColor: "#0070ba",
              }}
            />
          </div>

          {/* Slider Beta */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block" }}>
              Bobot Uang (β): <strong>{beta}</strong>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={beta}
              onChange={(e) => setBeta(parseFloat(e.target.value))}
              style={{
                width: "100%",
                accentColor: "#0070ba",
              }}
            />
          </div>
        </div>

        {/* Daftar Rute atau Upload ATM */}
        <h3>List Kunjungan ATM</h3>
        {loadingRoute ? (
          <p>Loading rute...</p>
        ) : routeOrder.length === 0 ? (
          <AtmUploader
            onDataUpload={(data) => {
              setAtmListState(data);
              setRouteOrder([]);
              setTimeMatrix(null);
              setUserToATMTime(null);
            }}
          />
        ) : (
          <ol>
            {routeOrder.map((atm, routeIndex) => (
              <li
                key={routeIndex}
                style={{ cursor: "pointer", marginBottom: "0.5rem" }}
                onClick={() => handleAtmClick(routeIndex)}
              >
                <div>
                  <strong>{atm.name}</strong>
                </div>
                <div>
                  Remaining:{" "}
                  {atm.remaining != null
                    ? atm.remaining.toLocaleString() + "%"
                    : "0%"}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Animasi spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg);}
          100% { transform: rotate(360deg);}
        }
      `}</style>
    </div>
  );
};

export default MapView;
