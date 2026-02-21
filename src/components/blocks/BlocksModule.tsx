import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { withId } from "@/config/llapiy-config";
import { config } from "@/config/llapiy-config";
import { apiDelete, apiGet, apiPost, apiPut, downloadWebReport, toList, unwrapData } from "@/lib/llapiy-api";
import { useAuthPermissions } from "@/lib/use-auth-permissions";

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

function Modal({ open, title, onClose, children, maxWidth = "max-w-4xl" }: { open: boolean; title: string; onClose: () => void; children: ReactNode; maxWidth?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
      <div className={`max-h-[92vh] w-full overflow-hidden rounded-2xl border border-border bg-card shadow-xl ${maxWidth}`}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-accent">Cerrar</button>
        </div>
        <div className="max-h-[calc(92vh-72px)] overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

async function downloadBlocksReport(filters: { asunto: string; area_id: string; role_id: string; year: string; month: string }) {
  try {
    await downloadWebReport(
      config.endpoints.blocks.pdf,
      {
        asunto: filters.asunto || undefined,
        area_id: filters.area_id || undefined,
        role_id: filters.role_id || undefined,
        year: filters.year || undefined,
        month: filters.month || undefined
      },
      "reporte_bloques.pdf"
    );
  } catch (error) {
    console.error("[BlocksModule] Report error:", error);
    window.alert("No se pudo generar el reporte de bloques.");
  }
}

export default function BlocksModule() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [f, setF] = useState({ asunto: "", area_id: "", role_id: "", year: "", month: "" });
  const [page, setPage] = useState(1);
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

  const loadBlocks = async () => {
    setIsLoading(true);
    try {
      const response = await apiGet<{
        blocks: { data: any[] } | any[];
        areas?: any[];
        roles?: any[];
      }>(config.endpoints.blocks.list);
      const data = unwrapData(response) as { blocks?: unknown; areas?: unknown; roles?: unknown };
      const next = toList<any>(data?.blocks).map(mapApiBlock).filter((item) => item.id > 0);
      const nextAreas = toList<any>(data?.areas).map((item) => ({
        id: Number(item?.id ?? 0),
        descripcion: String(item?.descripcion ?? "")
      })).filter((item) => item.id > 0);
      const nextRoles = toList<any>(data?.roles).map((item) => ({
        id: Number(item?.id ?? 0),
        name: String(item?.name ?? "")
      })).filter((item) => item.id > 0);

      if (nextAreas.length) {
        setAreas(nextAreas);
      } else {
        const areasFromBlocks = [...new Map(next.filter((item) => item.area_id).map((item) => [Number(item.area_id), item.area])).entries()].map(([id, descripcion]) => ({ id, descripcion }));
        setAreas(areasFromBlocks);
      }
      setRoles(nextRoles);
      setBlocks(next);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadBlocks();
      } catch (error) {
        console.error("[BlocksModule] Load error:", error);
      }
    };

    void load();
  }, []);

  const filtered = useMemo(
    () =>
      blocks.filter((b) => {
        const dt = new Date(b.fecha);
        return (
          (!f.asunto || b.asunto.toLowerCase().includes(f.asunto.toLowerCase())) &&
          (!f.area_id || String(b.area_id) === f.area_id) &&
          (!f.role_id || String(b.role_id) === f.role_id) &&
          (!f.year || String(dt.getFullYear()) === f.year) &&
          (!f.month || String(dt.getMonth() + 1) === f.month)
        );
      }),
    [blocks, f]
  );

  const years = useMemo(() => [...new Set(blocks.map((b) => new Date(b.fecha).getFullYear()))].sort((a, b) => b - a), [blocks]);
  const attended = blocks.filter((b) => b.box).length;
  const unattended = blocks.length - attended;
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

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
        await apiPost(config.endpoints.blocks.create, {
          n_bloque: createForm.n_bloque.trim(),
          asunto: createForm.asunto.trim(),
          folios: createForm.folios.trim(),
          rango_inicial: Number(createForm.rango_inicial),
          rango_final: Number(createForm.rango_final),
          fecha: createForm.fecha
        });
        await loadBlocks();
        setCreateErr("");
        setCreateForm(empty);
        setCreateOpen(false);
      } catch (apiError: unknown) {
        const message =
          typeof apiError === "object" &&
          apiError !== null &&
          "message" in apiError &&
          typeof (apiError as { message?: unknown }).message === "string"
            ? (apiError as { message: string }).message
            : "No se pudo crear el bloque.";
        setCreateErr(message);
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
        await apiPut(withId(config.endpoints.blocks.update, sel.id), {
          n_bloque: editForm.n_bloque.trim(),
          asunto: editForm.asunto.trim(),
          folios: editForm.folios.trim(),
          rango_inicial: Number(editForm.rango_inicial),
          rango_final: Number(editForm.rango_final),
          fecha: editForm.fecha
        });

        if (canUploadBlock && editUploadFile) {
          const formData = new FormData();
          formData.append("root", editUploadFile);
          await apiPut(withId(config.endpoints.blocks.upload, sel.id), formData);
        }

        await loadBlocks();
        setEditErr("");
        setEditOpen(false);
        setSel(null);
        setEditUploadFile(null);
        setEditUploadFileName("");
      } catch (apiError: unknown) {
        const message =
          typeof apiError === "object" &&
          apiError !== null &&
          "message" in apiError &&
          typeof (apiError as { message?: unknown }).message === "string"
            ? (apiError as { message: string }).message
            : "No se pudo actualizar el bloque.";
        setEditErr(message);
      }
    })();
  };

  const removeBlock = (block: Block) => {
    if (!window.confirm(`Eliminar ${block.n_bloque}?`)) return;
    void (async () => {
      try {
        await apiDelete(withId(config.endpoints.blocks.delete, block.id));
        await loadBlocks();
      } catch (error) {
        console.error("[BlocksModule] Delete error:", error);
        window.alert("No se pudo eliminar el bloque.");
      }
    })();
  };

  const openEdit = (b: Block) => {
    setSel(b);
    setEditErr("");
    setEditUploadFile(null);
    setEditUploadFileName("");
    setEditForm({
      n_bloque: b.n_bloque,
      asunto: b.asunto,
      folios: b.folios,
      rango_inicial: String(b.rango_inicial),
      rango_final: String(b.rango_final),
      fecha: b.fecha,
      root_url: b.root_url,
      area_id: b.area_id ? String(b.area_id) : "",
      role_id: b.role_id ? String(b.role_id) : ""
    });
    setEditOpen(true);
  };

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-border bg-gradient-to-r from-slate-900 to-emerald-700 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs uppercase tracking-[0.24em] text-white/60">Control de bloques</p><h2 className="mt-2 text-2xl font-semibold">Gestion de bloques</h2></div>
          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold">{isLoading ? <span className="inline-block h-4 w-16 animate-pulse rounded-full bg-white/30" /> : `${filtered.length} registros`}</span>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm"><p className="text-xs text-muted-foreground">Total de bloques</p><p className="mt-2 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : blocks.length}</p></article>
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm"><p className="text-xs text-muted-foreground">Areas registradas</p><p className="mt-2 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : areas.length}</p></article>
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm"><p className="text-xs text-muted-foreground">Bloques atendidos</p><p className="mt-2 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : attended}</p></article>
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm"><p className="text-xs text-muted-foreground">Bloques sin atender</p><p className="mt-2 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : unattended}</p></article>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <input value={f.asunto} onChange={(e) => setF((p) => ({ ...p, asunto: e.target.value }))} placeholder="Asunto" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
          <select value={f.area_id} onChange={(e) => setF((p) => ({ ...p, area_id: e.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="">Area</option>{areas.map((a) => <option key={a.id} value={String(a.id)}>{a.descripcion}</option>)}</select>
          <select value={f.role_id} onChange={(e) => setF((p) => ({ ...p, role_id: e.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="">Rol</option>{roles.map((r) => <option key={r.id} value={String(r.id)}>{r.name}</option>)}</select>
          <select value={f.year} onChange={(e) => setF((p) => ({ ...p, year: e.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="">Ano</option>{years.map((y) => <option key={y} value={String(y)}>{y}</option>)}</select>
          <select value={f.month} onChange={(e) => setF((p) => ({ ...p, month: e.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="">Mes</option>{months.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}</select>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => { setCreateErr(""); setCreateForm(empty); setCreateOpen(true); }} className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white">Ingresar bloque</button>
          <button
            type="button"
            disabled={!filtered.length}
            title={!filtered.length ? "Para generar un reporte debe existir al menos un bloque." : ""}
            onClick={() => void downloadBlocksReport(f)}
            className="h-10 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Generar reporte
          </button>
          <button type="button" onClick={() => setF({ asunto: "", area_id: "", role_id: "", year: "", month: "" })} className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground">Limpiar</button>
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
              )) : rows.length ? rows.map((b, i) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="px-4 py-3">{(page - 1) * pageSize + i + 1}</td><td className="px-4 py-3 font-semibold text-foreground">{b.n_bloque}</td><td className="px-4 py-3">{b.asunto}</td><td className="px-4 py-3">{b.folios || "-"}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => { setSel(b); setShowOpen(true); }} className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white">Ver</button><button type="button" onClick={() => openEdit(b)} className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white">Editar</button><button type="button" onClick={() => removeBlock(b)} className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">Eliminar</button></div></td>
                </tr>
              )) : <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No se encontraron bloques.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
        <p className="text-muted-foreground">Mostrando {rows.length} de {filtered.length} bloques</p>
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
