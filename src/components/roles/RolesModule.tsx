import { useEffect, useMemo, useState } from "react";
import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import { config, withId } from "@/config/llapiy-config";
import { apiDelete, apiGet, apiPost, apiPut, getPaginationMeta, toList, unwrapData, type PaginationMeta } from "@/lib/llapiy-api";
import { KeyRound, Pencil, Plus, Shield, Trash2 } from "lucide-react";

type PermissionItem = { key: string; label: string };
type PermissionGroup = { module: string; moduleLabel: string; permissions: PermissionItem[] };
type RoleRecord = { id: number; name: string; permissions: string[] };
type RoleForm = { name: string; permissions: string[] };
type TemplateModule = "inbox" | "storage" | "documents" | "blocks";
type RoleTemplate = { id: string; label: string; description: string; modules: TemplateModule[] };

const roleLabels: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  admin: "Administrador"
};

const roleTemplates: RoleTemplate[] = [
  {
    id: "archivo-central",
    label: "Encargado del central de archivos",
    description: 'Acceso completo a "Bandeja de entrada", "Almacenamiento", "Documentos" y "Bloques".',
    modules: ["inbox", "storage", "documents", "blocks"]
  },
  {
    id: "colaborador",
    label: "Colaborador",
    description: 'Acceso completo a "Documentos" y "Bloques".',
    modules: ["documents", "blocks"]
  }
];

const templateModuleAliases: Record<TemplateModule, string[]> = {
  inbox: ["inbox", "bandeja", "bandeja de entrada"],
  storage: ["storage", "almacenamiento", "sections", "section", "andamios", "boxes", "box", "archivos", "archivo"],
  documents: ["documents", "documentos", "document"],
  blocks: ["blocks", "bloques", "block"]
};

const defaultPermissionGroups: PermissionGroup[] = [
  {
    module: "users",
    moduleLabel: "Usuarios",
    permissions: [
      { key: "users.index", label: "Ver usuarios" },
      { key: "users.create", label: "Crear usuarios" },
      { key: "users.update", label: "Editar usuarios" },
      { key: "users.delete", label: "Eliminar usuarios" }
    ]
  },
  {
    module: "roles",
    moduleLabel: "Roles",
    permissions: [
      { key: "roles.index", label: "Ver roles" },
      { key: "roles.create", label: "Crear roles" },
      { key: "roles.update", label: "Editar roles" },
      { key: "roles.delete", label: "Eliminar roles" }
    ]
  },
  {
    module: "documents",
    moduleLabel: "Documentos",
    permissions: [
      { key: "documents.index", label: "Ver documentos" },
      { key: "documents.create", label: "Crear documentos" },
      { key: "documents.update", label: "Editar documentos" },
      { key: "documents.delete", label: "Eliminar documentos" }
    ]
  },
  {
    module: "blocks",
    moduleLabel: "Bloques",
    permissions: [
      { key: "blocks.index", label: "Ver bloques" },
      { key: "blocks.create", label: "Crear bloques" },
      { key: "blocks.update", label: "Editar bloques" },
      { key: "blocks.delete", label: "Eliminar bloques" }
    ]
  },
  {
    module: "activity_logs",
    moduleLabel: "Registro de actividades",
    permissions: [{ key: "activity_logs.index", label: "Ver auditoria" }]
  }
];

const defaultPermissionLabelMap = new Map<string, string>(
  defaultPermissionGroups.flatMap((group) => [[group.module, group.moduleLabel], ...group.permissions.map((permission) => [permission.key, permission.label])])
);

const defaultPermissionKeys: string[] = [];
const permissionActionLabels: Record<string, string> = {
  index: "Ver",
  view: "Ver",
  list: "Ver",
  create: "Crear",
  store: "Crear",
  update: "Editar",
  edit: "Editar",
  delete: "Eliminar",
  destroy: "Eliminar",
  upload: "Subir",
  download: "Descargar",
  sign: "Firmar",
  reject: "Rechazar",
  approve: "Aprobar",
  pdf: "Exportar PDF"
};

