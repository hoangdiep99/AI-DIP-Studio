/**
 * AI DIP Studio - Photo History (Gallery)
 * Lưu lại các ảnh đã tạo (ảnh thẻ / phục hồi ảnh) ngay trên trình duyệt bằng IndexedDB
 * để người dùng có thể xem lại và tải lại mà không cần tạo ảnh lại từ đầu (tốn credit).
 *
 * Lưu ý: Đây là lưu trữ CỤC BỘ trên máy/trình duyệt hiện tại (chưa đồng bộ server),
 * nên xóa cache/dữ liệu trình duyệt sẽ làm mất lịch sử.
 */

const DB_NAME = 'aidip_studio_db';
const DB_VERSION = 1;
const STORE_NAME = 'history';
const MAX_ITEMS = 40; // Giới hạn số ảnh lưu để tránh phình dung lượng trình duyệt

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB không được hỗ trợ trên thiết bị/trình duyệt này.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Không mở được cơ sở dữ liệu lịch sử ảnh.'));
  });
}

function runTx(db, mode, callback) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    let result;
    try {
      result = callback(store);
    } catch (err) {
      reject(err);
      return;
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/**
 * Chuyển url ảnh (blob:, data:, hoặc http(s)) thành data URL để lưu bền vững trong IndexedDB.
 * blob: URL sẽ hết hiệu lực sau khi tải lại trang, nên cần convert sang data URL thật.
 * Nếu fetch thất bại (thường do CORS với URL remote), trả về null để nơi gọi tự fallback.
 */
async function urlToDataUrl(url) {
  if (!url) return null;
  if (typeof url === 'string' && url.startsWith('data:')) return url;
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('[history] Không chuyển được ảnh sang data URL, sẽ lưu URL gốc:', err);
    return null;
  }
}

async function enforceLimit(db) {
  const all = await runTx(db, 'readonly', (store) => new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  }));
  if (all.length <= MAX_ITEMS) return;
  const sorted = [...all].sort((a, b) => a.createdAt - b.createdAt);
  const excess = sorted.slice(0, all.length - MAX_ITEMS);
  await runTx(db, 'readwrite', (store) => {
    excess.forEach((item) => store.delete(item.id));
  });
}

/**
 * Lưu một ảnh vừa tạo vào lịch sử.
 * @param {Object} params
 * @param {'id-photo'|'restorer'} params.type
 * @param {string} params.url - URL ảnh kết quả (blob:, data: hoặc http(s))
 * @param {Object} [params.meta] - metadata hiển thị (model, ratio, resolution, thời gian...)
 * @param {string} [params.fileName]
 */
export async function addHistoryItem({ type, url, meta = {}, fileName = '' }) {
  if (!url) return null;
  try {
    const dataUrl = await urlToDataUrl(url);
    const storedUrl = dataUrl || url;
    const db = await openDb();
    const item = {
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: type || 'other',
      url: storedUrl,
      persisted: !!dataUrl,
      meta,
      fileName: fileName || `${type || 'ai-dip-studio'}-${Date.now()}.png`,
      createdAt: Date.now(),
    };
    await runTx(db, 'readwrite', (store) => store.add(item));
    await enforceLimit(db);
    db.close();
    return item;
  } catch (err) {
    console.warn('[history] Lưu lịch sử ảnh thất bại:', err);
    return null;
  }
}

/**
 * Lấy danh sách lịch sử, sắp mới nhất trước.
 * @param {'all'|'id-photo'|'restorer'} [type]
 */
export async function getHistory(type) {
  try {
    const db = await openDb();
    const items = await runTx(db, 'readonly', (store) => new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    }));
    db.close();
    const filtered = type && type !== 'all' ? items.filter((item) => item.type === type) : items;
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  } catch (err) {
    console.warn('[history] Không tải được lịch sử ảnh:', err);
    return [];
  }
}

export async function deleteHistoryItem(id) {
  try {
    const db = await openDb();
    await runTx(db, 'readwrite', (store) => store.delete(id));
    db.close();
    return true;
  } catch (err) {
    console.warn('[history] Xóa ảnh lịch sử thất bại:', err);
    return false;
  }
}

/**
 * Xóa toàn bộ lịch sử, hoặc chỉ xóa theo type nếu truyền vào.
 */
export async function clearHistory(type) {
  try {
    const db = await openDb();
    if (!type || type === 'all') {
      await runTx(db, 'readwrite', (store) => store.clear());
      db.close();
      return true;
    }
    const items = await getHistory(type);
    await runTx(db, 'readwrite', (store) => {
      items.forEach((item) => store.delete(item.id));
    });
    db.close();
    return true;
  } catch (err) {
    console.warn('[history] Xóa lịch sử thất bại:', err);
    return false;
  }
}
