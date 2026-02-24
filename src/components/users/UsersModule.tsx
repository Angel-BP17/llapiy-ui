import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { config, withId } from "@/config/llapiy-config";
import { apiDelete, apiGet, apiPost, apiPut, downloadWebReport, getPaginationMeta, toList, unwrapData, type PaginationMeta } from "@/lib/llapiy-api";
import { Building2, Eye, FileDown, Pencil, Shield, Trash2, UserPlus, Users } from "lucide-react";

type SimpleOption = {
  id: number;
  descripcion: string;
};

type GroupTypeOption = {
  id: number;
  descripcion: string;
};

type GroupOption = {
  id: number;
  descripcion: string;
  subgroups: SimpleOption[];
};

type AreaGroupType = {
  id: number;
  group_type: GroupTypeOption;
  groups: GroupOption[];
};

type AreaOption = {
  id: number;
  descripcion: string;
  area_group_types: AreaGroupType[];
};

type UserRecord = {
  id: number;
  name: string;
  last_name: string;
  user_name: string;
  email: string;
  dni: string;
  foto: string;
  roles: string[];
  areaId: number | null;
  groupTypeId: number | null;
  groupId: number | null;
  subgroupId: number | null;
};

type UserForm = {
  name: string;
  last_name: string;
  user_name: string;
  email: string;
  dni: string;
  password: string;
  password_confirmation: string;
  roles: string[];
  areaId: string;
  groupTypeId: string;
  groupId: string;
  subgroupId: string;
  foto: string;
};

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
};

const defaultAvatar = "/default-avatar.png";

const roleCatalog: { name: string; label: string }[] = [];
const areasCatalog: AreaOption[] = [];

const emptyForm: UserForm = {
  name: "",
  last_name: "",
  user_name: "",
  email: "",
  dni: "",
  password: "",
  password_confirmation: "",
  roles: [],
  areaId: "",
  groupTypeId: "",
  groupId: "",
  subgroupId: "",
  foto: defaultAvatar,
};
const emptyPagination: PaginationMeta = { currentPage: 1, lastPage: 1, perPage: 0, total: 0, from: 0, to: 0 };

