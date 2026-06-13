const DB_NAME = "NSS_FuelTrack_LocalDB";
const DB_VERSION = 1;

let dbInstance = null;

export function initDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains("shifts")) {
        db.createObjectStore("shifts", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("transactions")) {
        db.createObjectStore("transactions", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("config")) {
        db.createObjectStore("config", { keyPath: "key" });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(new Error(`Failed to open IndexedDB: ${event.target.error}`));
    };
  });
}

function getStore(storeName, mode = "readonly") {
  if (!dbInstance) throw new Error("Database not initialized. Call initDB() first.");
  const transaction = dbInstance.transaction([storeName], mode);
  return transaction.objectStore(storeName);
}

// Config Operations
export function saveLocalConfig(key, value) {
  return new Promise((resolve, reject) => {
    try {
      const store = getStore("config", "readwrite");
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    } catch (e) {
      reject(e);
    }
  });
}

export function getLocalConfig(key) {
  return new Promise((resolve, reject) => {
    try {
      const store = getStore("config", "readonly");
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ? request.result.value : null);
      request.onerror = (e) => reject(e.target.error);
    } catch (e) {
      reject(e);
    }
  });
}

// Shift Operations
export function saveLocalShift(shift) {
  return new Promise((resolve, reject) => {
    try {
      const store = getStore("shifts", "readwrite");
      const request = store.put(shift);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    } catch (e) {
      reject(e);
    }
  });
}

export function getLocalShift() {
  return new Promise((resolve, reject) => {
    try {
      const store = getStore("shifts", "readonly");
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          resolve(cursor.value);
        } else {
          resolve(null);
        }
      };
      request.onerror = (e) => reject(e.target.error);
    } catch (e) {
      reject(e);
    }
  });
}

export function clearLocalShift() {
  return new Promise((resolve, reject) => {
    try {
      const store = getStore("shifts", "readwrite");
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    } catch (e) {
      reject(e);
    }
  });
}

// Transaction Operations
export function addLocalTransaction(tx) {
  return new Promise((resolve, reject) => {
    try {
      const store = getStore("transactions", "readwrite");
      const request = store.put(tx);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    } catch (e) {
      reject(e);
    }
  });
}

export function getLocalTransactions(shiftId) {
  return new Promise((resolve, reject) => {
    try {
      const store = getStore("transactions", "readonly");
      const txs = [];
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (!shiftId || cursor.value.shiftId === shiftId) {
            txs.push(cursor.value);
          }
          cursor.continue();
        } else {
          txs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          resolve(txs);
        }
      };
      request.onerror = (e) => reject(e.target.error);
    } catch (e) {
      reject(e);
    }
  });
}

export function getPendingLocalTransactions() {
  return new Promise((resolve, reject) => {
    try {
      const store = getStore("transactions", "readonly");
      const pending = [];
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.synced === false) {
            pending.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(pending);
        }
      };
      request.onerror = (e) => reject(e.target.error);
    } catch (e) {
      reject(e);
    }
  });
}

export function clearLocalTransactions() {
  return new Promise((resolve, reject) => {
    try {
      const store = getStore("transactions", "readwrite");
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    } catch (e) {
      reject(e);
    }
  });
}

export function syncLocalTransactions(serverTransactions) {
  return new Promise((resolve, reject) => {
    try {
      const store = getStore("transactions", "readwrite");
      let count = 0;
      
      const processNext = () => {
        if (count >= serverTransactions.length) {
          return resolve();
        }
        const tx = { ...serverTransactions[count], synced: true };
        const req = store.put(tx);
        req.onsuccess = () => {
          count++;
          processNext();
        };
        req.onerror = (e) => reject(e.target.error);
      };
      
      processNext();
    } catch (e) {
      reject(e);
    }
  });
}

// Prune transactions older than 4 days
export function pruneOldLocalTransactions() {
  return new Promise((resolve, reject) => {
    try {
      const store = getStore("transactions", "readwrite");
      const pruneDate = new Date();
      pruneDate.setDate(pruneDate.getDate() - 4);
      
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const tx = cursor.value;
          if (new Date(tx.timestamp) < pruneDate && tx.synced !== false) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = (e) => reject(e.target.error);
    } catch (e) {
      reject(e);
    }
  });
}
