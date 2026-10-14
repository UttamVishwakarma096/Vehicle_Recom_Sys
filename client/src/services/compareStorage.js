const STORAGE_KEY = "vehicle_compare_ids";
const MAX_COMPARE_LIMIT = 4;

function getStorage() {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

export function getStoredCompareIds() {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((id) => typeof id === "string" && id.trim().length > 0)
        .slice(0, MAX_COMPARE_LIMIT);
    }
    return [];
  } catch {
    return [];
  }
}

export function saveStoredCompareIds(ids) {
  const storage = getStorage();
  if (!storage) return;

  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      storage.removeItem(STORAGE_KEY);
      return;
    }
    const clean = Array.from(
      new Set(ids.filter((id) => typeof id === "string" && id.trim().length > 0))
    ).slice(0, MAX_COMPARE_LIMIT);

    if (clean.length === 0) {
      storage.removeItem(STORAGE_KEY);
    } else {
      storage.setItem(STORAGE_KEY, JSON.stringify(clean));
    }
  } catch {
    // Gracefully ignore storage quota / access issues
  }
}

export function clearStoredCompareIds() {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Gracefully ignore
  }
}

export function addVehicleToCompare(vehicleId) {
  if (!vehicleId || typeof vehicleId !== "string") {
    return getStoredCompareIds();
  }
  const current = getStoredCompareIds();
  if (current.includes(vehicleId)) {
    return current;
  }
  if (current.length >= MAX_COMPARE_LIMIT) {
    return current;
  }
  const next = [...current, vehicleId];
  saveStoredCompareIds(next);
  return next;
}

export function removeVehicleFromCompare(vehicleId) {
  const current = getStoredCompareIds();
  const next = current.filter((id) => id !== vehicleId);
  saveStoredCompareIds(next);
  return next;
}
