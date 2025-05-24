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

// Memisahkan marker user dan ATM
export const addMarkersToMap = (
  map,
  userLocation,
  atmList,
  existingUserMarker = null,
  existingAtmMarkers = []
) => {
  // Hapus marker lama
  if (existingUserMarker) {
    existingUserMarker.remove();
  }
  existingAtmMarkers.forEach((marker) => marker.remove());
  existingAtmMarkers.length = 0;

  // Tambah marker user (warna biru)
  const userMarker = new tt.Marker({ color: "blue" })
    .setLngLat(userLocation)
    .addTo(map);

  // Tambah marker ATM (warna merah)
  atmList.forEach((atm) => {
    const atmMarker = new tt.Marker({ color: "red" })
      .setLngLat(atm.coords)
      .setPopup(
        new tt.Popup({ offset: 30 }).setHTML(
          `<strong>${atm.name}</strong><br/>Sisa uang: Rp${(
            atm.remainingMoney || 0
          ).toLocaleString()}`
        )
      )
      .addTo(map);
    existingAtmMarkers.push(atmMarker);
  });

  return { userMarker, atmMarkers: existingAtmMarkers };
};
