import tt from "@tomtom-international/web-sdk-maps";

export const initializeMap = (container, userLocation) => {
  if (!container || !userLocation) {
    console.error("Container atau lokasi user tidak valid.");
    return null;
  }

  const apiKey = process.env.REACT_APP_TOMTOM_API_KEY;
  if (!apiKey) {
    console.error("API key TomTom belum di-set");
    return null;
  }

  const mapInstance = tt.map({
    key: apiKey,
    container: container,
    center: userLocation,
    zoom: 13,
  });

  mapInstance.addControl(new tt.NavigationControl());

  return mapInstance;
};

export const addMarkersToMap = (
  map,
  userLocation,
  atmList,
  existingUserMarker = null,
  existingAtmMarkers = [],
  routeOrder = []
) => {
  if (!map) {
    console.error("Objek peta tidak tersedia.");
    return { userMarker: null, atmMarkers: [] };
  }

  // Hapus marker lama dulu
  if (existingUserMarker) {
    existingUserMarker.remove();
  }
  existingAtmMarkers.forEach((m) => m.remove());
  existingAtmMarkers.length = 0;

  // Buat marker user dengan icon orang di dalam lingkaran
  const userMarkerElement = document.createElement("div");
  userMarkerElement.innerHTML = `
    <div style="
      background: white;
      border: 3px solid #0074D9;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      justify-content: center;
      align-items: center;
      box-shadow: 0 0 6px rgba(0, 0, 0, 0.4);
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#0074D9" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2V19.2c0-3.2-6.4-4.8-9.6-4.8z"/>
      </svg>
    </div>
  `;
  userMarkerElement.style.transform = "translate(-50%, -100%)";

  const userMarker = new tt.Marker({ element: userMarkerElement })
    .setLngLat(userLocation)
    .addTo(map);

  // Pilih daftar marker ATM berdasarkan routeOrder jika tersedia
  const markerSourceList =
    Array.isArray(routeOrder) && routeOrder.length > 0 ? routeOrder : atmList;

  // Tambah marker ATM dengan nomor urut, styling navy/kuning
  markerSourceList.forEach((atm, index) => {
    if (!Array.isArray(atm.coords) || atm.coords.length !== 2) {
      console.warn(`Koordinat ATM pada indeks ${index} tidak valid.`);
      return;
    }

    const markerElement = document.createElement("div");
    Object.assign(markerElement.style, {
      background: "#003d79", // navy
      color: "#FFB700", // kuning
      width: "30px",
      height: "30px",
      borderRadius: "50%",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontWeight: "bold",
      fontSize: "16px",
      border: "2px solid #FFB700",
      boxShadow: "0 0 6px rgba(0, 61, 121, 0.6)",
      cursor: "pointer",
      userSelect: "none",
    });
    markerElement.textContent = (index + 1).toString();

    const popupHtml = `
      <strong>${atm.name || "ATM"}</strong><br/>
      Sisa uang: Rp${(atm.remainingMoney || 0).toLocaleString()}
    `;

    const atmMarker = new tt.Marker({ element: markerElement })
      .setLngLat(atm.coords)
      .setPopup(new tt.Popup({ offset: 30 }).setHTML(popupHtml))
      .addTo(map);

    existingAtmMarkers.push(atmMarker);
  });

  return { userMarker, atmMarkers: existingAtmMarkers };
};
