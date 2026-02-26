import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { getPaginationMeta } from "@/lib/llapiy-api";
import { 
  Building2, 
  FileDown, 
  Shield, 
  UserPlus, 
  Users 
} from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { 
  type UserRecord, 
  type UserForm, 
  type AreaOption, 
  type RoleOption, 
  type AreaGroupType,
  emptyForm, 
  defaultAvatar 
} from "./users-types";
import { UserFormFields } from "./UserFormFields";
import { UserTable } from "./UserTable";
import { UserStatsGrid } from "./UserStats";
import { UserService } from "@/services/UserService";

const roleCatalog: RoleOption[] = [];
const areasCatalog: AreaOption[] = [];

const emptyPagination = { 
  currentPage: 1, 
  lastPage: 1, 
  perPage: 0, 
  total: 0, 
  from: 0, 
  to: 0 
};

function resolveGroupType(areas: AreaOption[], areaId: number | null, groupTypeId: number | null) {
  const area = areas.find((item) => item.id === areaId);
  return (
    area?.area_group_types.find((item) => item.group_type.id === groupTypeId) ??
    null
  );
}

function resolveGroup(groupType: AreaGroupType | null, groupId: number | null) {
  return groupType?.groups.find((group) => group.id === groupId) ?? null;
}

function getLocationLabels(areas: AreaOption[], user: UserRecord) {
  const area = areas.find((item) => item.id === user.areaId) ?? null;
  const areaGroupType = resolveGroupType(areas, user.areaId, user.groupTypeId);
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

export default function UsersModule() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(emptyPagination);
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
      const data = await UserService.getAll(search, page);
      
      areasCatalog.splice(0, areasCatalog.length, ...data.areas);
      roleCatalog.splice(0, roleCatalog.length, ...data.roles);
      
      setUsers(data.users);
      setPagination(getPaginationMeta(data.pagination));
      setTotalUsers(data.totalUsers);
      setTotalRolesCount(data.totalRoles);
      setTotalAreasCount(data.totalAreas);
    } catch (error) {
      console.error("[UsersModule] Load error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers(appliedSearch, currentPage);
  }, [appliedSearch, currentPage]);

  const totalPages = Math.max(1, pagination.lastPage);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const createGroupTypes = useMemo(() => {
    const area = areasCatalog.find((item) => String(item.id) === createForm.areaId);
    return area ? area.area_group_types.map((item) => item.group_type) : [];
  }, [createForm.areaId]);

  const createGroups = useMemo(() => {
    const area = areasCatalog.find((item) => String(item.id) === createForm.areaId);
    const groupType = area?.area_group_types.find((item) => String(item.group_type.id) === createForm.groupTypeId);
    return groupType?.groups ?? [];
  }, [createForm.areaId, createForm.groupTypeId]);

  const createSubgroups = useMemo(() => {
    const group = createGroups.find((item) => String(item.id) === createForm.groupId);
    return group?.subgroups ?? [];
  }, [createGroups, createForm.groupId]);

  const editGroupTypes = useMemo(() => {
    const area = areasCatalog.find((item) => String(item.id) === editForm.areaId);
    return area ? area.area_group_types.map((item) => item.group_type) : [];
  }, [editForm.areaId]);

  const editGroups = useMemo(() => {
    const area = areasCatalog.find((item) => String(item.id) === editForm.areaId);
    const groupType = area?.area_group_types.find((item) => String(item.group_type.id) === editForm.groupTypeId);
    return groupType?.groups ?? [];
  }, [editForm.areaId, editForm.groupTypeId]);

  const editSubgroups = useMemo(() => {
    const group = editGroups.find((item) => String(item.id) === editForm.groupId);
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
        await UserService.create(createForm);
        await loadUsers(appliedSearch, currentPage);
        setCreateForm(emptyForm);
        setCreateError("");
        setIsCreateOpen(false);
      } catch (apiError: any) {
        setCreateError(apiError?.message || "No se pudo crear el usuario.");
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
        await UserService.update(selectedUser.id, editForm);
        await loadUsers(appliedSearch, currentPage);
        setIsEditOpen(false);
        setSelectedUser(null);
        setEditError("");
      } catch (apiError: any) {
        setEditError(apiError?.message || "No se pudo actualizar el usuario.");
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
    const confirmed = window.confirm(`Eliminar al usuario ${user.name} ${user.last_name}?`);
    if (!confirmed) return;
    void (async () => {
      try {
        await UserService.delete(user.id);
        await loadUsers(appliedSearch, currentPage);
      } catch (error) {
        console.error("[UsersModule] Delete error:", error);
        window.alert("No se pudo eliminar el usuario.");
      }
    })();
  };

  const handleDownloadReport = () => {
    void UserService.downloadReport(appliedSearch).catch((error) => {
       console.error("[UsersModule] Report error:", error);
       window.alert("No se pudo generar el reporte.");
    });
  };

  const selectedLabels = selectedUser ? getLocationLabels(areasCatalog, selectedUser) : null;
  const userStats = [
    { label: "Total de usuarios", value: totalUsers, icon: Users, toneClass: "bg-violet-100 text-violet-600" },
    { label: "Roles disponibles", value: totalRolesCount, icon: Shield, toneClass: "bg-emerald-100 text-emerald-600" },
    { label: "Areas registradas", value: totalAreasCount, icon: Building2, toneClass: "bg-amber-100 text-amber-600" }
  ];

  return (
    <div className="space-y-5">
      <UserStatsGrid stats={userStats} isLoading={isLoading} />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        {/* ... (Filtros - siempre visibles) */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full lg:max-w-xl">
            <label htmlFor="users-search" className="mb-2 block text-sm font-medium text-foreground">Buscar</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input id="users-search" type="text" placeholder="Nombre, apellido, usuario o correo" value={searchValue} onChange={(event) => setSearchValue(event.target.value)} className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm" />
              <button type="button" onClick={() => { setAppliedSearch(searchValue); setCurrentPage(1); }} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Aplicar filtros</button>
              <button type="button" onClick={() => { setSearchValue(""); setAppliedSearch(""); setCurrentPage(1); }} className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground">Limpiar</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setCreateForm(emptyForm); setCreateError(""); setIsCreateOpen(true); }} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white"><UserPlus className="h-4 w-4" />Crear usuario</button>
            <button type="button" onClick={handleDownloadReport} disabled={!pagination.total} className="inline-flex h-10 items-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"><FileDown className="h-4 w-4" />Generar reporte</button>
          </div>
        </div>
      </div>

      <UserTable users={users} isLoading={isLoading} onView={openShowModal} onEdit={openEditModal} onDelete={handleDelete} />
      
      {/* ... (Paginación y Modales) */}

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
        <p className="text-muted-foreground">Mostrando {users.length} de {pagination.total} usuarios</p>
        <div className="flex items-center gap-2">
          <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Anterior</button>
          <span className="text-xs text-muted-foreground">Pagina {currentPage} de {totalPages}</span>
          <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Siguiente</button>
        </div>
      </div>

      <Modal open={isCreateOpen} title="Crear usuario" onClose={() => setIsCreateOpen(false)}>
        <form onSubmit={handleCreateSubmit}>
          <UserFormFields form={createForm} onChange={handleCreateChange} onToggleRole={handleCreateRoleToggle} areaOptions={areasCatalog} groupTypeOptions={createGroupTypes} groupOptions={createGroups} subgroupOptions={createSubgroups} roleOptions={roleCatalog} onImageChange={onCreateImageChange} submitLabel="Guardar" errorMessage={createError} />
        </form>
      </Modal>

      <Modal open={isEditOpen} title="Editar usuario" onClose={() => setIsEditOpen(false)}>
        <form onSubmit={handleEditSubmit}>
          <UserFormFields form={editForm} onChange={handleEditChange} onToggleRole={handleEditRoleToggle} areaOptions={areasCatalog} groupTypeOptions={editGroupTypes} groupOptions={editGroups} subgroupOptions={editSubgroups} roleOptions={roleCatalog} onImageChange={onEditImageChange} submitLabel="Actualizar" errorMessage={editError} />
        </form>
      </Modal>

      <Modal open={isShowOpen} title="Detalle de usuario" onClose={() => setIsShowOpen(false)} maxWidth="max-w-3xl">
        {selectedUser && selectedLabels ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={selectedUser.foto || defaultAvatar} alt={`Foto de ${selectedUser.name}`} className="h-16 w-16 rounded-full border border-border object-cover" />
              <div>
                <h4 className="text-lg font-semibold text-foreground">{selectedUser.name} {selectedUser.last_name}</h4>
                <p className="text-sm text-muted-foreground">@{selectedUser.user_name}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-background px-3 py-2"><p className="text-xs text-muted-foreground">Correo</p><p className="text-sm font-semibold text-foreground">{selectedUser.email}</p></div>
              <div className="rounded-lg border border-border bg-background px-3 py-2"><p className="text-xs text-muted-foreground">DNI</p><p className="text-sm font-semibold text-foreground">{selectedUser.dni || "Sin DNI"}</p></div>
              <div className="rounded-lg border border-border bg-background px-3 py-2"><p className="text-xs text-muted-foreground">Area</p><p className="text-sm font-semibold text-foreground">{selectedLabels.area}</p></div>
              <div className="rounded-lg border border-border bg-background px-3 py-2"><p className="text-xs text-muted-foreground">Tipo de grupo</p><p className="text-sm font-semibold text-foreground">{selectedLabels.groupType}</p></div>
              <div className="rounded-lg border border-border bg-background px-3 py-2"><p className="text-xs text-muted-foreground">Grupo</p><p className="text-sm font-semibold text-foreground">{selectedLabels.group}</p></div>
              <div className="rounded-lg border border-border bg-background px-3 py-2"><p className="text-xs text-muted-foreground">Subgrupo</p><p className="text-sm font-semibold text-foreground">{selectedLabels.subgroup}</p></div>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">Roles</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedUser.roles.length ? selectedUser.roles.map((role) => {
                  const roleLabel = roleCatalog.find((item) => item.name === role)?.label ?? role;
                  return <span key={role} className="rounded-full border border-border bg-card px-2 py-1 text-xs text-foreground">{roleLabel}</span>;
                }) : <span className="text-sm text-muted-foreground">Sin roles</span>}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
