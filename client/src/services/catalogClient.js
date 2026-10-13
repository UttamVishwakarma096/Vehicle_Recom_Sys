import { apiClient } from "./apiClient.js";

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

export const catalogClient = {
  async listVehicles(params = {}) {
    const qs = buildQueryString(params);
    return await apiClient.get(`/api/v1/vehicles${qs}`);
  },

  async getVehicle(vehicleId) {
    const data = await apiClient.get(`/api/v1/vehicles/${encodeURIComponent(vehicleId)}`);
    return data?.vehicle ?? data;
  },

  async adminListVehicles(params = {}) {
    const qs = buildQueryString(params);
    return await apiClient.get(`/api/v1/admin/vehicles${qs}`);
  },

  async adminCreateVehicle(payload) {
    const data = await apiClient.post("/api/v1/admin/vehicles", payload);
    return data?.vehicle ?? data;
  },

  async adminUpdateVehicle(vehicleId, payload) {
    const data = await apiClient.patch(
      `/api/v1/admin/vehicles/${encodeURIComponent(vehicleId)}`,
      payload,
    );
    return data?.vehicle ?? data;
  },

  async adminUpdateStatus(vehicleId, status) {
    const data = await apiClient.patch(
      `/api/v1/admin/vehicles/${encodeURIComponent(vehicleId)}/status`,
      { status },
    );
    return data?.vehicle ?? data;
  },

  async adminDeleteVehicle(vehicleId) {
    return await apiClient.delete(`/api/v1/admin/vehicles/${encodeURIComponent(vehicleId)}`);
  },
};
