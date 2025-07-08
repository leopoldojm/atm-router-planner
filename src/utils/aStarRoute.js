// Fungsi utama A* untuk menentukan rute ATM optimal
export const aStarRoute = (
  atmList, // Daftar ATM yang tersedia
  timeMatrix, // Matriks waktu antar ATM
  userToATMTime, // Waktu dari user ke masing-masing ATM
  alphaParam = 0.3, // Bobot waktu (default: 0.7)
  betaParam = 0.7 // Bobot uang (default: 0.3)
) => {
  if (!timeMatrix || !userToATMTime) return []; // Jika data waktu tidak tersedia, return kosong

  // Fungsi heuristic (estimasi sisa biaya dari posisi sekarang)
  const heuristic = (currentIndex, visited) => {
    let minTime = Infinity;
    let minMoney = Infinity;

    for (let i = 0; i < atmList.length; i++) {
      if (visited[i]) continue; // Lewati ATM yang sudah dikunjungi

      const key = currentIndex === -1 ? null : `${currentIndex}-${i}`;
      const time =
        currentIndex === -1
          ? userToATMTime?.[i] ?? 999999 // Jika belum mulai, gunakan waktu dari user ke ATM
          : timeMatrix?.[key] ?? 999999; // Jika sudah mulai, gunakan waktu antar ATM

      const money = atmList[i].remaining ?? 0; // Gunakan properti 'remaining' dari ATM

      if (time < minTime) minTime = time;
      if (money < minMoney) minMoney = money;
    }

    if (minTime === Infinity) minTime = 0;
    if (minMoney === Infinity) minMoney = 0;

    // Estimasi total biaya (kombinasi waktu dan uang)
    return alphaParam * minTime + betaParam * minMoney;
  };

  // Class node untuk menyimpan state pada openSet
  class Node {
    constructor(path, visited, gCost, hCost) {
      this.path = path; // Jalur ATM yang dikunjungi sejauh ini (array of index)
      this.visited = visited; // Status kunjungan untuk setiap ATM
      this.gCost = gCost; // Biaya sebenarnya dari awal hingga titik ini
      this.hCost = hCost; // Estimasi biaya sisa (heuristic)
    }
    get fCost() {
      return this.gCost + this.hCost; // Total biaya (g + h)
    }
  }

  const openSet = []; // Antrian node yang akan dievaluasi
  const visitedInit = new Array(atmList.length).fill(false); // Semua ATM awalnya belum dikunjungi

  // Tambahkan node awal ke openSet
  openSet.push(new Node([], visitedInit, 0, heuristic(-1, visitedInit)));

  let bestPath = null;

  while (openSet.length) {
    openSet.sort((a, b) => a.fCost - b.fCost); // Urutkan openSet berdasarkan total biaya
    const current = openSet.shift(); // Ambil node dengan biaya terkecil

    if (current.path.length === atmList.length) {
      bestPath = current.path; // Semua ATM telah dikunjungi, simpan rute terbaik
      break;
    }

    const lastIndex =
      current.path.length === 0 ? -1 : current.path[current.path.length - 1];

    for (let i = 0; i < atmList.length; i++) {
      if (current.visited[i]) continue; // Lewati ATM yang sudah dikunjungi

      const newVisited = [...current.visited];
      newVisited[i] = true;

      const newPath = [...current.path, i];

      const key = lastIndex === -1 ? null : `${lastIndex}-${i}`;
      const travelTime =
        lastIndex === -1
          ? userToATMTime[i] ?? 999999
          : timeMatrix[key] ?? 999999;

      const money = atmList[i].remaining ?? 0;

      // gCost baru = g sebelumnya + bobot waktu * waktu perjalanan + bobot uang * uang yang tersisa * (sisa langkah)
      const newG =
        current.gCost +
        alphaParam * travelTime +
        betaParam * money * (atmList.length - newPath.length);

      const newH = heuristic(i, newVisited); // Hitung heuristic baru dari posisi saat ini

      // Tambahkan node baru ke openSet untuk dievaluasi
      openSet.push(new Node(newPath, newVisited, newG, newH));
    }
  }

  if (!bestPath) return []; // Jika tidak ada rute terbaik ditemukan, return kosong

  // Mapping hasil index ke ATM object
  return bestPath.map((idx) => atmList[idx]);
};
