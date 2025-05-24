import * as XLSX from "xlsx";

const requiredColumns = [
  "id",
  "name",
  "longitude",
  "latitude",
  "remainingMoney",
];

export const parseAtmFile = async (file) => {
  return new Promise((resolve, reject) => {
    // Validasi ekstensi file
    const allowedExtensions = [".csv", ".xls", ".xlsx"];
    if (
      !allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
    ) {
      reject(
        new Error(
          `File tidak didukung. Mohon upload file dengan ekstensi: ${allowedExtensions.join(
            ", "
          )}`
        )
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        let formatted;

        if (file.name.toLowerCase().endsWith(".csv")) {
          const text = event.target.result;
          formatted = parseCSV(text);
        } else {
          // Excel parsing
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];

          if (!sheet) {
            reject(new Error("File Excel tidak memiliki sheet yang valid."));
            return;
          }

          const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
          if (json.length === 0) {
            reject(new Error("Sheet Excel kosong."));
            return;
          }

          // Validasi kolom wajib ada di header Excel
          const sheetHeaders = Object.keys(json[0]).map((h) =>
            h.trim().toLowerCase()
          );
          const missingColumns = requiredColumns.filter(
            (col) => !sheetHeaders.includes(col.toLowerCase())
          );
          if (missingColumns.length > 0) {
            reject(
              new Error(
                `File Excel tidak memiliki kolom wajib: ${missingColumns.join(
                  ", "
                )}`
              )
            );
            return;
          }

          formatted = json
            .map((item, idx) => {
              // Normalisasi key agar case-insensitive
              const row = {};
              Object.keys(item).forEach(
                (k) => (row[k.trim().toLowerCase()] = item[k])
              );

              // Parsing dan validasi tiap kolom
              const lng = parseFloat(
                String(row["longitude"]).replace(",", ".")
              );
              const lat = parseFloat(String(row["latitude"]).replace(",", "."));
              const remaining = parseInt(row["remainingmoney"]);

              if (
                !row["id"] ||
                !row["name"] ||
                isNaN(lng) ||
                isNaN(lat) ||
                isNaN(remaining)
              ) {
                console.warn(
                  `Baris ${idx + 2} data tidak valid dan di-skip:`,
                  item
                );
                return null;
              }

              return {
                id: row["id"],
                name: row["name"],
                coords: [lng, lat],
                remainingMoney: remaining,
              };
            })
            .filter((item) => item !== null);

          if (formatted.length === 0) {
            reject(new Error("Tidak ada data ATM valid di file Excel."));
            return;
          }
        }
        resolve(formatted);
      } catch (err) {
        reject(new Error("Gagal memproses file: " + err.message));
      }
    };

    reader.onerror = (err) =>
      reject(new Error("Gagal membaca file: " + err.message));

    if (file.name.toLowerCase().endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
};

function parseCSV(text) {
  const lines = text.trim().split("\n");

  if (lines.length < 2) {
    throw new Error("File CSV kosong atau tidak memiliki data.");
  }

  // Coba deteksi delimiter (tab atau koma)
  const delimiter = lines[0].includes(",") ? "," : "\t";

  const headers = lines[0].split(delimiter).map((h) => h.trim());

  // Validasi kolom wajib
  const missingColumns = requiredColumns.filter(
    (col) => !headers.map((h) => h.toLowerCase()).includes(col.toLowerCase())
  );
  if (missingColumns.length > 0) {
    throw new Error(
      `File CSV tidak memiliki kolom wajib: ${missingColumns.join(", ")}`
    );
  }

  return lines
    .slice(1)
    .map((line, index) => {
      const values = line.split(delimiter).map((v) => v.trim());
      const obj = {};
      headers.forEach((header, i) => {
        obj[header.toLowerCase()] = values[i];
      });

      // Parsing kolom dengan validasi
      const lng = parseFloat(String(obj["longitude"]).replace(",", "."));
      const lat = parseFloat(String(obj["latitude"]).replace(",", "."));
      const remaining = parseInt(obj["remainingmoney"]);

      if (
        !obj["id"] ||
        !obj["name"] ||
        isNaN(lng) ||
        isNaN(lat) ||
        isNaN(remaining)
      ) {
        console.warn(`Baris ${index + 2} CSV tidak valid dan di-skip:`, obj);
        return null;
      }

      return {
        id: obj["id"],
        name: obj["name"],
        coords: [lng, lat],
        remainingMoney: remaining,
      };
    })
    .filter((item) => item !== null);
}
