import { config, withId } from "@/config/llapiy-config";
import { apiDelete, apiGet, apiPost, apiPut, unwrapData } from "@/lib/llapiy-api";

export const MetadataService = {
  // Campos
  async getCampos(search?: string, page?: number) {
    const response = await apiGet<any>(config.endpoints.campos.list, { search, page });
    return unwrapData(response);
  },

  async createCampo(data: any) {
    return apiPost(config.endpoints.campos.create, data);
  },

  async updateCampo(id: number, data: any) {
    return apiPut(withId(config.endpoints.campos.update, id), data);
  },

  async deleteCampo(id: number) {
    return apiDelete(withId(config.endpoints.campos.delete, id));
  },

  // Tipos de Documentos
  async getDocumentTypes(filters: any, page: number) {
    const response = await apiGet<any>(config.endpoints.documentTypes.list, { ...filters, page });
    return unwrapData(response);
  },

  async createDocumentType(data: any) {
    return apiPost(config.endpoints.documentTypes.create, data);
  },

  async updateDocumentType(id: number, data: any) {
    return apiPut(withId(config.endpoints.documentTypes.update, id), data);
  },

  async deleteDocumentType(id: number) {
    return apiDelete(withId(config.endpoints.documentTypes.delete, id));
  },

  // Tipos de Grupos
  async getGroupTypes(search?: string, page?: number) {
    const response = await apiGet<any>(config.endpoints.groupTypes.list, { search, page });
    return unwrapData(response);
  },

  async createGroupType(data: any) {
    return apiPost(config.endpoints.groupTypes.create, data);
  },

  async updateGroupType(id: number, data: any) {
    return apiPut(withId(config.endpoints.groupTypes.update, id), data);
  },

  async deleteGroupType(id: number) {
    return apiDelete(withId(config.endpoints.groupTypes.delete, id));
  }
};
