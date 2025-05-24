import React from "react";
import MapView from "./components/mapView";
import "./styles/main.css";
import logoMandiri from "./assets/logo.svg";

function App() {
  return (
    <div className="app-container">
      <header
        className="app-header"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          padding: "0.5rem 1rem", // Hapus paddingLeft supaya gak ada jarak kiri
          // paddingLeft dihilangkan supaya mentok kiri
          width: "100%",
        }}
      >
        <img
          src={logoMandiri}
          alt="Mandiri ATM Logo"
          style={{
            width: 150,
            height: 64,
            objectFit: "contain",
            marginLeft: 0, // hilangkan margin kiri supaya mentok kiri
          }}
        />
        <span style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
          Cash Replenish Route Planner
        </span>
      </header>

      <main>
        <MapView />
      </main>
    </div>
  );
}

export default App;
