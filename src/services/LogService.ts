import { config } from "@/config/llapiy-config";
import { apiGet, unwrapData, downloadWebReport } from "@/lib/llapiy-api";

export const LogService = {
  async getAll(filters: any, page: number) {
    const response = await apiGet<any>(config.endpoints.activityLogs.list, {
      ...filters,
      page
    });
    return unwrapData(response);
  },

  async downloadReport(filters: any) {
    return downloadWebReport(
      config.endpoints.activityLogs.pdf,
      filters,
      "reporte_actividades.pdf"
    );
  }
};
