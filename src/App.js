import MapView from "./components/mapView"; // Import komponen MapView dari folder components
import "./styles/main.css"; // Import file CSS utama untuk styling aplikasi

function App() {
  return (
    <div className="app-container">
      {/* Bagian header aplikasi */}
      <header
        className="app-header"
        style={{
          display: "flex", // Mengatur layout flexbox untuk header
          alignItems: "center", // Vertikal align item di tengah
          gap: "1rem", // Jarak antar elemen dalam header
          padding: "0.5rem 1rem", // Padding atas-bawah dan kiri-kanan
          width: "100%", // Lebar header penuh
        }}
      >
        {/* Judul aplikasi */}
        <span style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
          Cash Replenish Route Planner
        </span>
      </header>

      {/* Bagian utama konten aplikasi */}
      <main>
        {/* Komponen peta yang menampilkan MapView */}
        <MapView />
      </main>
    </div>
  );
}

export default App; // Export komponen App sebagai default export
