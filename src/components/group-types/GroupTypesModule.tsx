import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { config, withId } from "@/config/llapiy-config";
import { apiDelete, apiGet, apiPost, apiPut, toList, unwrapData } from "@/lib/llapiy-api";

type GroupTypeRecord = {
  id: number;
  descripcion: string;
  abreviacion: string;
  groups_count: number;
};

type GroupTypeForm = {
  descripcion: string;
  abreviacion: string;
};

const emptyForm: GroupTypeForm = { descripcion: "", abreviacion: "" };

function Modal({
  open,
  title,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
      <div className="max-h-[92vh] w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
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

export default function GroupTypesModule() {
  const [groupTypes, setGroupTypes] = useState<GroupTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<GroupTypeRecord | null>(null);
  const [createForm, setCreateForm] = useState<GroupTypeForm>(emptyForm);
  const [editForm, setEditForm] = useState<GroupTypeForm>(emptyForm);
  const [createError, setCreateError] = useState("");
  const [editError, setEditError] = useState("");

  const loadGroupTypes = async (searchValue = "") => {
    setIsLoading(true);
    try {
      const response = await apiGet<{ groupTypes: { data: any[] } | any[] }>(config.endpoints.groupTypes.list, {
        search: searchValue || undefined
      });
      const data = unwrapData(response) as { groupTypes?: unknown };
      const next = toList<any>(data?.groupTypes).map((item) => ({
        id: Number(item?.id ?? 0),
        descripcion: String(item?.descripcion ?? ""),
        abreviacion: String(item?.abreviacion ?? ""),
        groups_count: toList<any>(item?.area_group_types).reduce((total, areaGroupType) => total + toList<any>(areaGroupType?.groups).length, 0)
      }));
      setGroupTypes(next);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadGroupTypes(appliedSearch).catch((error) => {
      console.error("[GroupTypesModule] Load error:", error);
    });
  }, [appliedSearch]);

  const filteredTypes = useMemo(() => {
    const query = appliedSearch.trim().toLowerCase();
    if (!query) return groupTypes;
    return groupTypes.filter((item) =>
      `${item.descripcion} ${item.abreviacion}`.toLowerCase().includes(query)
    );
  }, [groupTypes, appliedSearch]);

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredTypes.length / pageSize));
  const paginatedTypes = filteredTypes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const validate = (form: GroupTypeForm): string | null => {
    if (!form.descripcion.trim()) return "Ingrese la descripcion.";
    return null;
  };

  const openEdit = (record: GroupTypeRecord) => {
    setSelected(record);
    setEditError("");
    setEditForm({ descripcion: record.descripcion, abreviacion: record.abreviacion });
    setEditOpen(true);
  };

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validate(createForm);
    if (error) return setCreateError(error);

    void (async () => {
      try {
        await apiPost(config.endpoints.groupTypes.create, {
          descripcion: createForm.descripcion.trim(),
          abreviacion: createForm.abreviacion.trim() || undefined
        });
        await loadGroupTypes(appliedSearch);
        setCreateForm(emptyForm);
        setCreateError("");
        setCreateOpen(false);
      } catch (apiError: unknown) {
        const message =
          typeof apiError === "object" &&
          apiError !== null &&
          "message" in apiError &&
          typeof (apiError as { message?: unknown }).message === "string"
            ? (apiError as { message: string }).message
            : "No se pudo crear el tipo de grupo.";
        setCreateError(message);
      }
    })();
  };

  const submitEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const error = validate(editForm);
    if (error) return setEditError(error);

    void (async () => {
      try {
        await apiPut(withId(config.endpoints.groupTypes.update, selected.id), {
          descripcion: editForm.descripcion.trim(),
          abreviacion: editForm.abreviacion.trim() || undefined
        });
        await loadGroupTypes(appliedSearch);
        setEditOpen(false);
        setSelected(null);
        setEditForm(emptyForm);
        setEditError("");
      } catch (apiError: unknown) {
        const message =
          typeof apiError === "object" &&
          apiError !== null &&
          "message" in apiError &&
          typeof (apiError as { message?: unknown }).message === "string"
            ? (apiError as { message: string }).message
            : "No se pudo actualizar el tipo de grupo.";
        setEditError(message);
      }
    })();
  };

  const removeType = (record: GroupTypeRecord) => {
    if (record.groups_count > 0) return;
    if (!window.confirm("Estas seguro de eliminar este tipo de grupo?")) return;
    void (async () => {
      try {
        await apiDelete(withId(config.endpoints.groupTypes.delete, record.id));
        await loadGroupTypes(appliedSearch);
      } catch (error) {
        console.error("[GroupTypesModule] Delete error:", error);
        window.alert("No se pudo eliminar el tipo de grupo.");
      }
    })();
  };

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-border bg-gradient-to-r from-slate-900 to-cyan-700 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">Catalogo institucional</p>
            <h2 className="mt-2 text-2xl font-semibold">Gestion de tipos de grupos</h2>
            <p className="mt-1 text-sm text-white/75">Define y organiza categorias para la estructura de areas y grupos.</p>
          </div>
          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold">{isLoading ? <span className="inline-block h-4 w-16 animate-pulse rounded-full bg-white/30" /> : `${filteredTypes.length} registros`}</span>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Tipos de grupos</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : groupTypes.length}</p>
        </article>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Buscar</label>
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" placeholder="Descripcion o abreviacion" />
          </div>
          <button type="button" onClick={() => { setAppliedSearch(search); setCurrentPage(1); }} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
            Buscar
          </button>
          <button type="button" onClick={() => { setSearch(""); setAppliedSearch(""); setCurrentPage(1); }} className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground">
            Limpiar
          </button>
          <button type="button" onClick={() => { setCreateError(""); setCreateForm(emptyForm); setCreateOpen(true); }} className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white">
            Crear tipo de grupo
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="bg-muted/60">
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Descripcion</th>
                <th className="px-4 py-3">Abreviacion</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`group-types-loading-${index}`} className="border-t border-border">
                    <td colSpan={3} className="px-4 py-3">
                      <div className="h-8 animate-pulse rounded bg-muted/70" />
                    </td>
                  </tr>
                ))
              ) : paginatedTypes.length ? (
                paginatedTypes.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-4 py-3 font-semibold text-foreground">{item.descripcion}</td>
                    <td className="px-4 py-3">{item.abreviacion || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openEdit(item)} className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white">
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => removeType(item)}
                          disabled={item.groups_count > 0}
                          title={item.groups_count > 0 ? "No se puede eliminar porque tiene grupos asociados" : ""}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No hay tipos de grupo registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
        <p className="text-muted-foreground">Mostrando {paginatedTypes.length} de {filteredTypes.length} tipos de grupos</p>
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

      <Modal open={createOpen} title="Crear tipo de grupo" onClose={() => setCreateOpen(false)}>
        <form onSubmit={submitCreate} className="space-y-3">
          {createError ? <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{createError}</div> : null}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Descripcion</label>
            <input value={createForm.descripcion} onChange={(event) => setCreateForm((previous) => ({ ...previous, descripcion: event.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Abreviacion</label>
            <input value={createForm.abreviacion} onChange={(event) => setCreateForm((previous) => ({ ...previous, abreviacion: event.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Guardar</button>
          </div>
        </form>
      </Modal>

      <Modal open={editOpen} title="Editar tipo de grupo" onClose={() => setEditOpen(false)}>
        <form onSubmit={submitEdit} className="space-y-3">
          {editError ? <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</div> : null}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Descripcion</label>
            <input value={editForm.descripcion} onChange={(event) => setEditForm((previous) => ({ ...previous, descripcion: event.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Abreviacion</label>
            <input value={editForm.abreviacion} onChange={(event) => setEditForm((previous) => ({ ...previous, abreviacion: event.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Actualizar</button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
