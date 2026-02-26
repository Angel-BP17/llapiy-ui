import { config, withId } from "@/config/llapiy-config";
import { apiDelete, apiGet, apiPost, apiPut, unwrapData } from "@/lib/llapiy-api";

export const RoleService = {
  async getAll(search?: string, page?: number) {
    const response = await apiGet<any>(config.endpoints.roles.list, { search, page });
    return unwrapData(response);
  },

  async getPermissions() {
    const response = await apiGet<any>(config.endpoints.permissions.list);
    return unwrapData(response);
  },

  async create(data: { name: string; permissions: string[] }) {
    return apiPost(config.endpoints.roles.create, data);
  },

  async update(id: number, data: { name: string; permissions: string[] }) {
    return apiPut(withId(config.endpoints.roles.update, id), data);
  },

  async delete(id: number) {
    return apiDelete(withId(config.endpoints.roles.delete, id));
  }
};
