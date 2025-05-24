import * as XLSX from "xlsx";

export const parseAtmFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);

        const formatted = json.map((item) => ({
          id: item.id,
          name: item.name,
          coords: [parseFloat(item.coords_lng), parseFloat(item.coords_lat)],
          remainingMoney: parseInt(item.remainingMoney),
        }));

        resolve(formatted);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
