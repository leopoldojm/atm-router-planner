import React, { useEffect, useRef, useState } from "react";
import "@tomtom-international/web-sdk-maps/dist/maps.css";

import AtmUploader from "../components/AtmUploader";
import { getTravelTimeInSeconds } from "../services/tomtomApi";
import { initializeMap, addMarkersToMap } from "../utils/mapUtils";
import { buildTimeMatrixAsync } from "../utils/timeMatrixUtils";
import { aStarRoute } from "../utils/aStarRoute";
import { drawRoute } from "../utils/drawRoute";

const MapView = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [timeMatrix, setTimeMatrix] = useState(null);
  const [userToATMTime, setUserToATMTime] = useState(null);
  const [routeOrder, setRouteOrder] = useState([]);
  const [atmListState, setAtmListState] = useState([]);
  const [alpha, setAlpha] = useState(0.7);
  const [beta, setBeta] = useState(0.3);

  const userMarkerRef = useRef(null);
  const atmMarkersRef = useRef([]);
  const isFetchingRouteRef = useRef(false);

  useEffect(() => {
    setUserLocation([106.966592, -6.257289]);
  }, []);

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

  const handleReset = () => {
    // Bersihkan state dan peta
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
          <br />
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
                accentColor: "#0070ba", // Biru Mandiri
              }}
            />
          </div>

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
            {routeOrder.map((atm, routeIndex) => {
              return (
                <li
                  key={routeIndex}
                  style={{ cursor: "pointer", marginBottom: "0.5rem" }}
                  onClick={() => handleAtmClick(routeIndex)}
                >
                  <div>
                    <strong>{atm.name}</strong>
                  </div>
                  <div>
                    <div>
                      Remaining:{" "}
                      {atm.remaining != null
                        ? atm.remaining.toLocaleString() + "%"
                        : "0%"}
                    </div>
                  </div>
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
