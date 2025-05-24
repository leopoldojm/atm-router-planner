export async function getDurationMatrix(points, google) {
  return new Promise((resolve, reject) => {
    const service = new google.maps.DistanceMatrixService();

    service.getDistanceMatrix(
      {
        origins: points,
        destinations: points,
        travelMode: "DRIVING",
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: "best_guess",
        },
      },
      (response, status) => {
        if (status !== "OK") {
          reject(status);
          return;
        }

        const matrix = response.rows.map((row) =>
          row.elements.map((el) =>
            el.status === "OK"
              ? el.duration_in_traffic?.value || el.duration.value
              : Infinity
          )
        );
        resolve(matrix);
      }
    );
  });
}
