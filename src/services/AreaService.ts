import { config, withId } from "@/config/llapiy-config";
import { apiDelete, apiGet, apiPost, apiPut, toList, unwrapData } from "@/lib/llapiy-api";

export const AreaService = {
  async getFullStructure() {
    const [areasResponse, groupTypesResponse] = await Promise.all([
      apiGet<any>(config.endpoints.areas.list),
      apiGet<any>(config.endpoints.groupTypes.list)
    ]);

    const areasData = unwrapData(areasResponse);
    const typesData = unwrapData(groupTypesResponse);

    const areas = toList<any>(areasData?.areas).map((area) => ({
      id: Number(area?.id ?? 0),
      descripcion: String(area?.descripcion ?? ""),
      abreviacion: String(area?.abreviacion ?? "")
    }));

    const groups: any[] = [];
    const subgroups: any[] = [];

    toList<any>(areasData?.areas).forEach((area) => {
      toList<any>(area?.groups).forEach((group) => {
        groups.push({
          id: Number(group?.id ?? 0),
          area_id: Number(area?.id ?? 0),
          group_type_id: Number(group?.area_group_type?.group_type?.id ?? 0),
          descripcion: String(group?.descripcion ?? ""),
          abreviacion: String(group?.abreviacion ?? "")
        });

        toList<any>(group?.subgroups).forEach((subgroup) => {
          subgroups.push({
            id: Number(subgroup?.id ?? 0),
            group_id: Number(group?.id ?? 0),
            descripcion: String(subgroup?.descripcion ?? ""),
            abreviacion: String(subgroup?.abreviacion ?? ""),
            parent_subgroup_id: Number(subgroup?.parent_subgroup_id ?? 0) || null
          });
        });
      });
    });

    const groupTypes = toList<any>(typesData?.groupTypes).map((item) => ({
      id: Number(item?.id ?? 0),
      descripcion: String(item?.descripcion ?? "")
    }));

    return { areas, groups, subgroups, groupTypes };
  },

  async createArea(data: { descripcion: string; abreviacion?: string }) {
    return apiPost(config.endpoints.areas.create, data);
  },

  async updateArea(id: number, data: { descripcion: string; abreviacion?: string }) {
    return apiPut(withId(config.endpoints.areas.update, id), data);
  },

  async deleteArea(id: number) {
    return apiDelete(withId(config.endpoints.areas.delete, id));
  },

  async createGroup(data: { area_id: number; group_type_id: number; descripcion: string; abreviacion?: string }) {
    return apiPost(config.endpoints.groups.create, data);
  },

  async updateGroup(id: number, data: { descripcion: string; abreviacion?: string }) {
    return apiPut(withId(config.endpoints.groups.update, id), data);
  },

  async deleteGroup(id: number) {
    return apiDelete(withId(config.endpoints.groups.delete, id));
  },

  async createSubgroup(data: { group_id: number; descripcion: string; abreviacion?: string; parent_subgroup_id?: number }) {
    return apiPost(config.endpoints.subgroups.create, data);
  },

  async deleteSubgroup(id: number) {
    return apiDelete(withId(config.endpoints.subgroups.delete, id));
  }
};
