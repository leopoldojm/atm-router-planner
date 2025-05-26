const alpha = 0.7;
const beta = 0.3;

export const aStarRoute = (
  atmList,
  timeMatrix,
  userToATMTime,
  alphaParam = alpha,
  betaParam = beta
) => {
  if (!timeMatrix || !userToATMTime) return [];

  const heuristic = (currentIndex, visited) => {
    let minTime = Infinity;
    let minMoney = Infinity;

    for (let i = 0; i < atmList.length; i++) {
      if (visited[i]) continue;
      const key = currentIndex === -1 ? null : `${currentIndex}-${i}`;
      const time =
        currentIndex === -1
          ? userToATMTime?.[i] ?? 999999
          : timeMatrix?.[key] ?? 999999;

      // Ganti remainingMoney ke remaining
      const money = atmList[i].remaining ?? 0;

      if (time < minTime) minTime = time;
      if (money < minMoney) minMoney = money;
    }

    if (minTime === Infinity) minTime = 0;
    if (minMoney === Infinity) minMoney = 0;

    return alphaParam * minTime + betaParam * minMoney;
  };

  class Node {
    constructor(path, visited, gCost, hCost) {
      this.path = path;
      this.visited = visited;
      this.gCost = gCost;
      this.hCost = hCost;
    }
    get fCost() {
      return this.gCost + this.hCost;
    }
  }

  const openSet = [];
  const visitedInit = new Array(atmList.length).fill(false);
  openSet.push(new Node([], visitedInit, 0, heuristic(-1, visitedInit)));

  let bestPath = null;

  while (openSet.length) {
    openSet.sort((a, b) => a.fCost - b.fCost);
    const current = openSet.shift();

    if (current.path.length === atmList.length) {
      bestPath = current.path;
      break;
    }

    const lastIndex =
      current.path.length === 0 ? -1 : current.path[current.path.length - 1];

    for (let i = 0; i < atmList.length; i++) {
      if (current.visited[i]) continue;

      const newVisited = [...current.visited];
      newVisited[i] = true;
      const newPath = [...current.path, i];

      const key = lastIndex === -1 ? null : `${lastIndex}-${i}`;
      const travelTime =
        lastIndex === -1
          ? userToATMTime[i] ?? 999999
          : timeMatrix[key] ?? 999999;

      // Ganti remainingMoney ke remaining
      const money = atmList[i].remaining ?? 0;

      const newG =
        current.gCost +
        alphaParam * travelTime +
        betaParam * money * (atmList.length - newPath.length);

      const newH = heuristic(i, newVisited);

      openSet.push(new Node(newPath, newVisited, newG, newH));
    }
  }

  if (!bestPath) return [];

  return bestPath.map((idx) => atmList[idx]);
};
