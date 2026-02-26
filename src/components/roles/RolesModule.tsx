import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { 
  getPaginationMeta, 
  toList 
} from "@/lib/llapiy-api";
import { Modal } from "@/components/ui/modal";
import { KeyRound, Pencil, Plus, Shield, Trash2, Search, RotateCcw, ChevronRight, Lock } from "lucide-react";
import { RoleService } from "@/services/RoleService";

type PermissionItem = { key: string; label: string };
type PermissionGroup = {
  module: string;
  moduleLabel: string;
  permissions: PermissionItem[];
};
type RoleRecord = { id: number; name: string; permissions: string[] };
type RoleForm = { name: string; permissions: string[] };
type TemplateModule = "inbox" | "storage" | "documents" | "blocks";
type RoleTemplate = {
  id: string;
  label: string;
  description: string;
  modules: TemplateModule[];
};

const roleLabels: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  admin: "Administrador",
};

const roleTemplates: RoleTemplate[] = [
  {
    id: "archivo-central",
    label: "Encargado de Archivo Central",
    description: 'Acceso completo a "Bandeja", "Almacenamiento", "Documentos" y "Bloques".',
    modules: ["inbox", "storage", "documents", "blocks"],
  },
  {
    id: "colaborador",
    label: "Colaborador Documental",
    description: 'Acceso estándar a "Documentos" y "Bloques".',
    modules: ["documents", "blocks"],
  },
];

const defaultPermissionGroups: PermissionGroup[] = [
  { module: "users", moduleLabel: "Gestión de Usuarios", permissions: [
    { key: "users.view", label: "Ver usuarios" },
    { key: "users.create", label: "Crear usuarios" },
    { key: "users.update", label: "Editar usuarios" },
    { key: "users.delete", label: "Eliminar usuarios" }
  ]},
  { module: "roles", moduleLabel: "Seguridad y Roles", permissions: [
    { key: "roles.view", label: "Ver roles" },
    { key: "roles.create", label: "Crear roles" },
    { key: "roles.update", label: "Editar roles" },
    { key: "roles.delete", label: "Eliminar roles" }
  ]},
  { module: "documents", moduleLabel: "Documentos", permissions: [
    { key: "documents.view", label: "Ver documentos" },
    { key: "documents.create", label: "Crear documentos" },
    { key: "documents.update", label: "Editar documentos" },
    { key: "documents.delete", label: "Eliminar documentos" },
    { key: "documents.upload", label: "Subir archivos" }
  ]}
];

const defaultPermissionLabelMap = new Map<string, string>(
  defaultPermissionGroups.flatMap((group) => [
    [group.module, group.moduleLabel] as [string, string],
    ...group.permissions.map((p) => [p.key, p.label] as [string, string]),
  ]),
);

const permissionActionLabels: Record<string, string> = {
  view: "Ver",
  create: "Crear",
  update: "Editar",
  delete: "Eliminar",
  upload: "Subir",
  pdf: "Exportar PDF"
};

const emptyForm: RoleForm = { name: "", permissions: [] };
const emptyPagination: PaginationMeta = { currentPage: 1, lastPage: 1, perPage: 0, total: 0, from: 0, to: 0 };

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function toTitleLabel(v: string) {
  return v.replace(/[._-]+/g, " ").split(" ").filter(Boolean).map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
}

function getPermissionName(p: any) {
  if (typeof p === "string") return p.trim();
  return p?.name?.trim() || "";
}

function extractPermissionNames(v: any) {
  return uniqueStrings(toList<any>(v).map(getPermissionName));
}

function getPermissionLabel(key: string) {
  if (defaultPermissionLabelMap.has(key)) return defaultPermissionLabelMap.get(key)!;
  const [module, ...actionParts] = key.split(".");
  if (!module || !actionParts.length) return toTitleLabel(key);
  const actionKey = actionParts.join("_").toLowerCase();
  const actionLabel = permissionActionLabels[actionKey] ?? toTitleLabel(actionParts.join(" "));
  return `${actionLabel} ${toTitleLabel(module)}`;
}

