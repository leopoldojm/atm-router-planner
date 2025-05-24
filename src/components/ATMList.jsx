import React from "react";

const ATMList = ({ order }) => {
  return (
    <div style={{ padding: "1rem" }}>
      <h3>Urutan Kunjungan ATM:</h3>
      <ol>
        {order.map((atm, index) => (
          <li key={atm.id}>
            <strong>
              {index + 1}. {atm.name}
            </strong>
            <br />
            ID: {atm.id}
            <br />
            Sisa uang: Rp{atm.remainingMoney.toLocaleString()}
          </li>
        ))}
      </ol>
    </div>
  );
};

export default ATMList;
