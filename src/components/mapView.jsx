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
  const [map, setMap] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [timeMatrix, setTimeMatrix] = useState(null);
  const [userToATMTime, setUserToATMTime] = useState(null);
  const [routeOrder, setRouteOrder] = useState([]);
  const [atmListState, setAtmListState] = useState([]);

  // ** Pisahkan marker user dan marker ATM **
  const userMarkerRef = useRef(null);
  const atmMarkersRef = useRef([]);

  const isFetchingRouteRef = useRef(false);

  // Ambil lokasi user sekali saat komponen mount
  useEffect(() => {
    if (!navigator.geolocation) {
      console.error("Browser tidak support geolocation");
      setUserLocation(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.longitude, pos.coords.latitude]),
      (err) => {
        console.error("Gagal dapat posisi user:", err);
        setUserLocation(null);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  // Inisialisasi peta dan tambahkan marker (user + ATM)
  useEffect(() => {
    if (!userLocation || atmListState.length === 0) return;

    const mapInstance = initializeMap(mapRef.current, userLocation);

    // Gunakan versi addMarkersToMap yang return { userMarker, atmMarkers }
    const { userMarker, atmMarkers } = addMarkersToMap(
      mapInstance,
      userLocation,
      atmListState,
      userMarkerRef.current,
      atmMarkersRef.current
    );

    userMarkerRef.current = userMarker;
    atmMarkersRef.current = atmMarkers;

    setMap(mapInstance);

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
      userMarkerRef.current = null;
      atmMarkersRef.current = [];
    };
  }, [userLocation, atmListState]);

  // Build matrix waktu travel async
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

  // Gambar rute ketika data siap
  useEffect(() => {
    if (
      !map ||
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
          await drawRoute(map, userLocation, route);
        }
      } catch (err) {
        console.error("Gagal menggambar rute:", err);
      } finally {
        isFetchingRouteRef.current = false;
        setLoadingRoute(false);
      }
    };

    draw();
  }, [map, userLocation, timeMatrix, userToATMTime, atmListState]);

  const handleAtmClick = (routeIndex) => {
    if (!map) return;

    // ATM yang dipilih berdasarkan urutan routeOrder
    const atmSelected = routeOrder[routeIndex];
    if (!atmSelected) return;

    // Cari index asli dari ATM tersebut di atmListState
    const originalIndex = atmListState.findIndex(
      (atm) => atm.id === atmSelected.id // pastikan id unik
    );

    if (originalIndex === -1) return;

    const marker = atmMarkersRef.current[originalIndex];
    if (!marker) return;

    const lngLat = marker.getLngLat();

    map.flyTo({
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
                borderTop: "6px solid #3498db",
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
            setRouteOrder([]); // reset rute tiap upload baru
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
            {routeOrder.map((atm, routeIndex) => (
              <li
                key={routeIndex}
                style={{ cursor: "pointer" }}
                onClick={() => handleAtmClick(routeIndex)}
              >
                <strong>{atm.name}</strong> — Sisa uang: Rp
                {(atm.remainingMoney || 0).toLocaleString()}
              </li>
            ))}
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
