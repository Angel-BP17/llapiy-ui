import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getPaginationMeta, toList } from "@/lib/llapiy-api";
import { useAuthPermissions } from "@/lib/use-auth-permissions";
import { Archive, Building2, CheckCircle2, Clock3, Eye, FileDown, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ArchiveService } from "@/services/ArchiveService";

type Block = {
  id: number;
  n_bloque: string;
  asunto: string;
  folios: string;
  rango_inicial: number;
  rango_final: number;
  fecha: string;
  root_url: string;
  user: { name: string; last_name: string } | null;
  area: string;
  group: string;
  subgroup: string;
  box: { section: string; andamio: string; box: string } | null;
  area_id: number | null;
  role_id: number | null;
};

type BlockForm = {
  n_bloque: string;
  asunto: string;
  folios: string;
  rango_inicial: string;
  rango_final: string;
  fecha: string;
  root_url: string;
  area_id: string;
  role_id: string;
};

type RoleOption = { id: number; name: string };
type AreaOption = { id: number; descripcion: string };

const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const empty: BlockForm = { n_bloque: "", asunto: "", folios: "", rango_inicial: "", rango_final: "", fecha: "", root_url: "", area_id: "", role_id: "" };
const emptyFilters = { asunto: "", area_id: "", year: "", month: "" };
const emptyPagination = { currentPage: 1, lastPage: 1, perPage: 0, total: 0, from: 0, to: 0 };

function mapApiBlock(item: any): Block {
  const areaName =
    item?.group?.area_group_type?.area?.descripcion ??
    item?.user?.group?.area_group_type?.area?.descripcion ??
    "Sin area";

  return {
    id: Number(item?.id ?? 0),
    n_bloque: String(item?.n_bloque ?? ""),
    asunto: String(item?.asunto ?? ""),
    folios: String(item?.folios ?? ""),
    rango_inicial: Number(item?.rango_inicial ?? 0),
    rango_final: Number(item?.rango_final ?? 0),
    fecha: String(item?.fecha ?? ""),
    root_url: String(item?.root ?? ""),
    user: item?.user ? { name: String(item.user.name ?? ""), last_name: String(item.user.last_name ?? "") } : null,
    area: areaName,
    group: String(item?.group?.descripcion ?? "Sin grupo"),
    subgroup: String(item?.subgroup?.descripcion ?? "Sin subgrupo"),
    box: item?.box
      ? {
          section: String(item.box?.andamio?.section?.n_section ?? "-"),
          andamio: String(item.box?.andamio?.n_andamio ?? "-"),
          box: String(item.box?.n_box ?? "-")
        }
      : null,
    area_id: Number(item?.group?.area_group_type?.area_id ?? 0) || null,
    role_id: Number(item?.role_id ?? item?.user?.roles?.[0]?.id ?? 0) || null
  };
}

