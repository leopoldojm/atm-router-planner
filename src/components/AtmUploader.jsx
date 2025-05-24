import React, { useRef } from "react";
import "../styles/main.css"; // CSS terpisah

const AtmUploader = ({ onDataUpload }) => {
  const fileInputRef = useRef();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        onDataUpload(data);
      } catch (error) {
        alert("Format file tidak valid. Pastikan file JSON.");
      }
    };
    reader.readAsText(file);
  };

  const handleClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="upload-container">
      <button className="custom-upload-button" onClick={handleClick}>
        📂 Upload ATM JSON
      </button>
      <input
        type="file"
        accept=".json"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default AtmUploader;
