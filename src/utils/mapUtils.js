import tt from "@tomtom-international/web-sdk-maps";

export const initializeMap = (container, userLocation) => {
  const mapInstance = tt.map({
    key: process.env.REACT_APP_TOMTOM_API_KEY,
    container: container,
    center: userLocation,
    zoom: 13,
  });

  mapInstance.addControl(new tt.NavigationControl());
  return mapInstance;
};

export const addMarkersToMap = (map, userLocation, atmList) => {
  // Marker user
  new tt.Marker({ color: "blue" })
    .setLngLat(userLocation)
    .setPopup(new tt.Popup({ offset: 30 }).setText("Lokasi Kamu"))
    .addTo(map);

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
      .addTo(map);
  });
};
