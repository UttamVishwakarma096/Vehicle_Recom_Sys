const LEGACY_STORAGE_KEY = "vehicle_compare_ids";
const LEGACY_VERDICT_STORAGE_KEY = "vehicle_compare_verdict";
const MAX_COMPARE_LIMIT = 4;

let currentActiveUserId = null;

function getStorage() {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

export function setCompareStorageUser(userId) {
  currentActiveUserId = userId ? String(userId) : null;
  const storage = getStorage();
  if (storage) {
    try {
      // Purge legacy un-scoped keys so stale data never leaks across users
      storage.removeItem(LEGACY_STORAGE_KEY);
      storage.removeItem(LEGACY_VERDICT_STORAGE_KEY);
      if (currentActiveUserId) {
        storage.setItem("vehicle_active_user_id", currentActiveUserId);
      } else {
        storage.removeItem("vehicle_active_user_id");
      }
    } catch {
      // Ignore storage errors
    }
  }
}

function getActiveUserId(userIdArg) {
  if (userIdArg !== undefined && userIdArg !== null) {
    return String(userIdArg);
  }
  if (currentActiveUserId) {
    return currentActiveUserId;
  }
  const storage = getStorage();
  if (storage) {
    try {
      return storage.getItem("vehicle_active_user_id") || null;
    } catch {
      return null;
    }
  }
  return null;
}

function getCompareStorageKey(userIdArg) {
  const uid = getActiveUserId(userIdArg);
  return uid ? `vehicle_compare_ids_${uid}` : "vehicle_compare_ids_guest";
}

function getVerdictStorageKey(userIdArg) {
  const uid = getActiveUserId(userIdArg);
  return uid ? `vehicle_compare_verdict_${uid}` : "vehicle_compare_verdict_guest";
}

export function getStoredCompareIds(userIdArg) {
  const storage = getStorage();
  if (!storage) return [];

  try {
    // Clean legacy global key if still present
    if (storage.getItem(LEGACY_STORAGE_KEY)) {
      storage.removeItem(LEGACY_STORAGE_KEY);
    }
    if (storage.getItem(LEGACY_VERDICT_STORAGE_KEY)) {
      storage.removeItem(LEGACY_VERDICT_STORAGE_KEY);
    }

    const key = getCompareStorageKey(userIdArg);
    const raw = storage.getItem(key);
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

export function saveStoredCompareIds(ids, userIdArg) {
  const storage = getStorage();
  if (!storage) return;

  try {
    const key = getCompareStorageKey(userIdArg);
    if (!Array.isArray(ids) || ids.length === 0) {
      storage.removeItem(key);
      return;
    }
    const clean = Array.from(
      new Set(ids.filter((id) => typeof id === "string" && id.trim().length > 0))
    ).slice(0, MAX_COMPARE_LIMIT);

    if (clean.length === 0) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, JSON.stringify(clean));
    }
  } catch {
    // Gracefully ignore storage quota / access issues
  }
}

export function clearStoredCompareIds(userIdArg) {
  const storage = getStorage();
  if (!storage) return;

  try {
    const key = getCompareStorageKey(userIdArg);
    const verdictKey = getVerdictStorageKey(userIdArg);
    storage.removeItem(key);
    storage.removeItem(verdictKey);
    storage.removeItem(LEGACY_STORAGE_KEY);
    storage.removeItem(LEGACY_VERDICT_STORAGE_KEY);
  } catch {
    // Gracefully ignore
  }
}

export function addVehicleToCompare(vehicleId, userIdArg) {
  if (!vehicleId || typeof vehicleId !== "string") {
    return getStoredCompareIds(userIdArg);
  }
  const current = getStoredCompareIds(userIdArg);
  if (current.includes(vehicleId)) {
    return current;
  }
  if (current.length >= MAX_COMPARE_LIMIT) {
    return current;
  }
  const next = [...current, vehicleId];
  saveStoredCompareIds(next, userIdArg);
  return next;
}

export function removeVehicleFromCompare(vehicleId, userIdArg) {
  const current = getStoredCompareIds(userIdArg);
  const next = current.filter((id) => id !== vehicleId);
  saveStoredCompareIds(next, userIdArg);
  return next;
}

export function getStoredVerdict(currentVehicleIds = [], userIdArg) {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const verdictKey = getVerdictStorageKey(userIdArg);
    const raw = storage.getItem(verdictKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.conclusion || !Array.isArray(parsed.vehicleIds)) {
      return null;
    }
    if (Array.isArray(currentVehicleIds) && currentVehicleIds.length > 0) {
      const storedSorted = [...parsed.vehicleIds].sort().join(",");
      const currentSorted = [...currentVehicleIds].sort().join(",");
      if (storedSorted !== currentSorted) {
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredVerdict(
  {
    vehicleIds,
    conclusion,
    userPreferences = "",
    appliedPreferences = "",
  },
  userIdArg
) {
  const storage = getStorage();
  if (!storage) return;

  try {
    const verdictKey = getVerdictStorageKey(userIdArg);
    if (!conclusion || !Array.isArray(vehicleIds) || vehicleIds.length === 0) {
      storage.removeItem(verdictKey);
      return;
    }
    storage.setItem(
      verdictKey,
      JSON.stringify({
        vehicleIds,
        conclusion,
        userPreferences,
        appliedPreferences,
        timestamp: Date.now(),
      })
    );
  } catch {
    // Gracefully ignore storage quota / access issues
  }
}

export function clearStoredVerdict(userIdArg) {
  const storage = getStorage();
  if (!storage) return;

  try {
    const verdictKey = getVerdictStorageKey(userIdArg);
    storage.removeItem(verdictKey);
    storage.removeItem(LEGACY_VERDICT_STORAGE_KEY);
  } catch {
    // Gracefully ignore
  }
}
