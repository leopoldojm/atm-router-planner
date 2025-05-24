import React, { useEffect, useRef, useState } from "react";
import tt from "@tomtom-international/web-sdk-maps";
import "@tomtom-international/web-sdk-maps/dist/maps.css";
import atmList from "../data/atmList";
import { getTravelTimeInSeconds } from "../services/tomtomApi";

const MapView = () => {
  const mapRef = useRef(null);
  const [routeOrder, setRouteOrder] = useState([]);
  const [map, setMap] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Ambil lokasi pengguna
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.longitude, pos.coords.latitude];
          setUserLocation(coords);
        },
        (err) => {
          console.error("Gagal dapat posisi user:", err);
          setUserLocation(null);
        },
        { enableHighAccuracy: true }
      );
    } else {
      console.error("Browser tidak support geolocation");
      setUserLocation(null);
    }
  }, []);

  // Inisialisasi peta
  useEffect(() => {
    if (!userLocation) return;

    const mapInstance = tt.map({
      key: process.env.REACT_APP_TOMTOM_API_KEY,
      container: mapRef.current,
      center: userLocation,
      zoom: 13,
    });

    mapInstance.addControl(new tt.NavigationControl());

    // Marker user
    new tt.Marker({ color: "blue" })
      .setLngLat(userLocation)
      .setPopup(new tt.Popup({ offset: 30 }).setText("Lokasi Kamu"))
      .addTo(mapInstance);

    // Marker ATM
    atmList.forEach((atm) => {
      new tt.Marker({ color: "red" })
        .setLngLat(atm.coords)
        .setPopup(
          new tt.Popup({ offset: 30 }).setHTML(
            `<strong>${atm.name}</strong><br/>Sisa uang: Rp${(
              atm.remainingMoney || 0
            ).toLocaleString()}`
          )
        )
        .addTo(mapInstance);
    });

    setMap(mapInstance);

    return () => {
      mapInstance.remove();
    };
  }, [userLocation]);

  // Hitung rute terbaik berdasarkan waktu tempuh
  useEffect(() => {
    if (!map || !userLocation) return;

    const calculateBestRoute = async () => {
      setLoadingRoute(true);

      const remaining = [...atmList];
      const route = [];
      let current = userLocation;

      while (remaining.length > 0) {
        let bestTime = Infinity;
        let bestIndex = -1;

        for (let i = 0; i < remaining.length; i++) {
          const atm = remaining[i];
          try {
            const time = await getTravelTimeInSeconds(current, atm.coords);
            if (time < bestTime) {
              bestTime = time;
              bestIndex = i;
            }
          } catch (err) {
            console.error("Gagal mengambil waktu tempuh:", err);
          }
        }

        if (bestIndex === -1) break;

        const nextATM = remaining.splice(bestIndex, 1)[0];
        route.push(nextATM);
        current = nextATM.coords;
      }

      setRouteOrder(route);

      const coords = [userLocation, ...route.map((atm) => atm.coords)];

      const geojson = {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: coords,
        },
      };

      // Remove previous route if exists
      if (map.getLayer && map.getLayer("route-line"))
        map.removeLayer("route-line");
      if (map.getSource && map.getSource("route-line"))
        map.removeSource("route-line");

      map.addLayer({
        id: "route-line",
        type: "line",
        source: {
          type: "geojson",
          data: geojson,
        },
        paint: {
          "line-color": "#ff5500",
          "line-width": 4,
        },
      });

      // Zoom ke semua titik
      const bounds = coords.reduce((b, coord) => {
        return b.extend(coord);
      }, new tt.LngLatBounds(coords[0], coords[0]));

      map.fitBounds(bounds, { padding: 50 });

      setLoadingRoute(false);
    };

    calculateBestRoute();
  }, [map, userLocation]);

  return (
    <div
      className="mapview-container"
      style={{ display: "flex", height: "100vh" }}
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
        <h3>🧭 Urutan Kunjungan ATM</h3>
        {loadingRoute ? (
          <p>Loading rute...</p>
        ) : (
          <ol>
            {routeOrder.map((atm, index) => (
              <li key={atm.id} style={{ marginBottom: "1rem" }}>
                <strong>
                  {index + 1}. {atm.name}
                </strong>
                <br />
                Sisa uang: Rp{(atm.remainingMoney || 0).toLocaleString()}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};

export default MapView;
