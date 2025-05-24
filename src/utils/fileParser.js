import * as XLSX from "xlsx";

export const parseAtmFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        let formatted;
        if (file.name.endsWith(".csv")) {
          const text = event.target.result;
          formatted = parseCSV(text);
        } else {
          // Excel parsing
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet);
          console.log(json);

          formatted = json
            .map((item) => {
              // Ganti koma dengan titik sebelum parsing
              const lng = parseFloat(String(item.longitude).replace(",", "."));
              const lat = parseFloat(String(item.latitude).replace(",", "."));
              const remaining = parseInt(item.remainingMoney);

              if (
                !item.id ||
                !item.name ||
                isNaN(lng) ||
                isNaN(lat) ||
                isNaN(remaining)
              ) {
                console.warn("Data tidak valid dan di-skip:", item);
                return null;
              }

              return {
                id: item.id,
                name: item.name,
                coords: [lng, lat],
                remainingMoney: remaining,
              };
            })
            .filter((item) => item !== null);
        }
        resolve(formatted);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);

    if (file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
};

function parseCSV(text) {
  const lines = text.trim().split("\n");

  // Coba deteksi delimiter (tab atau koma)
  const delimiter = lines[0].includes(",") ? "," : "\t";

  const headers = lines[0].split(delimiter).map((h) => h.trim());

  return lines
    .slice(1)
    .map((line) => {
      const values = line.split(delimiter).map((v) => v.trim());
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = values[i];
      });

      // Ganti koma dengan titik sebelum parsing
      const lng = parseFloat(String(obj.longitude).replace(",", "."));
      const lat = parseFloat(String(obj.latitude).replace(",", "."));
      const remaining = parseInt(obj.remainingMoney);

      if (
        !obj.id ||
        !obj.name ||
        isNaN(lng) ||
        isNaN(lat) ||
        isNaN(remaining)
      ) {
        console.warn("Data CSV tidak valid dan di-skip:", obj);
        return null;
      }

      return {
        id: obj.id,
        name: obj.name,
        coords: [lng, lat],
        remainingMoney: remaining,
      };
    })
    .filter((item) => item !== null);
}