export default function BlocksModule() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [f, setF] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination);
  const [years, setYears] = useState<number[]>([]);
  const [totalBlocks, setTotalBlocks] = useState(0);
  const [attendedBlocks, setAttendedBlocks] = useState(0);
  const [unattendedBlocks, setUnattendedBlocks] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [sel, setSel] = useState<Block | null>(null);
  const [createForm, setCreateForm] = useState<BlockForm>(empty);
  const [editForm, setEditForm] = useState<BlockForm>(empty);
  const [createErr, setCreateErr] = useState("");
  const [editErr, setEditErr] = useState("");
  const [editUploadFile, setEditUploadFile] = useState<File | null>(null);
  const [editUploadFileName, setEditUploadFileName] = useState("");
  const { can: canByPermission } = useAuthPermissions();

  const canUploadBlock = canByPermission("blocks.upload");

  const loadBlocks = async (filtersValue = appliedFilters, pageValue = page) => {
    setIsLoading(true);
    try {
      const data = await ArchiveService.getBlocks(filtersValue, pageValue);
      const nextPagination = getPaginationMeta(data?.blocks);
      const next = toList<any>(data?.blocks).map(mapApiBlock).filter((item) => item.id > 0);
      const nextAreas = toList<any>(data?.areas).map((item) => ({
        id: Number(item?.id ?? 0),
        descripcion: String(item?.descripcion ?? "")
      })).filter((item) => item.id > 0);

      if (nextAreas.length) {
        setAreas(nextAreas);
      } else {
        const areasFromBlocks = [...new Map(next.filter((item) => item.area_id).map((item) => [Number(item.area_id), item.area])).entries()].map(([id, descripcion]) => ({ id, descripcion }));
        setAreas(areasFromBlocks);
      }
      setBlocks(next);
      setPagination(nextPagination);
      setYears(
        toList<any>(data?.years)
          .map((value) => Number(value ?? 0))
          .filter((value) => value > 0)
          .sort((a, b) => b - a)
      );
      setTotalBlocks(Number(data?.totalBlocks ?? nextPagination.total ?? 0));
      setAttendedBlocks(Number(data?.attendedBlocksCount ?? 0));
      setUnattendedBlocks(Number(data?.unattendedBlocksCount ?? 0));
    } catch (error) {
      console.error("[BlocksModule] Load error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBlocks(appliedFilters, page);
  }, [appliedFilters, page]);

  const validate = (form: BlockForm) => {
    if (!form.n_bloque.trim()) return "Ingrese el numero de bloque.";
    if (!form.asunto.trim()) return "Ingrese el asunto.";
    if (!form.fecha) return "Ingrese la fecha.";
    if (!form.rango_inicial || !form.rango_final) return "Complete el rango inicial y final.";
    if (Number(form.rango_inicial) > Number(form.rango_final)) return "El rango inicial no puede ser mayor al final.";
    return null;
  };

  const submitCreate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const err = validate(createForm);
    if (err) return setCreateErr(err);
    void (async () => {
      try {
        await ArchiveService.createBlock({
          n_bloque: createForm.n_bloque.trim(),
          asunto: createForm.asunto.trim(),
          folios: createForm.folios.trim(),
          rango_inicial: Number(createForm.rango_inicial),
          rango_final: Number(createForm.rango_final),
          fecha: createForm.fecha
        });
        await loadBlocks(appliedFilters, page);
        setCreateErr("");
        setCreateForm(empty);
        setCreateOpen(false);
      } catch (apiError: any) {
        setCreateErr(apiError?.message || "No se pudo crear el bloque.");
      }
    })();
  };

  const submitEdit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!sel) return;
    const err = validate(editForm);
    if (err) return setEditErr(err);
    void (async () => {
      try {
        await ArchiveService.updateBlock(sel.id, {
          n_bloque: editForm.n_bloque.trim(),
          asunto: editForm.asunto.trim(),
          folios: editForm.folios.trim(),
          rango_inicial: Number(editForm.rango_inicial),
          rango_final: Number(editForm.rango_final),
          fecha: editForm.fecha
        });

        if (canUploadBlock && editUploadFile) {
          await ArchiveService.uploadBlockFile(sel.id, editUploadFile);
        }

        await loadBlocks(appliedFilters, page);
        setEditErr("");
        setEditOpen(false);
        setSel(null);
        setEditUploadFile(null);
        setEditUploadFileName("");
      } catch (apiError: any) {
        setEditErr(apiError?.message || "No se pudo actualizar el bloque.");
      }
    })();
  };

  const removeBlock = (block: Block) => {
    if (!window.confirm(`Eliminar ${block.n_bloque}?`)) return;
    void (async () => {
      try {
        await ArchiveService.deleteBlock(block.id);
        await loadBlocks(appliedFilters, page);
      } catch (error) {
        console.error("[BlocksModule] Delete error:", error);
        window.alert("No se pudo eliminar el bloque.");
      }
    })();
  };

  const handleDownloadReport = () => {
    void ArchiveService.downloadBlocksReport(appliedFilters).catch((error) => {
       console.error("[BlocksModule] Report error:", error);
       window.alert("No se pudo generar el reporte.");
    });
  };

  const totalPages = Math.max(1, pagination.lastPage);

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-border bg-gradient-to-r from-slate-900 to-emerald-700 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs uppercase tracking-[0.24em] text-white/60">Control de bloques</p><h2 className="mt-2 text-2xl font-semibold">Gestion de bloques</h2></div>
          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold">{isLoading ? <span className="inline-block h-4 w-16 animate-pulse rounded-full bg-white/30" /> : `${pagination.total} registros`}</span>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total de bloques</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : totalBlocks}</p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Areas registradas</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : areas.length}</p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bloques atendidos</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : attendedBlocks}</p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bloques sin atender</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : unattendedBlocks}</p>
            </div>
          </div>
        </article>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <input value={f.asunto} onChange={(e) => setF((p) => ({ ...p, asunto: e.target.value }))} placeholder="Asunto" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
          <select value={f.area_id} onChange={(e) => setF((p) => ({ ...p, area_id: e.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="">Area</option>{areas.map((a) => <option key={a.id} value={String(a.id)}>{a.descripcion}</option>)}</select>
          <select value={f.year} onChange={(e) => setF((p) => ({ ...p, year: e.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="">Periodo</option>{years.map((y) => <option key={y} value={String(y)}>{y}</option>)}</select>
          <select value={f.month} onChange={(e) => setF((p) => ({ ...p, month: e.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="">Mes</option>{months.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}</select>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => { setPage(1); setAppliedFilters({ ...f }); }} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Aplicar filtros</button>
          <button type="button" onClick={() => { setCreateErr(""); setCreateForm(empty); setCreateOpen(true); }} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Ingresar bloque</button>
          <button
            type="button"
            disabled={!pagination.total}
            title={!pagination.total ? "Para generar un reporte debe existir al menos un bloque." : ""}
            onClick={handleDownloadReport}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileDown className="h-4 w-4" />
            Generar reporte
          </button>
          <button type="button" onClick={() => { setF(emptyFilters); setAppliedFilters(emptyFilters); setPage(1); }} className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground">Limpiar</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-muted/60"><tr className="text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="px-4 py-3">#</th><th className="px-4 py-3">N bloque</th><th className="px-4 py-3">Asunto</th><th className="px-4 py-3">Folios</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead>
            <tbody>
              {isLoading ? Array.from({ length: 6 }).map((_, index) => (
                <tr key={`blocks-loading-${index}`} className="border-t border-border">
                  <td colSpan={5} className="px-4 py-3">
                    <div className="h-8 animate-pulse rounded bg-muted/70" />
                  </td>
                </tr>
              )) : blocks.length ? blocks.map((b, i) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="px-4 py-3">{(pagination.from || 1) + i}</td><td className="px-4 py-3 font-semibold text-foreground">{b.n_bloque}</td><td className="px-4 py-3">{b.asunto}</td><td className="px-4 py-3">{b.folios || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => { setSel(b); setShowOpen(true); }} className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white">
                        <Eye className="h-3.5 w-3.5" />
                        Ver
                      </button>
                      <button type="button" onClick={() => { setSel(b); setEditErr(""); setEditUploadFile(null); setEditUploadFileName(""); setEditForm({ n_bloque: b.n_bloque, asunto: b.asunto, folios: b.folios, rango_inicial: String(b.rango_inicial), rango_final: String(b.rango_final), fecha: b.fecha, root_url: b.root_url, area_id: b.area_id ? String(b.area_id) : "", role_id: b.role_id ? String(b.role_id) : "" }); setEditOpen(true); }} className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white">
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button type="button" onClick={() => removeBlock(b)} className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              )) : <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No se encontraron bloques.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
        <p className="text-muted-foreground">Mostrando {blocks.length} de {pagination.total} bloques</p>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Anterior</button>
          <span className="text-xs text-muted-foreground">Pagina {page} de {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Siguiente</button>
        </div>
      </div>

      <Modal open={createOpen} title="Ingresar bloque" onClose={() => setCreateOpen(false)}>
        <form onSubmit={submitCreate} className="space-y-4">
          {createErr ? <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{createErr}</div> : null}
          <div className="grid gap-3 md:grid-cols-2">
            <input value={createForm.n_bloque} onChange={(e) => setCreateForm((p) => ({ ...p, n_bloque: e.target.value.toUpperCase() }))} placeholder="N bloque" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" required />
            <input value={createForm.asunto} onChange={(e) => setCreateForm((p) => ({ ...p, asunto: e.target.value }))} placeholder="Asunto" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" required />
            <input value={createForm.folios} onChange={(e) => setCreateForm((p) => ({ ...p, folios: e.target.value }))} placeholder="Folios" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
            <input type="date" value={createForm.fecha} onChange={(e) => setCreateForm((p) => ({ ...p, fecha: e.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" required />
            <input type="number" min={1} value={createForm.rango_inicial} onChange={(e) => setCreateForm((p) => ({ ...p, rango_inicial: e.target.value }))} placeholder="Rango inicial" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" required />
            <input type="number" min={1} value={createForm.rango_final} onChange={(e) => setCreateForm((p) => ({ ...p, rango_final: e.target.value }))} placeholder="Rango final" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" required />
          </div>
          <div className="flex justify-end"><button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Guardar</button></div>
        </form>
      </Modal>

      <Modal open={editOpen} title="Editar bloque" onClose={() => setEditOpen(false)}>
        <form onSubmit={submitEdit} className="space-y-4">
          {editErr ? <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{editErr}</div> : null}
          <div className="grid gap-3 md:grid-cols-2">
            <input value={editForm.n_bloque} onChange={(e) => setEditForm((p) => ({ ...p, n_bloque: e.target.value.toUpperCase() }))} placeholder="N bloque" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" required />
            <input value={editForm.asunto} onChange={(e) => setEditForm((p) => ({ ...p, asunto: e.target.value }))} placeholder="Asunto" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" required />
            <input value={editForm.folios} onChange={(e) => setEditForm((p) => ({ ...p, folios: e.target.value }))} placeholder="Folios" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
            <input type="date" value={editForm.fecha} onChange={(e) => setEditForm((p) => ({ ...p, fecha: e.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" required />
            <input type="number" min={1} value={editForm.rango_inicial} onChange={(e) => setEditForm((p) => ({ ...p, rango_inicial: e.target.value }))} placeholder="Rango inicial" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" required />
            <input type="number" min={1} value={editForm.rango_final} onChange={(e) => setEditForm((p) => ({ ...p, rango_final: e.target.value }))} placeholder="Rango final" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" required />
            <div className="md:col-span-2">
              {canUploadBlock ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Nuevo archivo (.pdf)</label>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setEditUploadFile(file);
                      setEditUploadFileName(file?.name ?? "");
                    }}
                    className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  {editUploadFileName ? <p className="text-xs text-muted-foreground">Seleccionado: {editUploadFileName}</p> : null}
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  No tienes permiso para actualizar el archivo.
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end"><button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Guardar cambios</button></div>
        </form>
      </Modal>

      <Modal open={showOpen} title="Detalle del bloque" onClose={() => setShowOpen(false)} maxWidth="max-w-4xl">
        {sel ? <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-border bg-background px-3 py-2"><p className="text-xs text-muted-foreground">Usuario</p><p className="text-sm font-semibold text-foreground">{sel.user ? `${sel.user.name} ${sel.user.last_name}` : "-"}</p></div><div className="rounded-lg border border-border bg-background px-3 py-2"><p className="text-xs text-muted-foreground">N bloque</p><p className="text-sm font-semibold text-foreground">{sel.n_bloque}</p></div><div className="rounded-lg border border-border bg-background px-3 py-2 sm:col-span-2"><p className="text-xs text-muted-foreground">Asunto</p><p className="text-sm font-semibold text-foreground">{sel.asunto}</p></div><div className="rounded-lg border border-border bg-background px-3 py-2"><p className="text-xs text-muted-foreground">Ubicacion</p><p className="text-sm font-semibold text-foreground">{sel.box ? `Seccion ${sel.box.section} / Andamio ${sel.box.andamio} / Caja ${sel.box.box}` : "Sin ubicacion"}</p></div><div className="rounded-lg border border-border bg-background px-3 py-2"><p className="text-xs text-muted-foreground">Area / Grupo</p><p className="text-sm font-semibold text-foreground">{sel.area} / {sel.group}</p></div></div></div> : null}
      </Modal>
    </section>
  );
}
