export const buildTimeMatrixAsync = async (
  userLocation,
  atmList,
  getTravelTimeFn
) => {
  if (!userLocation || !Array.isArray(atmList) || atmList.length === 0) {
    throw new Error("Input userLocation atau atmList tidak valid");
  }
  if (typeof getTravelTimeFn !== "function") {
    throw new Error("Parameter getTravelTimeFn harus fungsi async");
  }

  // Hitung waktu perjalanan user ke masing-masing ATM (parallel)
  const userTimes = await Promise.all(
    atmList.map(async (atm) => {
      try {
        return await getTravelTimeFn(userLocation, atm.coords);
      } catch (error) {
        console.warn(
          `Gagal dapatkan waktu perjalanan user ke ATM ${atm.name || ""}:`,
          error
        );
        return 999999; // nilai default jika gagal
      }
    })
  );

  // Bangun matrix waktu antar ATM (parallel nested)
  const matrix = {};
  await Promise.all(
    atmList.map(async (atmFrom, i) => {
      await Promise.all(
        atmList.map(async (atmTo, j) => {
          if (i === j) {
            matrix[`${i}-${j}`] = 0; // waktu perjalanan ke ATM yang sama 0
            return;
          }
          try {
            const travelTime = await getTravelTimeFn(
              atmFrom.coords,
              atmTo.coords
            );
            matrix[`${i}-${j}`] = travelTime;
          } catch (error) {
            console.warn(
              `Gagal dapatkan waktu perjalanan dari ATM ${
                atmFrom.name || i
              } ke ATM ${atmTo.name || j}:`,
              error
            );
            matrix[`${i}-${j}`] = 999999;
          }
        })
      );
    })
  );

  return { userTimes, matrix };
};
