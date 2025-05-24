import React from "react";
import atmData from "../data/atmList";

const ATMList = ({ order }) => {
  return (
    <div style={{ padding: "1rem" }}>
      <h3>Urutan Kunjungan ATM:</h3>
      <ol>
        {order.map((i) => (
          <li key={i}>{atmData[i - 1].id}</li>
        ))}
      </ol>
    </div>
  );
};

export default ATMList;