function Modal({
  open,
  title,
  onClose,
  children,
  maxWidth = "max-w-5xl",
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
      <div
        className={`max-h-[92vh] w-full overflow-hidden rounded-2xl border border-border bg-card shadow-xl ${maxWidth}`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-accent"
          >
            Cerrar
          </button>
        </div>
        <div className="max-h-[calc(92vh-72px)] overflow-y-auto px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function resolveGroupType(areaId: number | null, groupTypeId: number | null) {
  const area = areasCatalog.find((item) => item.id === areaId);
  return (
    area?.area_group_types.find((item) => item.group_type.id === groupTypeId) ??
    null
  );
}

function resolveGroup(groupType: AreaGroupType | null, groupId: number | null) {
  return groupType?.groups.find((group) => group.id === groupId) ?? null;
}

function getLocationLabels(user: UserRecord) {
  const area = areasCatalog.find((item) => item.id === user.areaId) ?? null;
  const areaGroupType = resolveGroupType(user.areaId, user.groupTypeId);
  const group = resolveGroup(areaGroupType, user.groupId);
  const subgroup =
    group?.subgroups.find((item) => item.id === user.subgroupId) ?? null;

  return {
    area: area?.descripcion ?? "Sin area",
    groupType: areaGroupType?.group_type.descripcion ?? "Sin tipo",
    group: group?.descripcion ?? "Sin grupo",
    subgroup: subgroup?.descripcion ?? "Sin subgrupo",
  };
}

function formFromUser(user: UserRecord): UserForm {
  return {
    name: user.name,
    last_name: user.last_name,
    user_name: user.user_name,
    email: user.email,
    dni: user.dni,
    password: "",
    password_confirmation: "",
    roles: [...user.roles],
    areaId: user.areaId ? String(user.areaId) : "",
    groupTypeId: user.groupTypeId ? String(user.groupTypeId) : "",
    groupId: user.groupId ? String(user.groupId) : "",
    subgroupId: user.subgroupId ? String(user.subgroupId) : "",
    foto: user.foto || defaultAvatar,
  };
}

function validateForm(form: UserForm): string | null {
  if (!form.name.trim()) return "El nombre es obligatorio.";
  if (!form.last_name.trim()) return "El apellido es obligatorio.";
  if (!form.user_name.trim()) return "El usuario es obligatorio.";
  if (!form.email.trim()) return "El correo es obligatorio.";
  if (!form.roles.length) return "Debe seleccionar al menos un rol.";
  if (form.password && form.password !== form.password_confirmation) {
    return "La confirmacion de contrasena no coincide.";
  }
  return null;
}

async function downloadUsersReport(search: string) {
  try {
    const term = search.trim();
    await downloadWebReport(
      config.endpoints.users.pdf,
      term
        ? {
            search: term,
            // Compatibilidad con el servicio actual de PDF (name) y con la vista Blade (search).
            name: term
          }
        : undefined,
      "reporte_usuarios.pdf"
    );
  } catch (error) {
    console.error("[UsersModule] Report error:", error);
    window.alert("No se pudo generar el reporte de usuarios.");
  }
}

function UserFormFields({
  form,
  onChange,
  onToggleRole,
  areaOptions,
  groupTypeOptions,
  groupOptions,
  subgroupOptions,
  onImageChange,
  submitLabel,
  errorMessage,
}: {
  form: UserForm;
  onChange: (field: keyof UserForm, value: string) => void;
  onToggleRole: (role: string) => void;
  areaOptions: AreaOption[];
  groupTypeOptions: GroupTypeOption[];
  groupOptions: GroupOption[];
  subgroupOptions: SimpleOption[];
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
  submitLabel: string;
  errorMessage: string;
}) {
  return (
    <div className="space-y-5">
      {errorMessage ? (
        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="rounded-xl border border-border bg-background p-4 lg:col-span-4">
          <h4 className="text-sm font-semibold text-foreground">
            Foto de perfil
          </h4>
          <div className="mt-4 flex flex-col items-center gap-3">
            <img
              src={form.foto || defaultAvatar}
              alt="Foto de perfil"
              className="h-32 w-32 rounded-full border border-border object-cover"
            />
            <input
              type="file"
              accept="image/*"
              onChange={onImageChange}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background p-4 lg:col-span-8">
          <h4 className="text-sm font-semibold text-foreground">
            Datos personales
          </h4>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                onChange("name", event.target.value.toUpperCase())
              }
              placeholder="Nombres"
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
            />
            <input
              type="text"
              value={form.last_name}
              onChange={(event) =>
                onChange("last_name", event.target.value.toUpperCase())
              }
              placeholder="Apellidos"
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
            />
            <input
              type="text"
              value={form.dni}
              onChange={(event) => onChange("dni", event.target.value)}
              placeholder="DNI"
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
            />
          </div>

          <h4 className="mt-5 text-sm font-semibold text-foreground">Cuenta</h4>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              type="text"
              value={form.user_name}
              onChange={(event) =>
                onChange("user_name", event.target.value.toUpperCase())
              }
              placeholder="Usuario"
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
            />
            <input
              type="email"
              value={form.email}
              onChange={(event) => onChange("email", event.target.value)}
              placeholder="Correo"
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
            />
            <input
              type="password"
              value={form.password}
              onChange={(event) => onChange("password", event.target.value)}
              placeholder="Contrasena"
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
            />
            <input
              type="password"
              value={form.password_confirmation}
              onChange={(event) =>
                onChange("password_confirmation", event.target.value)
              }
              placeholder="Confirmar contrasena"
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
            />
          </div>

          <h4 className="mt-5 text-sm font-semibold text-foreground">Roles</h4>
          <div className="mt-2 flex flex-wrap gap-3">
            {roleCatalog.map((role) => (
              <label
                key={role.name}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground"
              >
                <input
                  type="checkbox"
                  checked={form.roles.includes(role.name)}
                  onChange={() => onToggleRole(role.name)}
                  className="h-4 w-4 rounded border-border"
                />
                {role.label}
              </label>
            ))}
          </div>

          <h4 className="mt-5 text-sm font-semibold text-foreground">
            Organizacion
          </h4>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <select
              value={form.areaId}
              onChange={(event) => onChange("areaId", event.target.value)}
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
            >
              <option value="">Seleccione un area</option>
              {areaOptions.map((area) => (
                <option key={area.id} value={String(area.id)}>
                  {area.descripcion}
                </option>
              ))}
            </select>

            <select
              value={form.groupTypeId}
              onChange={(event) => onChange("groupTypeId", event.target.value)}
              disabled={!form.areaId}
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm disabled:opacity-60"
            >
              <option value="">Seleccione un tipo de grupo</option>
              {groupTypeOptions.map((groupType) => (
                <option key={groupType.id} value={String(groupType.id)}>
                  {groupType.descripcion}
                </option>
              ))}
            </select>

            <select
              value={form.groupId}
              onChange={(event) => onChange("groupId", event.target.value)}
              disabled={!form.groupTypeId}
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm disabled:opacity-60"
            >
              <option value="">Seleccione un grupo</option>
              {groupOptions.map((group) => (
                <option key={group.id} value={String(group.id)}>
                  {group.descripcion}
                </option>
              ))}
            </select>

            <select
              value={form.subgroupId}
              onChange={(event) => onChange("subgroupId", event.target.value)}
              disabled={!form.groupId}
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm disabled:opacity-60"
            >
              <option value="">Seleccione un subgrupo</option>
              {subgroupOptions.map((subgroup) => (
                <option key={subgroup.id} value={String(subgroup.id)}>
                  {subgroup.descripcion}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

export default function UsersModule() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalRolesCount, setTotalRolesCount] = useState(0);
  const [totalAreasCount, setTotalAreasCount] = useState(0);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isShowOpen, setIsShowOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [createForm, setCreateForm] = useState<UserForm>(emptyForm);
  const [editForm, setEditForm] = useState<UserForm>(emptyForm);
  const [createError, setCreateError] = useState("");
  const [editError, setEditError] = useState("");

  const loadUsers = async (search = "", page = currentPage) => {
    setIsLoading(true);
    try {
      const response = await apiGet<{
        users: { data: any[] } | any[];
        areas: any[];
        roles: any[];
        totalUsers?: number;
        totalRoles?: number;
        totalAreas?: number;
      }>(config.endpoints.users.list, {
        search: search || undefined,
        page
      });
      const data = unwrapData(response) as {
        users?: unknown;
        areas?: unknown;
        roles?: unknown;
        totalUsers?: unknown;
        totalRoles?: unknown;
        totalAreas?: unknown;
      };

      const nextAreas = toList<any>(data?.areas).map((area) => ({
        id: Number(area?.id ?? 0),
        descripcion: String(area?.descripcion ?? ""),
        area_group_types: toList<any>(area?.area_group_types).map((type) => ({
          id: Number(type?.id ?? 0),
          group_type: {
            id: Number(type?.group_type?.id ?? 0),
            descripcion: String(type?.group_type?.descripcion ?? "")
          },
          groups: toList<any>(type?.groups).map((group) => ({
            id: Number(group?.id ?? 0),
            descripcion: String(group?.descripcion ?? ""),
            subgroups: toList<any>(group?.subgroups).map((subgroup) => ({
              id: Number(subgroup?.id ?? 0),
              descripcion: String(subgroup?.descripcion ?? "")
            }))
          }))
        }))
      }));

      const nextUsers = toList<any>(data?.users).map((item) => ({
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

      const nextRoles = toList<any>(data?.roles)
        .map((role) => ({
          name: String(role?.name ?? "").toUpperCase(),
          label: String(role?.name ?? "").charAt(0).toUpperCase() + String(role?.name ?? "").slice(1).toLowerCase()
        }))
        .filter((role) => role.name);

      areasCatalog.splice(0, areasCatalog.length, ...nextAreas);
      roleCatalog.splice(0, roleCatalog.length, ...nextRoles);
      setUsers(nextUsers);
      setPagination(getPaginationMeta(data?.users));
      setTotalUsers(Number(data?.totalUsers ?? 0));
      setTotalRolesCount(Number(data?.totalRoles ?? nextRoles.length));
      setTotalAreasCount(Number(data?.totalAreas ?? nextAreas.length));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers(appliedSearch, currentPage).catch((error) => {
      console.error("[UsersModule] Load error:", error);
    });
  }, [appliedSearch, currentPage]);

  const totalPages = Math.max(1, pagination.lastPage);
  const paginatedUsers = users;

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const createGroupTypes = useMemo(() => {
    const area = areasCatalog.find(
      (item) => String(item.id) === createForm.areaId,
    );
    return area ? area.area_group_types.map((item) => item.group_type) : [];
  }, [createForm.areaId]);

  const createGroups = useMemo(() => {
    const area = areasCatalog.find(
      (item) => String(item.id) === createForm.areaId,
    );
    const groupType = area?.area_group_types.find(
      (item) => String(item.group_type.id) === createForm.groupTypeId,
    );
    return groupType?.groups ?? [];
  }, [createForm.areaId, createForm.groupTypeId]);

  const createSubgroups = useMemo(() => {
    const group = createGroups.find(
      (item) => String(item.id) === createForm.groupId,
    );
    return group?.subgroups ?? [];
  }, [createGroups, createForm.groupId]);

  const editGroupTypes = useMemo(() => {
    const area = areasCatalog.find(
      (item) => String(item.id) === editForm.areaId,
    );
    return area ? area.area_group_types.map((item) => item.group_type) : [];
  }, [editForm.areaId]);

  const editGroups = useMemo(() => {
    const area = areasCatalog.find(
      (item) => String(item.id) === editForm.areaId,
    );
    const groupType = area?.area_group_types.find(
      (item) => String(item.group_type.id) === editForm.groupTypeId,
    );
    return groupType?.groups ?? [];
  }, [editForm.areaId, editForm.groupTypeId]);

  const editSubgroups = useMemo(() => {
    const group = editGroups.find(
      (item) => String(item.id) === editForm.groupId,
    );
    return group?.subgroups ?? [];
  }, [editGroups, editForm.groupId]);

  const handleCreateChange = (field: keyof UserForm, value: string) => {
    setCreateError("");
    setCreateForm((previous) => {
      const next = { ...previous, [field]: value };
      if (field === "areaId") {
        next.groupTypeId = "";
        next.groupId = "";
        next.subgroupId = "";
      }
      if (field === "groupTypeId") {
        next.groupId = "";
        next.subgroupId = "";
      }
      if (field === "groupId") {
        next.subgroupId = "";
      }
      return next;
    });
  };

  const handleEditChange = (field: keyof UserForm, value: string) => {
    setEditError("");
    setEditForm((previous) => {
      const next = { ...previous, [field]: value };
      if (field === "areaId") {
        next.groupTypeId = "";
        next.groupId = "";
        next.subgroupId = "";
      }
      if (field === "groupTypeId") {
        next.groupId = "";
        next.subgroupId = "";
      }
      if (field === "groupId") {
        next.subgroupId = "";
      }
      return next;
    });
  };

  const handleCreateRoleToggle = (role: string) => {
    setCreateForm((previous) => {
      const hasRole = previous.roles.includes(role);
      return {
        ...previous,
        roles: hasRole
          ? previous.roles.filter((item) => item !== role)
          : [...previous.roles, role],
      };
    });
  };

  const handleEditRoleToggle = (role: string) => {
    setEditForm((previous) => {
      const hasRole = previous.roles.includes(role);
      return {
        ...previous,
        roles: hasRole
          ? previous.roles.filter((item) => item !== role)
          : [...previous.roles, role],
      };
    });
  };

  const onCreateImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setCreateForm((previous) => ({ ...previous, foto: preview }));
  };

  const onEditImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setEditForm((previous) => ({ ...previous, foto: preview }));
  };

  const handleCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateForm(createForm);
    if (validation) {
      setCreateError(validation);
      return;
    }

    void (async () => {
      try {
        await apiPost(config.endpoints.users.create, {
          name: createForm.name.trim(),
          last_name: createForm.last_name.trim(),
          user_name: createForm.user_name.trim(),
          email: createForm.email.trim() || undefined,
          dni: createForm.dni.trim(),
          password: createForm.password,
          group_id: createForm.groupId ? Number(createForm.groupId) : undefined,
          subgroup_id: createForm.subgroupId ? Number(createForm.subgroupId) : undefined,
          roles: createForm.roles
        });
        await loadUsers(appliedSearch, currentPage);
        setCreateForm(emptyForm);
        setCreateError("");
        setIsCreateOpen(false);
      } catch (apiError: unknown) {
        const message =
          typeof apiError === "object" &&
          apiError !== null &&
          "message" in apiError &&
          typeof (apiError as { message?: unknown }).message === "string"
            ? (apiError as { message: string }).message
            : "No se pudo crear el usuario.";
        setCreateError(message);
      }
    })();
  };

  const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUser) return;

    const validation = validateForm(editForm);
    if (validation) {
      setEditError(validation);
      return;
    }

    void (async () => {
      try {
        await apiPut(withId(config.endpoints.users.update, selectedUser.id), {
          name: editForm.name.trim(),
          last_name: editForm.last_name.trim(),
          user_name: editForm.user_name.trim(),
          email: editForm.email.trim(),
          dni: editForm.dni.trim(),
          password: editForm.password || undefined,
          group: editForm.groupId ? Number(editForm.groupId) : undefined,
          subgroup: editForm.subgroupId ? Number(editForm.subgroupId) : undefined,
          roles: editForm.roles
        });
        await loadUsers(appliedSearch, currentPage);
        setIsEditOpen(false);
        setSelectedUser(null);
        setEditError("");
      } catch (apiError: unknown) {
        const message =
          typeof apiError === "object" &&
          apiError !== null &&
          "message" in apiError &&
          typeof (apiError as { message?: unknown }).message === "string"
            ? (apiError as { message: string }).message
            : "No se pudo actualizar el usuario.";
        setEditError(message);
      }
    })();
  };

  const openShowModal = (user: UserRecord) => {
    setSelectedUser(user);
    setIsShowOpen(true);
  };

  const openEditModal = (user: UserRecord) => {
    setSelectedUser(user);
    setEditForm(formFromUser(user));
    setEditError("");
    setIsEditOpen(true);
  };

  const handleDelete = (user: UserRecord) => {
    const confirmed = window.confirm(
      `Eliminar al usuario ${user.name} ${user.last_name}?`,
    );
    if (!confirmed) return;
    void (async () => {
      try {
        await apiDelete(withId(config.endpoints.users.delete, user.id));
        await loadUsers(appliedSearch, currentPage);
      } catch (error) {
        console.error("[UsersModule] Delete error:", error);
        window.alert("No se pudo eliminar el usuario.");
      }
    })();
  };

  const selectedLabels = selectedUser ? getLocationLabels(selectedUser) : null;
  const userStats = [
    {
      label: "Total de usuarios",
      value: totalUsers,
      icon: Users,
      toneClass: "bg-violet-100 text-violet-600"
    },
    {
      label: "Roles disponibles",
      value: totalRolesCount,
      icon: Shield,
      toneClass: "bg-emerald-100 text-emerald-600"
    },
    {
      label: "Areas registradas",
      value: totalAreasCount,
      icon: Building2,
      toneClass: "bg-amber-100 text-amber-600"
    }
  ];

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-border bg-gradient-to-r from-slate-900 to-slate-700 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">
              Gestion de usuarios
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Administracion de cuentas
            </h2>
            <p className="mt-1 text-sm text-white/75">
              Controla usuarios, roles y organizacion desde un mismo panel.
            </p>
          </div>
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
            {isLoading ? (
              <span className="inline-block h-4 w-16 animate-pulse rounded-full bg-white/30" />
            ) : (
              `${pagination.total} registros`
            )}
          </span>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {userStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.label} className="group rounded-xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.toneClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <div className="mt-1 h-8">
                    {isLoading ? (
                      <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
                    ) : (
                      <p className="text-2xl font-semibold leading-8 text-foreground">{stat.value}</p>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full lg:max-w-xl">
            <label
              htmlFor="users-search"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Buscar
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="users-search"
                type="text"
                placeholder="Nombre, apellido, usuario o correo"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  setAppliedSearch(searchValue);
                  setCurrentPage(1);
                }}
                className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
              >
                Aplicar filtros
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchValue("");
                  setAppliedSearch("");
                  setCurrentPage(1);
                }}
                className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground"
              >
                Limpiar
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setCreateForm(emptyForm);
                setCreateError("");
                setIsCreateOpen(true);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white"
            >
              <UserPlus className="h-4 w-4" />
              Crear usuario
            </button>
            <button
              type="button"
              onClick={() => void downloadUsersReport(appliedSearch)}
              disabled={!pagination.total}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileDown className="h-4 w-4" />
              Generar reporte
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/60">
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Apellido</th>
                <th className="px-4 py-3">Foto</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`users-loading-${index}`} className="border-t border-border">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-8 animate-pulse rounded bg-muted/70" />
                    </td>
                  </tr>
                ))
              ) : paginatedUsers.length ? (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="border-t border-border">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {user.id}
                    </td>
                    <td className="px-4 py-3">{user.name}</td>
                    <td className="px-4 py-3">{user.last_name}</td>
                    <td className="px-4 py-3">
                      <img
                        src={user.foto || defaultAvatar}
                        alt={`Foto de ${user.name}`}
                        className="h-9 w-9 rounded-full border border-border object-cover"
                      />
                    </td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openShowModal(user)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(user)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No se encontraron usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
        <p className="text-muted-foreground">
          Mostrando {paginatedUsers.length} de {pagination.total} usuarios
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-xs text-muted-foreground">
            Pagina {currentPage} de {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() =>
              setCurrentPage((page) => Math.min(totalPages, page + 1))
            }
            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>

      <Modal
        open={isCreateOpen}
        title="Crear usuario"
        onClose={() => setIsCreateOpen(false)}
      >
        <form onSubmit={handleCreateSubmit}>
          <UserFormFields
            form={createForm}
            onChange={handleCreateChange}
            onToggleRole={handleCreateRoleToggle}
            areaOptions={areasCatalog}
            groupTypeOptions={createGroupTypes}
            groupOptions={createGroups}
            subgroupOptions={createSubgroups}
            onImageChange={onCreateImageChange}
            submitLabel="Guardar"
            errorMessage={createError}
          />
        </form>
      </Modal>

      <Modal
        open={isEditOpen}
        title="Editar usuario"
        onClose={() => setIsEditOpen(false)}
      >
        <form onSubmit={handleEditSubmit}>
          <UserFormFields
            form={editForm}
            onChange={handleEditChange}
            onToggleRole={handleEditRoleToggle}
            areaOptions={areasCatalog}
            groupTypeOptions={editGroupTypes}
            groupOptions={editGroups}
            subgroupOptions={editSubgroups}
            onImageChange={onEditImageChange}
            submitLabel="Actualizar"
            errorMessage={editError}
          />
        </form>
      </Modal>

      <Modal
        open={isShowOpen}
        title="Detalle de usuario"
        onClose={() => setIsShowOpen(false)}
        maxWidth="max-w-3xl"
      >
        {selectedUser && selectedLabels ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={selectedUser.foto || defaultAvatar}
                alt={`Foto de ${selectedUser.name}`}
                className="h-16 w-16 rounded-full border border-border object-cover"
              />
              <div>
                <h4 className="text-lg font-semibold text-foreground">
                  {selectedUser.name} {selectedUser.last_name}
                </h4>
                <p className="text-sm text-muted-foreground">
                  @{selectedUser.user_name}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <p className="text-xs text-muted-foreground">Correo</p>
                <p className="text-sm font-semibold text-foreground">
                  {selectedUser.email}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <p className="text-xs text-muted-foreground">DNI</p>
                <p className="text-sm font-semibold text-foreground">
                  {selectedUser.dni || "Sin DNI"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <p className="text-xs text-muted-foreground">Area</p>
                <p className="text-sm font-semibold text-foreground">
                  {selectedLabels.area}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <p className="text-xs text-muted-foreground">Tipo de grupo</p>
                <p className="text-sm font-semibold text-foreground">
                  {selectedLabels.groupType}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <p className="text-xs text-muted-foreground">Grupo</p>
                <p className="text-sm font-semibold text-foreground">
                  {selectedLabels.group}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <p className="text-xs text-muted-foreground">Subgrupo</p>
                <p className="text-sm font-semibold text-foreground">
                  {selectedLabels.subgroup}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">Roles</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedUser.roles.length ? (
                  selectedUser.roles.map((role) => {
                    const roleLabel =
                      roleCatalog.find((item) => item.name === role)?.label ??
                      role;
                    return (
                      <span
                        key={role}
                        className="rounded-full border border-border bg-card px-2 py-1 text-xs text-foreground"
                      >
                        {roleLabel}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Sin roles
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
