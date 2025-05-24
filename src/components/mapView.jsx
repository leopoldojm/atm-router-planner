import React, { useEffect, useRef, useState } from "react";
import "@tomtom-international/web-sdk-maps/dist/maps.css";

import AtmUploader from "../components/AtmUploader";
import { getTravelTimeInSeconds } from "../services/tomtomApi";
import { initializeMap, addMarkersToMap } from "../utils/mapUtils";
import { buildTimeMatrixAsync } from "../utils/timeMatrixUtils";
import { aStarRoute } from "../utils/aStarRoute";
import { drawRoute } from "../utils/drawRoute";

const alpha = 0.7; // bobot waktu tempuh
const beta = 0.3; // bobot sisa uang ATM

const MapView = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null); // ref untuk menyimpan map instance
  const [userLocation, setUserLocation] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [timeMatrix, setTimeMatrix] = useState(null);
  const [userToATMTime, setUserToATMTime] = useState(null);
  const [routeOrder, setRouteOrder] = useState([]);
  const [atmListState, setAtmListState] = useState([]);

  // Marker refs untuk user dan ATM agar bisa update tanpa rerender
  const userMarkerRef = useRef(null);
  const atmMarkersRef = useRef([]);

  // Ref flag untuk mencegah multiple route drawing bersamaan
  const isFetchingRouteRef = useRef(false);

  // Set lokasi user sekali saat komponen mount (hardcoded)
  useEffect(() => {
    setUserLocation([106.966592, -6.257289]);
  }, []);

  // Inisialisasi peta dan marker user + ATM
  useEffect(() => {
    if (!userLocation || mapInstanceRef.current) return;

    // Jika map sudah ada, hapus dulu
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch {
        // ignore error jika sudah di-remove
      }
      mapInstanceRef.current = null;
    }

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
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // ignore jika sudah di-remove
        }
        mapInstanceRef.current = null;
      }
      userMarkerRef.current = null;
      atmMarkersRef.current = [];
    };
  }, [userLocation, atmListState]);

  // Bangun matriks waktu perjalanan secara async
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

  // Gambar rute setelah data siap
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
  }, [userLocation, timeMatrix, userToATMTime, atmListState]);

  // Fungsi zoom ke marker ATM saat list diklik
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

  return (
    <div
      className="mapview-container"
      style={{ display: "flex", height: "80vh" }}
    >
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

      <div
        className="route-list-container"
        style={{
          width: "30%",
          padding: "1rem",
          backgroundColor: "#f8f8f8",
          overflowY: "auto",
        }}
      >
        <AtmUploader
          onDataUpload={(data) => {
            setAtmListState(data);
            setRouteOrder([]);
            setTimeMatrix(null);
            setUserToATMTime(null);
          }}
        />
        <h3>Urutan Kunjungan ATM</h3>
        {loadingRoute ? (
          <p>Loading rute...</p>
        ) : routeOrder.length === 0 ? (
          <p>Tidak ada rute ditemukan.</p>
        ) : (
          <ol>
            {routeOrder.map((atm, routeIndex) => {
              let travelTimeSec = 0;

              if (routeIndex === 0) {
                const originalIndex = atmListState.findIndex(
                  (a) => a.id === atm.id
                );
                if (originalIndex !== -1 && userToATMTime) {
                  travelTimeSec = userToATMTime[originalIndex] || 0;
                }
              } else {
                const prevATM = routeOrder[routeIndex - 1];
                const fromIndex = atmListState.findIndex(
                  (a) => a.id === prevATM.id
                );
                const toIndex = atmListState.findIndex((a) => a.id === atm.id);
                if (
                  fromIndex !== -1 &&
                  toIndex !== -1 &&
                  timeMatrix &&
                  timeMatrix[fromIndex]
                ) {
                  travelTimeSec = timeMatrix[fromIndex][toIndex] || 0;
                }
              }

              const travelTimeMin = Math.round(travelTimeSec / 60);

              return (
                <li
                  key={routeIndex}
                  style={{ cursor: "pointer", marginBottom: "0.5rem" }}
                  onClick={() => handleAtmClick(routeIndex)}
                >
                  <strong>{atm.name}</strong> — Sisa uang: Rp{" "}
                  {(atm.remainingMoney || 0).toLocaleString()}
                  <br />
                  <span style={{ fontSize: "0.9rem", color: "#555" }}>
                    Estimasi waktu: {travelTimeMin} menit
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

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
