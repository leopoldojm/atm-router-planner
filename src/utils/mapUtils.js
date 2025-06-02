// Import TomTom Maps SDK dan ikon ATM
import tt from "@tomtom-international/web-sdk-maps";
import atmIcon from "../assets/atm.png";

// Fungsi untuk menginisialisasi peta dengan lokasi pengguna
export const initializeMap = (container, userLocation) => {
  // Validasi: pastikan container dan lokasi pengguna tersedia
  if (!container || !userLocation) {
    console.error("Container atau lokasi user tidak valid.");
    return null;
  }

  // Ambil API key dari environment variable
  const apiKey = process.env.REACT_APP_TOMTOM_API_KEY;
  if (!apiKey) {
    console.error("API key TomTom belum di-set");
    return null;
  }

  // Buat instance peta menggunakan TomTom
  const mapInstance = tt.map({
    key: apiKey,
    container: container,
    center: userLocation, // pusat peta berdasarkan lokasi pengguna
    zoom: 13,
  });

  // Tambahkan kontrol navigasi (zoom, pan, dll)
  mapInstance.addControl(new tt.NavigationControl());

  return mapInstance;
};

// Fungsi untuk menambahkan marker pengguna dan ATM ke peta
export const addMarkersToMap = (
  map,
  userLocation,
  atmList,
  existingUserMarker = null,
  existingAtmMarkers = [],
  routeOrder = []
) => {
  // Validasi: pastikan instance peta tersedia
  if (!map) {
    console.error("Objek peta tidak tersedia.");
    return { userMarker: null, atmMarkers: [] };
  }

  // Hapus marker pengguna sebelumnya jika ada
  if (existingUserMarker) {
    existingUserMarker.remove();
  }

  // Hapus semua marker ATM sebelumnya
  existingAtmMarkers.forEach((marker) => marker.remove());
  existingAtmMarkers.length = 0; // reset array ke kosong

  // Buat elemen HTML untuk marker pengguna (ikon orang dalam lingkaran)
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
  userMarkerElement.style.transform = "translate(-50%, -100%)"; // Posisi marker di tengah bawah

  // Tambahkan marker pengguna ke peta
  const userMarker = new tt.Marker({ element: userMarkerElement })
    .setLngLat(userLocation)
    .addTo(map);

  // Tentukan sumber data ATM yang akan digunakan
  const markerSourceList =
    Array.isArray(routeOrder) && routeOrder.length > 0 ? routeOrder : atmList;

  // Iterasi setiap ATM dan tambahkan marker ke peta
  markerSourceList.forEach((atm, index) => {
    // Validasi koordinat
    if (!Array.isArray(atm.coords) || atm.coords.length !== 2) {
      console.warn(`Koordinat ATM pada indeks ${index} tidak valid.`);
      return;
    }

    // Buat elemen marker ATM menggunakan gambar ikon
    const markerElement = document.createElement("img");
    markerElement.src = atmIcon;
    markerElement.style.width = "30px";
    markerElement.style.height = "30px";
    markerElement.style.cursor = "pointer";
    markerElement.style.userSelect = "none";

    // HTML untuk popup informasi ATM
    const popupHtml = `
      <strong>${atm.name || "ATM"}</strong><br/>
      Remaining: ${(atm.remaining.toLocaleString() || 0).toLocaleString()}%
    `;

    // Tambahkan marker ATM ke peta dengan popup
    const atmMarker = new tt.Marker({ element: markerElement })
      .setLngLat(atm.coords)
      .setPopup(new tt.Popup({ offset: 30 }).setHTML(popupHtml))
      .addTo(map);

    // Simpan marker ke dalam array agar bisa dihapus nantinya
    existingAtmMarkers.push(atmMarker);
  });

  // Return marker yang telah ditambahkan
  return { userMarker, atmMarkers: existingAtmMarkers };
};
