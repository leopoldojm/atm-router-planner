export function nearestNeighbor(matrix) {
  const n = matrix.length;
  const visited = Array(n).fill(false);
  visited[0] = true;
  const path = [0];

  for (let step = 1; step < n; step++) {
    const last = path[path.length - 1];
    let nearest = -1;
    let minTime = Infinity;

    for (let i = 1; i < n; i++) {
      if (!visited[i] && matrix[last][i] < minTime) {
        minTime = matrix[last][i];
        nearest = i;
      }
    }

    visited[nearest] = true;
    path.push(nearest);
  }

  return path;
}
