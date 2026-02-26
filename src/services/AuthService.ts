import { config } from "@/config/llapiy-config";
import { apiGet, apiPost, unwrapData } from "@/lib/llapiy-api";

export type UnknownRecord = Record<string, unknown>;

export const AuthService = {
  async login(credentials: Record<string, any>) {
    const response = await apiPost(config.endpoints.auth.login, credentials);
    return unwrapData(response);
  },

  async logout() {
    try {
      const token = localStorage.getItem("llapiy_auth_token");
      if (token) {
        await apiPost(config.endpoints.auth.logout, null);
      }
    } finally {
      localStorage.removeItem("llapiy_authenticated");
      localStorage.removeItem("llapiy_auth_token");
      localStorage.removeItem("llapiy_auth_payload");
      localStorage.removeItem("llapiy_auth_session_cache");
    }
  },

  async getMe() {
    const response = await apiGet<UnknownRecord>(config.endpoints.auth.me);
    return unwrapData(response);
  }
};
