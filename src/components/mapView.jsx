import React, { useEffect, useRef, useState } from "react";
import tt from "@tomtom-international/web-sdk-maps";
import "@tomtom-international/web-sdk-maps/dist/maps.css";
import atmList from "../data/atmList";
import { getTravelTimeInSeconds } from "../services/tomtomApi";

const alpha = 0.7; // bobot waktu tempuh
const beta = 0.3; // bobot uang sisa

const MapView = () => {
  const mapRef = useRef(null);
  const [routeOrder, setRouteOrder] = useState([]);
  const [map, setMap] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [timeMatrix, setTimeMatrix] = useState(null);
  const [userToATMTime, setUserToATMTime] = useState(null);

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

  // Precompute matrix waktu tempuh antar ATM dan dari user ke ATM
  useEffect(() => {
    if (!userLocation) return;

    const buildTimeMatrix = async () => {
      setLoadingRoute(true);

      const matrix = {};
      const userTimes = [];

      // Waktu dari user ke tiap ATM
      for (let i = 0; i < atmList.length; i++) {
        try {
          const t = await getTravelTimeInSeconds(
            userLocation,
            atmList[i].coords
          );
          userTimes[i] = t;
        } catch (err) {
          console.error("Gagal ambil waktu user->ATM", err);
          userTimes[i] = 999999;
        }
      }

      // Waktu antar ATM
      for (let i = 0; i < atmList.length; i++) {
        for (let j = 0; j < atmList.length; j++) {
          if (i === j) continue;
          try {
            const t = await getTravelTimeInSeconds(
              atmList[i].coords,
              atmList[j].coords
            );
            matrix[`${i}-${j}`] = t;
          } catch (err) {
            console.error(`Gagal ambil waktu ATM${i}->ATM${j}`, err);
            matrix[`${i}-${j}`] = 999999;
          }
        }
      }

      setTimeMatrix(matrix);
      setUserToATMTime(userTimes);
      setLoadingRoute(false);
    };

    buildTimeMatrix();
  }, [userLocation]);

  // Heuristic: estimasi waktu + uang minimal dari ATM yang belum dikunjungi
  const heuristic = (currentIndex, visited) => {
    let minTime = Infinity;
    let minMoney = Infinity;

    for (let i = 0; i < atmList.length; i++) {
      if (visited[i]) continue;
      const key = currentIndex === -1 ? null : `${currentIndex}-${i}`;
      const time =
        currentIndex === -1
          ? userToATMTime[i] ?? 999999
          : timeMatrix[key] ?? 999999;
      const money = atmList[i].remainingMoney ?? 0;
      if (time < minTime) minTime = time;
      if (money < minMoney) minMoney = money;
    }

    return (
      alpha * (minTime === Infinity ? 0 : minTime) +
      beta * (minMoney === Infinity ? 0 : minMoney)
    );
  };

  // Algoritma A*
  const aStarRoute = () => {
    if (!timeMatrix || !userToATMTime) return [];

    // Node A*
    class Node {
      constructor(path, visited, gCost, hCost) {
        this.path = path; // array index ATM yg sudah dikunjungi
        this.visited = visited; // array boolean
        this.gCost = gCost; // total cost so far
        this.hCost = hCost; // heuristic cost
      }

      get fCost() {
        return this.gCost + this.hCost;
      }
    }

    const openSet = [];
    const visitedInit = new Array(atmList.length).fill(false);
    openSet.push(new Node([], visitedInit, 0, heuristic(-1, visitedInit)));

    let bestPath = null;

    while (openSet.length > 0) {
      // Ambil node dengan fCost terkecil
      openSet.sort((a, b) => a.fCost - b.fCost);
      const current = openSet.shift();

      if (current.path.length === atmList.length) {
        bestPath = current.path;
        break;
      }

      const lastIndex =
        current.path.length === 0 ? -1 : current.path[current.path.length - 1];

      for (let i = 0; i < atmList.length; i++) {
        if (current.visited[i]) continue;

        const newVisited = [...current.visited];
        newVisited[i] = true;

        const newPath = [...current.path, i];

        const key = lastIndex === -1 ? null : `${lastIndex}-${i}`;
        const travelTime =
          lastIndex === -1
            ? userToATMTime[i] ?? 999999
            : timeMatrix[key] ?? 999999;
        const money = atmList[i].remainingMoney ?? 0;

        const newG =
          current.gCost +
          alpha * travelTime +
          beta * atmList[i].remainingMoney * (atmList.length - newPath.length);
        const newH = heuristic(i, newVisited);

        openSet.push(new Node(newPath, newVisited, newG, newH));
      }
    }

    if (!bestPath) return [];

    return bestPath.map((idx) => atmList[idx]);
  };

  // Hitung rute dengan A* setiap timeMatrix dan userToATMTime sudah siap
  useEffect(() => {
    if (!map || !userLocation || !timeMatrix || !userToATMTime) return;

    setLoadingRoute(true);

    const route = aStarRoute();

    setRouteOrder(route);

    // Gambar rute di peta
    const coords = [userLocation, ...route.map((atm) => atm.coords)];
    const geojson = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: coords,
      },
    };

    if (map.getLayer && map.getLayer("route-line"))
      map.removeLayer("route-line");
    if (map.getSource && map.getSource("route-line"))
      map.removeSource("route-line");

    map.addLayer({
      id: "route-line",
      type: "line",
      source: { type: "geojson", data: geojson },
      paint: {
        "line-color": "#ff5500",
        "line-width": 4,
      },
    });

    const bounds = coords.reduce(
      (b, coord) => b.extend(coord),
      new tt.LngLatBounds(coords[0], coords[0])
    );

    map.fitBounds(bounds, { padding: 50 });
    setLoadingRoute(false);
  }, [map, userLocation, timeMatrix, userToATMTime]);

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
        <h3>Urutan Kunjungan ATM</h3>
        {loadingRoute ? (
          <p>Loading rute...</p>
        ) : (
          <ol>
            {routeOrder.map((atm, index) => (
              <li key={atm.id} style={{ marginBottom: "1rem" }}>
                <strong>{atm.name}</strong>
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
