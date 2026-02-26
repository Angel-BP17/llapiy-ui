import { config, withId } from "@/config/llapiy-config";
import { apiDelete, apiGet, apiPost, apiPut, downloadWebReport, unwrapData } from "@/lib/llapiy-api";

export const ArchiveService = {
  // Documentos
  async getDocuments(filters: any, page: number) {
    const response = await apiGet<any>(config.endpoints.documents.list, { ...filters, page });
    return unwrapData(response);
  },

  async createDocument(data: any) {
    return apiPost(config.endpoints.documents.create, data);
  },

  async updateDocument(id: number, data: any) {
    return apiPut(withId(config.endpoints.documents.update, id), data);
  },

  async uploadDocumentFile(id: number, file: File) {
    const formData = new FormData();
    formData.append("root", file);
    return apiPut(withId(config.endpoints.documents.upload, id), formData);
  },

  async deleteDocument(id: number) {
    return apiDelete(withId(config.endpoints.documents.delete, id));
  },

  async downloadDocumentsReport(filters: any) {
    return downloadWebReport(config.endpoints.documents.pdf, filters, "reporte_documentos.pdf");
  },

  // Bloques
  async getBlocks(filters: any, page: number) {
    const response = await apiGet<any>(config.endpoints.blocks.list, { ...filters, page });
    return unwrapData(response);
  },

  async createBlock(data: any) {
    return apiPost(config.endpoints.blocks.create, data);
  },

  async updateBlock(id: number, data: any) {
    return apiPut(withId(config.endpoints.blocks.update, id), data);
  },

  async uploadBlockFile(id: number, file: File) {
    const formData = new FormData();
    formData.append("root", file);
    return apiPut(withId(config.endpoints.blocks.upload, id), formData);
  },

  async deleteBlock(id: number) {
    return apiDelete(withId(config.endpoints.blocks.delete, id));
  },

  async downloadBlocksReport(filters: any) {
    return downloadWebReport(config.endpoints.blocks.pdf, filters, "reporte_bloques.pdf");
  }
};
