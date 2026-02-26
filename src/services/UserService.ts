import { config, withId } from "@/config/llapiy-config";
import { apiDelete, apiGet, apiPost, apiPut, downloadWebReport, toList, unwrapData } from "@/lib/llapiy-api";
import { type UserRecord, type UserForm, defaultAvatar } from "@/components/users/users-types";

export const UserService = {
  async getAll(search?: string, page?: number) {
    const response = await apiGet<any>(config.endpoints.users.list, { search, page });
    const data = unwrapData(response);

    const users = toList<any>(data?.users).map((item) => ({
      id: Number(item?.id ?? 0),
      name: String(item?.name ?? ""),
      last_name: String(item?.last_name ?? ""),
      user_name: String(item?.user_name ?? ""),
      email: String(item?.email ?? ""),
      dni: String(item?.dni ?? ""),
      foto: item?.foto_perfil ? `${config.webUrl}/storage/${item.foto_perfil}` : defaultAvatar,
      roles: toList<any>(item?.roles).map((role) => String(role?.name ?? "")).filter(Boolean),
      areaId: Number(item?.group?.area_group_type?.area_id ?? 0) || null,
      groupTypeId: Number(item?.group?.area_group_type?.group_type?.id ?? 0) || null,
      groupId: Number(item?.group_id ?? item?.group?.id ?? 0) || null,
      subgroupId: Number(item?.subgroup_id ?? item?.subgroup?.id ?? 0) || null
    }));

    const areas = toList<any>(data?.areas).map((area) => ({
      id: Number(area?.id ?? 0),
      descripcion: String(area?.descripcion ?? ""),
      area_group_types: toList<any>(area?.area_group_types).map((type: any) => ({
        id: Number(type?.id ?? 0),
        group_type: {
          id: Number(type?.group_type?.id ?? 0),
          descripcion: String(type?.group_type?.descripcion ?? "")
        },
        groups: toList<any>(type?.groups).map((group: any) => ({
          id: Number(group?.id ?? 0),
          descripcion: String(group?.descripcion ?? ""),
          subgroups: toList<any>(group?.subgroups).map((subgroup: any) => ({
            id: Number(subgroup?.id ?? 0),
            descripcion: String(subgroup?.descripcion ?? "")
          }))
        }))
      }))
    }));

    const roles = toList<any>(data?.roles)
      .map((role) => ({
        name: String(role?.name ?? "").toUpperCase(),
        label: String(role?.name ?? "").charAt(0).toUpperCase() + String(role?.name ?? "").slice(1).toLowerCase()
      }))
      .filter((role) => role.name);

    return {
      users,
      areas,
      roles,
      pagination: data?.users, // La meta de paginación se extrae luego con getPaginationMeta
      totalUsers: Number(data?.totalUsers ?? 0),
      totalRoles: Number(data?.totalRoles ?? roles.length),
      totalAreas: Number(data?.totalAreas ?? areas.length)
    };
  },

  async create(form: UserForm) {
    return apiPost(config.endpoints.users.create, {
      name: form.name.trim(),
      last_name: form.last_name.trim(),
      user_name: form.user_name.trim(),
      email: form.email.trim() || undefined,
      dni: form.dni.trim(),
      password: form.password,
      group_id: form.groupId ? Number(form.groupId) : undefined,
      subgroup_id: form.subgroupId ? Number(form.subgroupId) : undefined,
      roles: form.roles
    });
  },

  async update(id: number, form: UserForm) {
    return apiPut(withId(config.endpoints.users.update, id), {
      name: form.name.trim(),
      last_name: form.last_name.trim(),
      user_name: form.user_name.trim(),
      email: form.email.trim(),
      dni: form.dni.trim(),
      password: form.password || undefined,
      group_id: form.groupId ? Number(form.groupId) : undefined,
      subgroup_id: form.subgroupId ? Number(form.subgroupId) : undefined,
      roles: form.roles
    });
  },

  async delete(id: number) {
    return apiDelete(withId(config.endpoints.users.delete, id));
  },

  async downloadReport(search: string) {
    const term = search.trim();
    return downloadWebReport(
      config.endpoints.users.pdf,
      term ? { search: term, name: term } : undefined,
      "reporte_usuarios.pdf"
    );
  }
};
