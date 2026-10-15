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

export const adminUsersClient = {
  async listUsers(params = {}) {
    const qs = buildQueryString(params);
    return await apiClient.get(`/api/v1/admin/users${qs}`);
  },

  async updateUser(userId, payload) {
    const data = await apiClient.patch(
      `/api/v1/admin/users/${encodeURIComponent(userId)}`,
      payload,
    );
    return data?.user ?? data;
  },

  async deleteUser(userId) {
    return await apiClient.delete(
      `/api/v1/admin/users/${encodeURIComponent(userId)}`,
    );
  },
};
