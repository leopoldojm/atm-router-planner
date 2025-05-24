import React from "react";
import MapView from "./components/mapView";
import "./styles/main.css";

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        🏧 <span>ATM Route Planner</span>
      </header>
      <main>
        <MapView />
      </main>
    </div>
  );
}

export default App;
