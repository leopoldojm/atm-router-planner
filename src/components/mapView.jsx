import React, { useEffect, useRef, useState } from "react";
import "@tomtom-international/web-sdk-maps/dist/maps.css";

import AtmUploader from "../components/AtmUploader"; // pastikan path-nya sesuai
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

  // Ambil lokasi user
  useEffect(() => {
    if (!navigator.geolocation) {
      console.error("Browser tidak support geolocation");
      return setUserLocation(null);
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

  // Inisialisasi peta dan marker user + ATM
  useEffect(() => {
    if (!userLocation || atmListState.length === 0) return;

    const mapInstance = initializeMap(mapRef.current, userLocation);
    addMarkersToMap(mapInstance, userLocation, atmListState);
    setMap(mapInstance);

    return () => {
      mapInstance.remove();
    };
  }, [userLocation, atmListState]);

  // Build matrix waktu travel secara async dan paralel
  useEffect(() => {
    if (!userLocation || atmListState.length === 0) return;
    console.log("Inisialisasi peta dengan ATM:", atmListState);

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
      } finally {
        setLoadingRoute(false);
      }
    };

    buildMatrix();
  }, [userLocation, atmListState]);

  // Gambar rute setelah data siap
  useEffect(() => {
    if (
      !map ||
      !userLocation ||
      !timeMatrix ||
      !userToATMTime ||
      atmListState.length === 0
    )
      return;

    const draw = async () => {
      setLoadingRoute(true);
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
      setLoadingRoute(false);
    };

    draw();
  }, [map, userLocation, timeMatrix, userToATMTime, atmListState]);

  return (
    <div
      className="mapview-container"
      style={{ display: "flex", height: "80vh" }}
    >
      <div
        ref={mapRef}
        className="map-container"
        style={{ width: "70%", height: "100%" }}
      />
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
            console.log("Data ATM dari file:", data);
            setAtmListState(data);
          }}
        />
        <h3>Urutan Kunjungan ATM</h3>
        {loadingRoute ? (
          <p>Loading rute...</p>
        ) : routeOrder.length === 0 ? (
          <p>Tidak ada rute ditemukan.</p>
        ) : (
          <ol>
            {routeOrder.map((atm, index) => (
              <li key={index}>
                <strong>{atm.name}</strong> — Sisa uang: Rp
                {(atm.remainingMoney || 0).toLocaleString()}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};

export default MapView;
