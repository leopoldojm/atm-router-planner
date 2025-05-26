// src/components/AtmUploader.js
import React, { useRef, useState } from "react";
import "../styles/main.css";
import { parseAtmFile } from "../utils/fileParser";

const AtmUploader = ({ onDataUpload }) => {
  const fileInputRef = useRef();
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validasi ekstensi file agar aman
    const validExtensions = ["csv", "xlsx", "xls"];
    const fileExtension = file.name.split(".").pop().toLowerCase();
    if (!validExtensions.includes(fileExtension)) {
      alert("File tidak didukung. Harap upload file CSV atau Excel.");
      e.target.value = null; // reset input supaya bisa pilih ulang file
      return;
    }

    try {
      setLoading(true);
      const data = await parseAtmFile(file);
      console.log("Parsed data:", data);
      onDataUpload(data);
    } catch (error) {
      console.log(error);

      alert(
        "Format file tidak valid atau terjadi kesalahan saat parsing.\n" +
          "Pastikan file dalam format CSV, XLSX, atau XLS yang benar."
      );
      console.error(error);
    } finally {
      e.target.value = null; // reset supaya bisa upload ulang file sama lagi
      setLoading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="upload-container">
      <button
        className="custom-upload-button"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? "Memproses file..." : "Silakan upload file."}
      </button>
      <input
        type="file"
        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default AtmUploader;
