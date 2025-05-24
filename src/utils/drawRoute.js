import tt from "@tomtom-international/web-sdk-maps";

export const drawRoute = async (map, userLocation, route) => {
  const apiKey = process.env.REACT_APP_TOMTOM_API_KEY;
  const points = [userLocation, ...route.map((atm) => atm.coords)];

  const coordStr = points
    .map((pt) => `${pt[1]},${pt[0]}`) // TomTom expects lat,lon
    .join(":");

  const url = `https://api.tomtom.com/routing/1/calculateRoute/${coordStr}/json?key=${apiKey}&routeType=fastest&traffic=true`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch route");
    const data = await res.json();
    const fullRouteCoords = data.routes[0].legs.flatMap((leg) =>
      leg.points.map((p) => [p.longitude, p.latitude])
    );

    const generateColor = (index, total) => {
      const hue = Math.floor((360 / total) * index);
      return `hsl(${hue}, 70%, 50%)`;
    };

    const legs = data.routes[0].legs;
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

    map.fitBounds(
      fullRouteCoords.reduce(
        (bounds, coord) => bounds.extend([coord[0], coord[1]]),
        new tt.LngLatBounds(
          [fullRouteCoords[0][0], fullRouteCoords[0][1]],
          [fullRouteCoords[0][0], fullRouteCoords[0][1]]
        )
      ),
      { padding: 50 }
    );
  } catch (error) {
    console.error("Gagal gambar rute:", error);
  }
};
