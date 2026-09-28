// Penyimpanan gambar tangkapan layar kartu (IndexedDB) — terlalu besar untuk localStorage.

const DB = "themars-media";
const STORE = "images";

function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putImage(id: string, dataUrl: string) {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(dataUrl, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getImage(id: string) {
  try {
    const db = await open();
    return await new Promise<string | undefined>((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result as string | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

/** Ambil bingkai video saat ini sebagai JPEG kecil. Gagal (undefined) bila video lintas-domain. */
export function captureFrame(video: HTMLVideoElement, width = 480) {
  try {
    const scale = width / video.videoWidth;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return undefined;
  }
}
