export const buildTimeMatrixAsync = async (
  userLocation,
  atmList,
  getTravelTimeFn
) => {
  // Waktu user ke ATM (parallel)
  const userTimes = await Promise.all(
    atmList.map(async (atm) => {
      try {
        return await getTravelTimeFn(userLocation, atm.coords);
      } catch {
        return 999999;
      }
    })
  );

  // Waktu antar ATM (parallel nested)
  const matrix = {};
  await Promise.all(
    atmList.map(async (atmFrom, i) => {
      const promises = atmList.map(async (atmTo, j) => {
        if (i === j) return;
        try {
          const t = await getTravelTimeFn(atmFrom.coords, atmTo.coords);
          matrix[`${i}-${j}`] = t;
        } catch {
          matrix[`${i}-${j}`] = 999999;
        }
      });
      await Promise.all(promises);
    })
  );

  return { userTimes, matrix };
};