function buildPermissionGroups(keys: string[]): PermissionGroup[] {
  const grouped = new Map<string, Set<string>>();
  uniqueStrings(keys).forEach((key) => {
    const [module] = key.split(".");
    if (!module) return;
    if (!grouped.has(module)) grouped.set(module, new Set<string>());
    grouped.get(module)!.add(key);
  });
  return [...grouped.entries()].map(([module, items]) => ({
    module,
    moduleLabel: defaultPermissionLabelMap.get(module) ?? toTitleLabel(module),
    permissions: [...items].sort().map((k) => ({ key: k, label: getPermissionLabel(k) }))
  })).sort((a, b) => a.moduleLabel.localeCompare(b.moduleLabel));
}

export default function RolesModule() {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [catalog, setCatalog] = useState<string[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<RoleRecord | null>(null);
  const [createForm, setCreateForm] = useState<RoleForm>(emptyForm);
  const [editForm, setEditForm] = useState<RoleForm>(emptyForm);
  const [createError, setCreateError] = useState("");
  const [editError, setEditError] = useState("");

  const groups = useMemo(() => buildPermissionGroups(catalog), [catalog]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await RoleService.getAll(appliedSearch, currentPage);
      const nextRoles = toList<any>(data?.roles).map(r => ({
        id: Number(r?.id || 0),
        name: String(r?.name || ""),
        permissions: extractPermissionNames(r?.permissions)
      }));
      setRoles(nextRoles);
      setPagination(getPaginationMeta(data?.roles));
      setCatalog(prev => uniqueStrings([...prev, ...nextRoles.flatMap(r => r.permissions)]));
    } catch (e) {
      console.error("[Roles] Load error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, [appliedSearch, currentPage]);

  const togglePermission = (form: RoleForm, setForm: any, key: string) => {
    const next = new Set(form.permissions);
    if (next.has(key)) next.delete(key); else next.add(key);
    setForm({ ...form, permissions: [...next] });
  };

  const handleApplyTemplate = (setForm: any, currentForm: RoleForm, tid: string) => {
    const template = roleTemplates.find(x => x.id === tid);
    if (!template) return;
    const tKeys = groups
      .filter(g => template.modules.some(m => g.module.toLowerCase().includes(m)))
      .flatMap(g => g.permissions.map(p => p.key));
    setForm({ ...currentForm, permissions: uniqueStrings([...currentForm.permissions, ...tKeys]) });
  };

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) return setCreateError("Ingrese el nombre del rol.");
    try {
      await RoleService.create({
        name: createForm.name.trim().toUpperCase(),
        permissions: [...new Set(createForm.permissions)]
      });
      setCreateOpen(false);
      setCreateForm(emptyForm);
      loadData();
    } catch (apiError: any) {
      setCreateError(apiError?.message || "No se pudo crear el rol.");
    }
  };

  const submitUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (!editForm.name.trim()) return setEditError("El nombre no puede estar vacío.");
    try {
      await RoleService.update(selected.id, {
        name: editForm.name.trim().toUpperCase(),
        permissions: [...new Set(editForm.permissions)]
      });
      setEditOpen(false);
      setSelected(null);
      loadData();
    } catch (apiError: any) {
      setEditError(apiError?.message || "No se pudo actualizar el rol.");
    }
  };

  const deleteRole = (role: RoleRecord) => {
    if (!window.confirm(`¿Seguro que desea eliminar el rol ${role.name}?`)) return;
    void (async () => {
      try {
        await RoleService.delete(role.id);
        loadData();
      } catch (error) {
        console.error("[Roles] Delete error:", error);
        window.alert("No se pudo eliminar el rol.");
      }
    })();
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Roles registrados</p>
              <p className="text-2xl font-bold text-foreground">{isLoading ? "..." : roles.length}</p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Permisos detectados</p>
              <p className="text-2xl font-bold text-foreground">{isLoading ? "..." : catalog.length}</p>
            </div>
          </div>
        </article>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-foreground">Buscar rol</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Nombre del rol..." 
                className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm focus:ring-2 focus:ring-primary/20" 
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { setAppliedSearch(search); setCurrentPage(1); }} 
              className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Aplicar filtros
            </button>
            <button 
              onClick={() => { setSearch(""); setAppliedSearch(""); setCurrentPage(1); }} 
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <RotateCcw className="h-4 w-4" />
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Nombre del Rol</th>
                <th className="px-4 py-3">Resumen de Permisos</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    <td colSpan={3} className="p-4"><div className="h-8 animate-pulse rounded bg-muted" /></td>
                  </tr>
                ))
              ) : roles.length ? (
                roles.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">{roleLabels[r.name] || r.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-100">
                        {r.permissions.length} permisos asignados
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { setSelected(r); setEditError(""); setEditForm({ name: r.name, permissions: [...r.permissions] }); setEditOpen(true); }}
                          className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600 shadow-sm"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        <button 
                          onClick={() => deleteRole(r)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 shadow-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">No se encontraron roles con ese criterio.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={createOpen} title="Crear Nuevo Rol" onClose={() => setCreateOpen(false)} maxWidth="max-w-4xl">
        <form onSubmit={submitCreate} className="space-y-6">
          {createError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{createError}</div>}
          
          <div className="space-y-1">
            <label className="text-sm font-semibold text-foreground">Nombre del rol</label>
            <input 
              value={createForm.name} 
              onChange={(e) => setCreateForm({...createForm, name: e.target.value})} 
              placeholder="Ej. AUDITOR" 
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm shadow-sm focus:ring-2 focus:ring-primary/20" 
            />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-1 space-y-4">
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Plantillas rápidas</h4>
                {roleTemplates.map(t => (
                  <button 
                    key={t.id} 
                    type="button" 
                    onClick={() => handleApplyTemplate(setCreateForm, createForm, t.id)}
                    className="w-full text-left p-3 rounded-lg border border-border bg-card hover:border-primary/50 transition-all group"
                  >
                    <p className="text-xs font-bold text-foreground group-hover:text-primary">{t.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="rounded-xl border border-border bg-background p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Catálogo de Permisos ({createForm.permissions.length} seleccionados)</h4>
                <div className="grid gap-4 sm:grid-cols-1 max-h-[400px] overflow-y-auto pr-2">
                  {groups.map(g => (
                    <div key={g.module} className="space-y-2 pb-4 border-b border-border last:border-0">
                      <p className="text-xs font-bold text-foreground bg-muted/50 px-2 py-1 rounded">{g.moduleLabel}</p>
                      <div className="grid grid-cols-2 gap-2 px-2">
                        {g.permissions.map(p => (
                          <label key={p.key} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                            <input 
                              type="checkbox" 
                              checked={createForm.permissions.includes(p.key)} 
                              onChange={() => togglePermission(createForm, setCreateForm, p.key)}
                              className="h-4 w-4 rounded border-border text-primary"
                            /> 
                            {p.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button type="submit" className="h-11 rounded-xl bg-primary px-8 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:opacity-90">
              Guardar Rol
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={editOpen} title={`Editando Rol: ${selected?.name}`} onClose={() => setEditOpen(false)} maxWidth="max-w-4xl">
        <form onSubmit={submitUpdate} className="space-y-6">
          {editError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{editError}</div>}
          
          <div className="space-y-1">
            <label className="text-sm font-semibold text-foreground">Nombre del rol</label>
            <input 
              value={editForm.name} 
              onChange={(e) => setEditForm({...editForm, name: e.target.value})} 
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm shadow-sm focus:ring-2 focus:ring-primary/20" 
            />
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Configurar Permisos ({editForm.permissions.length})</h4>
            <div className="grid gap-4 max-h-[450px] overflow-y-auto pr-2">
              {groups.map(g => (
                <div key={g.module} className="space-y-2 pb-4 border-b border-border last:border-0">
                  <p className="text-xs font-bold text-foreground bg-muted/50 px-2 py-1 rounded">{g.moduleLabel}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 px-2">
                    {g.permissions.map(p => (
                      <label key={p.key} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={editForm.permissions.includes(p.key)} 
                          onChange={() => togglePermission(editForm, setEditForm, p.key)}
                          className="h-4 w-4 rounded border-border text-primary"
                        /> 
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button type="submit" className="h-11 rounded-xl bg-primary px-8 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:opacity-90">
              Actualizar Rol
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
