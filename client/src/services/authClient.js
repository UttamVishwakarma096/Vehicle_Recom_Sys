import { apiClient } from "./apiClient.js";

export const authClient = {
  async login({ email, password }) {
    const data = await apiClient.post("/api/v1/auth/login", { email, password });
    if (data?.csrfToken) {
      apiClient.setCsrfToken(data.csrfToken);
    }
    return data;
  },

  async register({ email, password, displayName, profile = {} }) {
    const resolvedName = displayName || profile?.displayName;
    const payload = {
      email,
      password,
    };
    if (resolvedName) {
      payload.displayName = resolvedName;
    }
    const data = await apiClient.post("/api/v1/auth/register", payload);
    if (data?.csrfToken) {
      apiClient.setCsrfToken(data.csrfToken);
    }
    return data;
  },

  async getMe() {
    const data = await apiClient.get("/api/v1/auth/me");
    if (data?.csrfToken) {
      apiClient.setCsrfToken(data.csrfToken);
    }
    return data;
  },

  async refresh() {
    const data = await apiClient.post("/api/v1/auth/refresh");
    if (data?.csrfToken) {
      apiClient.setCsrfToken(data.csrfToken);
    }
    return data;
  },

  async logout() {
    try {
      await apiClient.post("/api/v1/auth/logout");
    } finally {
      apiClient.setCsrfToken(null);
    }
  },

  async getPreferences() {
    const data = await apiClient.get("/api/v1/users/me/preferences");
    return data?.preferences || {};
  },

  async updatePreferences(preferences) {
    const data = await apiClient.put("/api/v1/users/me/preferences", { preferences });
    return data?.preferences || {};
  },
};