const emptyForm: RoleForm = { name: "", permissions: [] };
const emptyPagination: PaginationMeta = { currentPage: 1, lastPage: 1, perPage: 0, total: 0, from: 0, to: 0 };

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function toTitleLabel(value: string) {
  return value
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getPermissionName(permission: unknown) {
  if (typeof permission === "string") return permission.trim();
  if (typeof permission === "object" && permission !== null) {
    const record = permission as { name?: unknown };
    if (typeof record.name === "string") return record.name.trim();
  }
  return "";
}

function extractPermissionNames(value: unknown) {
  return uniqueStrings(toList<unknown>(value).map(getPermissionName));
}

function getPermissionLabel(key: string) {
  const fromDefaults = defaultPermissionLabelMap.get(key);
  if (fromDefaults) return fromDefaults;

  const [module, ...actionParts] = key.split(".");
  if (!module || !actionParts.length) return toTitleLabel(key);

  const actionKey = actionParts.join("_").toLowerCase();
  const actionLabel = permissionActionLabels[actionKey] ?? toTitleLabel(actionParts.join(" "));
  return `${actionLabel} ${toTitleLabel(module)}`;
}

function buildPermissionGroups(permissionKeys: string[]): PermissionGroup[] {
  const grouped = new Map<string, Set<string>>();

  uniqueStrings(permissionKeys).forEach((key) => {
    const [module] = key.split(".");
    if (!module) return;
    if (!grouped.has(module)) grouped.set(module, new Set<string>());
    grouped.get(module)?.add(key);
  });

  return [...grouped.entries()]
    .map(([module, items]) => ({
      module,
      moduleLabel: defaultPermissionLabelMap.get(module) ?? toTitleLabel(module),
      permissions: [...items]
        .sort((a, b) => getPermissionLabel(a).localeCompare(getPermissionLabel(b)))
        .map((permission) => ({ key: permission, label: getPermissionLabel(permission) }))
    }))
    .sort((a, b) => a.moduleLabel.localeCompare(b.moduleLabel));
}

function normalizeModuleName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchTemplateModule(group: PermissionGroup, templateModule: TemplateModule) {
  const normalizedCandidates = [group.module, group.moduleLabel].map(normalizeModuleName);
  const aliases = templateModuleAliases[templateModule].map(normalizeModuleName);

  return normalizedCandidates.some((candidate) =>
    aliases.some((alias) => candidate === alias || candidate.startsWith(`${alias} `) || candidate.endsWith(` ${alias}`) || candidate.includes(` ${alias} `))
  );
}

function resolveTemplatePermissions(permissionGroups: PermissionGroup[], templateId: string) {
  const template = roleTemplates.find((item) => item.id === templateId);
  if (!template) return [];

  return uniqueStrings(
    permissionGroups
      .filter((group) => template.modules.some((templateModule) => matchTemplateModule(group, templateModule)))
      .flatMap((group) => group.permissions.map((permission) => permission.key))
  );
}

function Modal({
  open,
  title,
  onClose,
  children,
  maxWidth = "max-w-6xl"
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
      <div className={`max-h-[92vh] w-full overflow-hidden rounded-2xl border border-border bg-card shadow-xl ${maxWidth}`}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-accent">
            Cerrar
          </button>
        </div>
        <div className="max-h-[calc(92vh-72px)] overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

function RoleTemplateSelector({
  permissionGroups,
  onApply
}: {
  permissionGroups: PermissionGroup[];
  onApply: (permissions: string[]) => void;
}) {
  const [templateId, setTemplateId] = useState("");
  const selectedTemplate = useMemo(() => roleTemplates.find((template) => template.id === templateId) ?? null, [templateId]);
  const resolvedPermissions = useMemo(() => resolveTemplatePermissions(permissionGroups, templateId), [permissionGroups, templateId]);
  const handleTemplateChange = (nextTemplateId: string) => {
    setTemplateId(nextTemplateId);
    onApply(resolveTemplatePermissions(permissionGroups, nextTemplateId));
  };

  return (
    <div className="space-y-2 rounded-xl border border-border bg-background p-4">
      <p className="text-sm font-semibold text-foreground">Plantillas de permisos</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={templateId}
          onChange={(event) => handleTemplateChange(event.target.value)}
          className="h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm"
        >
          <option value="">Seleccionar plantilla</option>
          {roleTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!templateId}
          onClick={() => onApply(resolvedPermissions)}
          className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          Aplicar plantilla
        </button>
      </div>
      {selectedTemplate ? <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p> : null}
      {templateId ? (
        <p className="text-xs text-muted-foreground">
          {resolvedPermissions.length
            ? `Se aplicaran ${resolvedPermissions.length} permisos disponibles para esta plantilla.`
            : "No se encontraron permisos disponibles para esta plantilla en el catalogo actual."}
        </p>
      ) : null}
    </div>
  );
}

function PermissionSelector({
  selected,
  setSelected,
  permissionGroups,
  permissionLabelMap,
  allPermissionKeys
}: {
  selected: string[];
  setSelected: Dispatch<SetStateAction<string[]>>;
  permissionGroups: PermissionGroup[];
  permissionLabelMap: Map<string, string>;
  allPermissionKeys: string[];
}) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const visibleGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return permissionGroups;
    return permissionGroups.filter((group) => {
      if (group.moduleLabel.toLowerCase().includes(query) || group.module.toLowerCase().includes(query)) return true;
      return group.permissions.some((permission) => permission.label.toLowerCase().includes(query) || permission.key.toLowerCase().includes(query));
    });
  }, [search, permissionGroups]);

  const togglePermission = (key: string, checked: boolean) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (checked) next.add(key);
      else next.delete(key);
      return [...next];
    });
  };

  const toggleModule = (group: PermissionGroup, checked: boolean) => {
    setSelected((previous) => {
      const next = new Set(previous);
      const keys = group.permissions.map((permission) => permission.key);
      keys.forEach((key) => {
        if (checked) next.add(key);
        else next.delete(key);
      });
      return [...next];
    });
  };

  const removePermission = (key: string) => setSelected((previous) => previous.filter((item) => item !== key));
  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => setCollapsed(new Set(permissionGroups.map((group) => group.module)));
  const selectAll = () => setSelected(allPermissionKeys);
  const clearAll = () => setSelected([]);

  const selectedChips = selected
    .map((key) => ({ key, label: permissionLabelMap.get(key) ?? getPermissionLabel(key) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Permisos</p>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">{selected.length}</span>
          <button type="button" onClick={expandAll} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">Expandir</button>
          <button type="button" onClick={collapseAll} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">Contraer</button>
          <button type="button" onClick={selectAll} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">Todo</button>
          <button type="button" onClick={clearAll} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">Limpiar</button>
        </div>
      </div>

      <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm" placeholder="Buscar modulo o permiso" />

      <div className="rounded-lg border border-dashed border-border bg-card px-3 py-2">
        <div className="flex flex-wrap gap-1.5">
          {selectedChips.length ? (
            selectedChips.map((chip) => (
              <span key={chip.key} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-[11px] text-blue-700">
                {chip.label}
                <button type="button" onClick={() => removePermission(chip.key)} className="font-bold leading-none">
                  x
                </button>
              </span>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No hay permisos seleccionados.</span>
          )}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {visibleGroups.map((group) => {
          const actionKeys = group.permissions.map((permission) => permission.key);
          const checkedCount = actionKeys.filter((key) => selectedSet.has(key)).length;
          const moduleChecked = actionKeys.length > 0 && checkedCount === actionKeys.length;
          const moduleIndeterminate = checkedCount > 0 && checkedCount < actionKeys.length;
          const isCollapsed = collapsed.has(group.module);

          return (
            <div key={group.module} className="rounded-lg border border-border bg-card p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <input
                    type="checkbox"
                    ref={(node) => {
                      if (node) node.indeterminate = moduleIndeterminate;
                    }}
                    checked={moduleChecked}
                    onChange={(event) => toggleModule(group, event.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  {group.moduleLabel}
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((previous) => {
                      const next = new Set(previous);
                      if (next.has(group.module)) next.delete(group.module);
                      else next.add(group.module);
                      return next;
                    })
                  }
                  className="text-xs text-muted-foreground"
                >
                  {isCollapsed ? "Expandir" : "Contraer"}
                </button>
              </div>
              {!isCollapsed ? (
                <div className="space-y-1 border-t border-border pt-2">
                  {group.permissions.length ? (
                    group.permissions.map((permission) => (
                      <label key={permission.key} className="flex items-center gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={selectedSet.has(permission.key)}
                          onChange={(event) => togglePermission(permission.key, event.target.checked)}
                          className="h-4 w-4 rounded border-border"
                        />
                        {permission.label}
                      </label>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin permisos adicionales.</span>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function validateRole(form: RoleForm): string | null {
  if (!form.name.trim()) return "Ingrese el nombre del rol.";
  return null;
}

export default function RolesModule() {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<string[]>(defaultPermissionKeys);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination);
  const [totalRolesCount, setTotalRolesCount] = useState(0);
  const [totalPermissionsCount, setTotalPermissionsCount] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<RoleRecord | null>(null);
  const [createForm, setCreateForm] = useState<RoleForm>(emptyForm);
  const [editForm, setEditForm] = useState<RoleForm>(emptyForm);
  const [createError, setCreateError] = useState("");
  const [editError, setEditError] = useState("");
  const permissionGroups = useMemo(() => buildPermissionGroups(permissionCatalog), [permissionCatalog]);
  const permissionLabelMap = useMemo(
    () =>
      new Map<string, string>(
        permissionGroups.flatMap((group) => group.permissions.map((permission) => [permission.key, permission.label]))
      ),
    [permissionGroups]
  );
  const allPermissionKeys = useMemo(() => permissionGroups.flatMap((group) => group.permissions.map((permission) => permission.key)), [permissionGroups]);

  const mergePermissionCatalog = (permissionKeys: string[]) => {
    if (!permissionKeys.length) return;
    setPermissionCatalog((previous) => uniqueStrings([...previous, ...permissionKeys]));
  };

  const loadPermissionsCatalog = async () => {
    try {
      const response = await apiGet<unknown>(config.endpoints.permissions.list);
      const payload = unwrapData(response);
      const permissions =
        typeof payload === "object" && payload !== null
          ? uniqueStrings([
              ...extractPermissionNames((payload as { permissions?: unknown }).permissions),
              ...extractPermissionNames((payload as { all_permissions?: unknown }).all_permissions),
              ...extractPermissionNames((payload as { data?: unknown }).data)
            ])
          : extractPermissionNames(payload);

      mergePermissionCatalog(permissions);
    } catch {
      // Some backends do not expose a global permissions endpoint.
    }
  };

  const loadRoles = async (searchValue = "", pageValue = currentPage) => {
    setIsLoading(true);
    try {
      const response = await apiGet<{
        roles?: unknown;
        permissions?: unknown;
        all_permissions?: unknown;
        totalRoles?: number;
        totalPermissions?: number;
      }>(config.endpoints.roles.list, {
        search: searchValue || undefined,
        page: pageValue
      });
      const data = unwrapData(response) as {
        roles?: unknown;
        permissions?: unknown;
        all_permissions?: unknown;
        totalRoles?: unknown;
        totalPermissions?: unknown;
      };
      const next = toList<any>(data?.roles).map((role) => ({
        id: Number(role?.id ?? 0),
        name: String(role?.name ?? ""),
        permissions: uniqueStrings(toList<unknown>(role?.permissions).map(getPermissionName))
      }));
      setRoles(next);
      const nextPagination = getPaginationMeta(data?.roles);
      setPagination(nextPagination);
      setTotalRolesCount(Number(data?.totalRoles ?? nextPagination.total ?? 0));
      setTotalPermissionsCount(Number(data?.totalPermissions ?? 0));

      mergePermissionCatalog([
        ...next.flatMap((role) => role.permissions),
        ...extractPermissionNames(data?.permissions),
        ...extractPermissionNames(data?.all_permissions)
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPermissionsCatalog();
  }, []);

  useEffect(() => {
    void loadRoles(appliedSearch, currentPage).catch((error) => {
      console.error("[RolesModule] Load error:", error);
    });
  }, [appliedSearch, currentPage]);

  const totalPages = Math.max(1, pagination.lastPage);
  const paginatedRoles = roles;

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const openEdit = (role: RoleRecord) => {
    setSelected(role);
    setEditError("");
    setEditForm({ name: role.name, permissions: [...role.permissions] });
    setEditOpen(true);
  };

  const createRole = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateRole(createForm);
    if (error) return setCreateError(error);

    void (async () => {
      try {
        await apiPost(config.endpoints.roles.create, {
          name: createForm.name.trim().toUpperCase(),
          permissions: [...new Set(createForm.permissions)]
        });
        await loadRoles(appliedSearch, currentPage);
        setCreateError("");
        setCreateForm(emptyForm);
        setCreateOpen(false);
      } catch (apiError: unknown) {
        const message =
          typeof apiError === "object" &&
          apiError !== null &&
          "message" in apiError &&
          typeof (apiError as { message?: unknown }).message === "string"
            ? (apiError as { message: string }).message
            : "No se pudo crear el rol.";
        setCreateError(message);
      }
    })();
  };

  const updateRole = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const error = validateRole(editForm);
    if (error) return setEditError(error);

    void (async () => {
      try {
        await apiPut(withId(config.endpoints.roles.update, selected.id), {
          name: editForm.name.trim().toUpperCase(),
          permissions: [...new Set(editForm.permissions)]
        });
        await loadRoles(appliedSearch, currentPage);
        setEditError("");
        setSelected(null);
        setEditOpen(false);
      } catch (apiError: unknown) {
        const message =
          typeof apiError === "object" &&
          apiError !== null &&
          "message" in apiError &&
          typeof (apiError as { message?: unknown }).message === "string"
            ? (apiError as { message: string }).message
            : "No se pudo actualizar el rol.";
        setEditError(message);
      }
    })();
  };

  const deleteRole = (role: RoleRecord) => {
    if (!window.confirm(`Eliminar el rol ${role.name}?`)) return;
    void (async () => {
      try {
        await apiDelete(withId(config.endpoints.roles.delete, role.id));
        await loadRoles(appliedSearch, currentPage);
      } catch (error) {
        console.error("[RolesModule] Delete error:", error);
        window.alert("No se pudo eliminar el rol.");
      }
    })();
  };

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-border bg-gradient-to-r from-slate-900 to-violet-700 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">Administracion de acceso</p>
            <h2 className="mt-2 text-2xl font-semibold">Roles y permisos</h2>
            <p className="mt-1 text-sm text-white/75">Gestiona permisos por rol para controlar cada modulo.</p>
          </div>
          <button type="button" onClick={() => { setCreateError(""); setCreateForm(emptyForm); setCreateOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" />
            Crear rol
          </button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total de roles</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : totalRolesCount}</p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Permisos disponibles</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : totalPermissionsCount}</p>
            </div>
          </div>
        </article>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm" placeholder="Buscar por nombre del rol" />
          <button type="button" onClick={() => { setAppliedSearch(search); setCurrentPage(1); }} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
            Buscar
          </button>
          <button type="button" onClick={() => { setSearch(""); setAppliedSearch(""); setCurrentPage(1); }} className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground">
            Limpiar
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-muted/60">
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Permisos</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`roles-loading-${index}`} className="border-t border-border">
                    <td colSpan={4} className="px-4 py-3">
                      <div className="h-8 animate-pulse rounded bg-muted/70" />
                    </td>
                  </tr>
                ))
              ) : paginatedRoles.length ? (
                paginatedRoles.map((role) => (
                  <tr key={role.id} className="border-t border-border">
                    <td className="px-4 py-3">{role.id}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{roleLabels[role.name] ?? role.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {role.permissions.length ? role.permissions.map((permission) => <span key={`${role.id}-${permission}`} className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">{permissionLabelMap.get(permission) ?? permission}</span>) : <span className="text-xs text-muted-foreground">Sin permisos</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openEdit(role)} className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white"><Pencil className="h-3.5 w-3.5" />Editar</button>
                        <button type="button" onClick={() => deleteRole(role)} className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"><Trash2 className="h-3.5 w-3.5" />Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No se encontraron roles.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
        <p className="text-muted-foreground">Mostrando {paginatedRoles.length} de {pagination.total} roles</p>
        <div className="flex items-center gap-2">
          <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
            Anterior
          </button>
          <span className="text-xs text-muted-foreground">Pagina {currentPage} de {totalPages}</span>
          <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
            Siguiente
          </button>
        </div>
      </div>

      <Modal open={createOpen} title="Crear rol" onClose={() => setCreateOpen(false)}>
        <form onSubmit={createRole} className="space-y-4">
          {createError ? <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{createError}</div> : null}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-foreground">Nombre del rol</label>
            <input value={createForm.name} onChange={(event) => setCreateForm((previous) => ({ ...previous, name: event.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <RoleTemplateSelector
            permissionGroups={permissionGroups}
            onApply={(permissions) => {
              setCreateError("");
              setCreateForm((previous) => ({ ...previous, permissions }));
            }}
          />
          <PermissionSelector
            selected={createForm.permissions}
            setSelected={(value) => setCreateForm((previous) => ({ ...previous, permissions: typeof value === "function" ? value(previous.permissions) : value }))}
            permissionGroups={permissionGroups}
            permissionLabelMap={permissionLabelMap}
            allPermissionKeys={allPermissionKeys}
          />
          <div className="flex justify-end"><button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Guardar</button></div>
        </form>
      </Modal>

      <Modal open={editOpen} title="Editar rol" onClose={() => setEditOpen(false)}>
        <form onSubmit={updateRole} className="space-y-4">
          {editError ? <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</div> : null}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-foreground">Nombre del rol</label>
            <input value={editForm.name} onChange={(event) => setEditForm((previous) => ({ ...previous, name: event.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <RoleTemplateSelector
            permissionGroups={permissionGroups}
            onApply={(permissions) => {
              setEditError("");
              setEditForm((previous) => ({ ...previous, permissions }));
            }}
          />
          <PermissionSelector
            selected={editForm.permissions}
            setSelected={(value) => setEditForm((previous) => ({ ...previous, permissions: typeof value === "function" ? value(previous.permissions) : value }))}
            permissionGroups={permissionGroups}
            permissionLabelMap={permissionLabelMap}
            allPermissionKeys={allPermissionKeys}
          />
          <div className="flex justify-end"><button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Actualizar</button></div>
        </form>
      </Modal>
    </section>
  );
}
