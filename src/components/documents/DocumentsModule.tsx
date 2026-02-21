import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { config, withId } from "@/config/llapiy-config";
import { apiDelete, apiGet, apiPost, apiPut, downloadWebReport, toList, unwrapData } from "@/lib/llapiy-api";
import { useAuthPermissions } from "@/lib/use-auth-permissions";

type CampoType = { id: number; name: string; data_type: "string" | "text" | "int" | "boolean" | "enum"; is_nullable?: boolean; enum_values?: string[] };
type DocType = { id: number; name: string; campo_types: CampoType[] };
type Campo = { campo_type_id: number; name: string; dato: string };
type Doc = {
  id: number;
  n_documento: string;
  asunto: string;
  folios: string;
  fecha: string;
  document_type_id: number;
  document_type_name: string;
  root_url: string;
  campos: Campo[];
  area_id: number | null;
  group_id: number | null;
  subgroup_id: number | null;
  role_id: number | null;
};
type FormState = {
  document_type_id: string;
  n_documento: string;
  asunto: string;
  folios: string;
  fecha: string;
  root_url: string;
  area_id: string;
  group_id: string;
  subgroup_id: string;
  role_id: string;
  campos: Record<number, string>;
};

const roles: { id: number; name: string }[] = [];
const areas: { id: number; descripcion: string }[] = [];
const groups: { id: number; descripcion: string }[] = [];
const subgroups: { id: number; descripcion: string }[] = [];
const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const docTypes: DocType[] = [];

const empty: FormState = { document_type_id: "", n_documento: "", asunto: "", folios: "", fecha: "", root_url: "", area_id: "", group_id: "", subgroup_id: "", role_id: "", campos: {} };

function mapApiDocument(item: any): Doc {
  const campos: Campo[] = Array.isArray(item?.campos)
    ? item.campos.map((campo: any) => ({
        campo_type_id: Number(campo?.campo_type_id ?? campo?.campo_type?.id ?? campo?.campoType?.id ?? 0),
        name: String(campo?.campo_type?.name ?? campo?.campoType?.name ?? ""),
        dato: String(campo?.dato ?? "")
      }))
    : [];

  return {
    id: Number(item?.id ?? 0),
    n_documento: String(item?.n_documento ?? ""),
    asunto: String(item?.asunto ?? ""),
    folios: String(item?.folios ?? ""),
    fecha: String(item?.fecha ?? ""),
    document_type_id: Number(item?.document_type_id ?? item?.document_type?.id ?? 0),
    document_type_name: String(item?.document_type?.name ?? item?.documentType?.name ?? ""),
    root_url: String(item?.root ?? ""),
    campos,
    area_id: Number(item?.group?.area_group_type?.area_id ?? 0) || null,
    group_id: Number(item?.group_id ?? 0) || null,
    subgroup_id: Number(item?.subgroup_id ?? 0) || null,
    role_id: Number(item?.role_id ?? item?.user?.roles?.[0]?.id ?? 0) || null
  };
}

function Modal({ open, title, onClose, children, maxWidth = "max-w-5xl" }: { open: boolean; title: string; onClose: () => void; children: ReactNode; maxWidth?: string }) {
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

const getType = (id: string) => docTypes.find((x) => String(x.id) === id) ?? null;

async function downloadDocumentsReport(filters: {
  asunto: string;
  area_id: string;
  group_id: string;
  subgroup_id: string;
  role_id: string;
  year: string;
  month: string;
}) {
  try {
    await downloadWebReport(
      config.endpoints.documents.pdf,
      {
        asunto: filters.asunto || undefined,
        area_id: filters.area_id || undefined,
        group_id: filters.group_id || undefined,
        subgroup_id: filters.subgroup_id || undefined,
        role_id: filters.role_id || undefined,
        year: filters.year || undefined,
        month: filters.month || undefined
      },
      "reporte_documentos.pdf"
    );
  } catch (error) {
    console.error("[DocumentsModule] Report error:", error);
    window.alert("No se pudo generar el reporte de documentos.");
  }
}

export default function DocumentsModule() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [f, setF] = useState({ asunto: "", document_type_id: "", area_id: "", group_id: "", subgroup_id: "", role_id: "", year: "", month: "" });
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [sel, setSel] = useState<Doc | null>(null);
  const [createForm, setCreateForm] = useState<FormState>(empty);
  const [editForm, setEditForm] = useState<FormState>(empty);
  const [createErr, setCreateErr] = useState("");
  const [editErr, setEditErr] = useState("");
  const [editUploadFile, setEditUploadFile] = useState<File | null>(null);
  const [editUploadFileName, setEditUploadFileName] = useState("");
  const { can: canByPermission } = useAuthPermissions();

  const canUploadDocument = canByPermission("documents.upload");

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await apiGet<{
        documents: { data: any[] } | any[];
        documentTypes?: any[];
        document_types?: any[];
        areas?: any[];
        groups?: any[];
        subgroups?: any[];
        roles?: any[];
      }>(config.endpoints.documents.list);
      const data = unwrapData(response) as {
        documents?: unknown;
        documentTypes?: unknown;
        document_types?: unknown;
        areas?: unknown;
        groups?: unknown;
        subgroups?: unknown;
        roles?: unknown;
      };
      const next = toList<any>(data?.documents).map(mapApiDocument).filter((item) => item.id > 0);
      const nextDocTypes = toList<any>(data?.documentTypes ?? data?.document_types).map((item) => ({
        id: Number(item?.id ?? 0),
        name: String(item?.name ?? ""),
        campo_types: toList<any>(item?.campo_types ?? item?.campoTypes).map((campo) => ({
          id: Number(campo?.id ?? 0),
          name: String(campo?.name ?? ""),
          data_type: String(campo?.data_type ?? "string") as CampoType["data_type"],
          is_nullable: Boolean(campo?.is_nullable ?? false),
          enum_values: Array.isArray(campo?.enum_values) ? campo.enum_values.map((value: unknown) => String(value)) : []
        }))
      })).filter((item) => item.id > 0);
      const nextAreas = toList<any>(data?.areas).map((item) => ({
        id: Number(item?.id ?? 0),
        descripcion: String(item?.descripcion ?? "")
      })).filter((item) => item.id > 0);
      const nextGroups = toList<any>(data?.groups).map((item) => ({
        id: Number(item?.id ?? 0),
        descripcion: String(item?.descripcion ?? "")
      })).filter((item) => item.id > 0);
      const nextSubgroups = toList<any>(data?.subgroups).map((item) => ({
        id: Number(item?.id ?? 0),
        descripcion: String(item?.descripcion ?? "")
      })).filter((item) => item.id > 0);
      const nextRoles = toList<any>(data?.roles).map((item) => ({
        id: Number(item?.id ?? 0),
        name: String(item?.name ?? "")
      })).filter((item) => item.id > 0);

      docTypes.splice(0, docTypes.length, ...nextDocTypes);
      areas.splice(0, areas.length, ...nextAreas);
      groups.splice(0, groups.length, ...nextGroups);
      subgroups.splice(0, subgroups.length, ...nextSubgroups);
      roles.splice(0, roles.length, ...nextRoles);
      setDocs(next);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadDocuments();
      } catch (error) {
        console.error("[DocumentsModule] Load error:", error);
      }
    };

    void load();
  }, []);

  const filtered = useMemo(
    () =>
      docs.filter((d) => {
        const dt = new Date(d.fecha);
        return (
          (!f.asunto || d.asunto.toLowerCase().includes(f.asunto.toLowerCase())) &&
          (!f.document_type_id || String(d.document_type_id) === f.document_type_id) &&
          (!f.area_id || String(d.area_id) === f.area_id) &&
          (!f.group_id || String(d.group_id) === f.group_id) &&
          (!f.subgroup_id || String(d.subgroup_id) === f.subgroup_id) &&
          (!f.role_id || String(d.role_id) === f.role_id) &&
          (!f.year || String(dt.getFullYear()) === f.year) &&
          (!f.month || String(dt.getMonth() + 1) === f.month)
        );
      }),
    [docs, f]
  );

  const years = useMemo(() => [...new Set(docs.map((d) => new Date(d.fecha).getFullYear()))].sort((a, b) => b - a), [docs]);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const validate = (form: FormState) => {
    if (!form.document_type_id) return "Seleccione un tipo de documento.";
    if (!form.n_documento.trim()) return "Ingrese el numero de documento.";
    if (!form.asunto.trim()) return "Ingrese el asunto.";
    if (!form.fecha) return "Ingrese la fecha.";
    const t = getType(form.document_type_id);
    if (!t) return "Tipo de documento invalido.";
    for (const c of t.campo_types) if (!c.is_nullable && !String(form.campos[c.id] ?? "").trim()) return `El campo ${c.name} es obligatorio.`;
    return null;
  };

  const camposFrom = (form: FormState, t: DocType): Campo[] => t.campo_types.map((c) => ({ campo_type_id: c.id, name: c.name, dato: form.campos[c.id] ?? "" }));

  const submitCreate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const err = validate(createForm);
    if (err) return setCreateErr(err);
    const t = getType(createForm.document_type_id);
    if (!t) return;
    void (async () => {
      try {
        await apiPost(config.endpoints.documents.create, {
          document_type_id: t.id,
          n_documento: createForm.n_documento.trim(),
          asunto: createForm.asunto.trim(),
          folios: createForm.folios.trim(),
          fecha: createForm.fecha,
          campos: t.campo_types.map((campoType) => ({
            id: campoType.id,
            dato: createForm.campos[campoType.id] ?? ""
          }))
        });
        await loadDocuments();
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
            : "No se pudo crear el documento.";
        setCreateErr(message);
      }
    })();
  };

  const submitEdit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!sel) return;
    const err = validate(editForm);
    if (err) return setEditErr(err);
    const t = getType(editForm.document_type_id);
    if (!t) return;
    void (async () => {
      try {
        await apiPut(withId(config.endpoints.documents.update, sel.id), {
          n_documento: editForm.n_documento.trim(),
          asunto: editForm.asunto.trim(),
          folios: editForm.folios.trim(),
          fecha: editForm.fecha,
          campos: t.campo_types.map((campoType) => ({
            id: campoType.id,
            dato: editForm.campos[campoType.id] ?? ""
          }))
        });

        if (canUploadDocument && editUploadFile) {
          const formData = new FormData();
          formData.append("root", editUploadFile);
          await apiPut(withId(config.endpoints.documents.upload, sel.id), formData);
        }

        await loadDocuments();
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
            : "No se pudo actualizar el documento.";
        setEditErr(message);
      }
    })();
  };

  const removeDocument = (document: Doc) => {
    if (!window.confirm(`Eliminar ${document.n_documento}?`)) return;
    void (async () => {
      try {
        await apiDelete(withId(config.endpoints.documents.delete, document.id));
        await loadDocuments();
      } catch (error) {
        console.error("[DocumentsModule] Delete error:", error);
        window.alert("No se pudo eliminar el documento.");
      }
    })();
  };

  const openEdit = (d: Doc) => {
    const m: Record<number, string> = {};
    d.campos.forEach((c) => (m[c.campo_type_id] = c.dato));
    setSel(d);
    setEditErr("");
    setEditUploadFile(null);
    setEditUploadFileName("");
    setEditForm({
      document_type_id: String(d.document_type_id),
      n_documento: d.n_documento,
      asunto: d.asunto,
      folios: d.folios,
      fecha: d.fecha,
      root_url: d.root_url,
      area_id: d.area_id ? String(d.area_id) : "",
      group_id: d.group_id ? String(d.group_id) : "",
      subgroup_id: d.subgroup_id ? String(d.subgroup_id) : "",
      role_id: d.role_id ? String(d.role_id) : "",
      campos: m
    });
    setEditOpen(true);
  };

  const createType = getType(createForm.document_type_id);
  const editType = getType(editForm.document_type_id);

  const renderCampo = (c: CampoType, form: FormState, setForm: React.Dispatch<React.SetStateAction<FormState>>) => {
    const value = form.campos[c.id] ?? "";
    const set = (v: string) => setForm((p) => ({ ...p, campos: { ...p.campos, [c.id]: v } }));
    if (c.data_type === "text") return <textarea rows={3} value={value} onChange={(e) => set(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" />;
    if (c.data_type === "boolean")
      return (
        <select value={value} onChange={(e) => set(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm">
          <option value="">Seleccione</option>
          <option value="Si">Si</option>
          <option value="No">No</option>
        </select>
      );
    if (c.data_type === "enum")
      return (
        <select value={value} onChange={(e) => set(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm">
          <option value="">Seleccione</option>
          {c.enum_values?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    return <input type={c.data_type === "int" ? "number" : "text"} value={value} onChange={(e) => set(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm" />;
  };

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-border bg-gradient-to-r from-slate-900 to-blue-700 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">Flujo documental</p>
            <h2 className="mt-2 text-2xl font-semibold">Gestion de documentos</h2>
          </div>
          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold">{isLoading ? <span className="inline-block h-4 w-16 animate-pulse rounded-full bg-white/30" /> : `${filtered.length} registros`}</span>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm"><p className="text-xs text-muted-foreground">Total de documentos</p><p className="mt-2 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : docs.length}</p></article>
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm"><p className="text-xs text-muted-foreground">Tipos disponibles</p><p className="mt-2 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : docTypes.length}</p></article>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <input value={f.asunto} onChange={(e) => setF((p) => ({ ...p, asunto: e.target.value }))} placeholder="Asunto" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
          <select value={f.document_type_id} onChange={(e) => setF((p) => ({ ...p, document_type_id: e.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="">Tipo</option>{docTypes.filter((x) => x.name !== "Bloque").map((x) => <option key={x.id} value={String(x.id)}>{x.name}</option>)}</select>
          <select value={f.area_id} onChange={(e) => setF((p) => ({ ...p, area_id: e.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="">Area</option>{areas.map((x) => <option key={x.id} value={String(x.id)}>{x.descripcion}</option>)}</select>
          <select value={f.role_id} onChange={(e) => setF((p) => ({ ...p, role_id: e.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="">Rol</option>{roles.map((x) => <option key={x.id} value={String(x.id)}>{x.name}</option>)}</select>
          <select value={f.group_id} onChange={(e) => setF((p) => ({ ...p, group_id: e.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="">Grupo</option>{groups.map((x) => <option key={x.id} value={String(x.id)}>{x.descripcion}</option>)}</select>
          <select value={f.subgroup_id} onChange={(e) => setF((p) => ({ ...p, subgroup_id: e.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="">Subgrupo</option>{subgroups.map((x) => <option key={x.id} value={String(x.id)}>{x.descripcion}</option>)}</select>
          <select value={f.year} onChange={(e) => setF((p) => ({ ...p, year: e.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="">Ano</option>{years.map((y) => <option key={y} value={String(y)}>{y}</option>)}</select>
          <select value={f.month} onChange={(e) => setF((p) => ({ ...p, month: e.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="">Mes</option>{months.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}</select>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!docTypes.length}
            title={!docTypes.length ? "Para ingresar un documento primero debe crear un tipo de documento." : ""}
            onClick={() => { setCreateErr(""); setCreateForm(empty); setCreateOpen(true); }}
            className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Ingresar documento
          </button>
          <button
            type="button"
            disabled={!filtered.length}
            title={!filtered.length ? "Para generar un reporte debe existir al menos un documento." : ""}
            onClick={() => void downloadDocumentsReport(f)}
            className="h-10 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Generar reporte
          </button>
          <button type="button" onClick={() => setF({ asunto: "", document_type_id: "", area_id: "", group_id: "", subgroup_id: "", role_id: "", year: "", month: "" })} className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground">Limpiar</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-muted/60"><tr className="text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="px-4 py-3">#</th><th className="px-4 py-3">N documento</th><th className="px-4 py-3">Asunto</th><th className="px-4 py-3">Folios</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead>
            <tbody>
              {isLoading ? Array.from({ length: 6 }).map((_, index) => (
                <tr key={`documents-loading-${index}`} className="border-t border-border">
                  <td colSpan={6} className="px-4 py-3">
                    <div className="h-8 animate-pulse rounded bg-muted/70" />
                  </td>
                </tr>
              )) : rows.length ? rows.map((d, i) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="px-4 py-3">{(page - 1) * pageSize + i + 1}</td><td className="px-4 py-3 font-semibold text-foreground">{d.n_documento}</td><td className="px-4 py-3">{d.asunto}</td><td className="px-4 py-3">{d.folios || "-"}</td><td className="px-4 py-3">{d.document_type_name}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => { setSel(d); setShowOpen(true); }} className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white">Ver</button><button type="button" onClick={() => openEdit(d)} className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white">Editar</button><button type="button" onClick={() => removeDocument(d)} className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">Eliminar</button></div></td>
                </tr>
              )) : <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No se encontraron documentos.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
        <p className="text-muted-foreground">Mostrando {rows.length} de {filtered.length} documentos</p>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Anterior</button>
          <span className="text-xs text-muted-foreground">Pagina {page} de {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Siguiente</button>
        </div>
      </div>

      <Modal open={createOpen} title="Ingresar documento" onClose={() => setCreateOpen(false)}>
        <form onSubmit={submitCreate} className="space-y-4">
          {createErr ? <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{createErr}</div> : null}
          <div className="grid gap-3 md:grid-cols-2">
            <select value={createForm.document_type_id} onChange={(e) => setCreateForm((p) => ({ ...p, document_type_id: e.target.value, campos: {} }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" required><option value="">Tipo</option>{docTypes.filter((x) => x.name !== "Bloque").map((x) => <option key={x.id} value={String(x.id)}>{x.name}</option>)}</select>
            <input value={createForm.n_documento} onChange={(e) => setCreateForm((p) => ({ ...p, n_documento: e.target.value.toUpperCase() }))} placeholder="N documento" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" required />
            <input value={createForm.asunto} onChange={(e) => setCreateForm((p) => ({ ...p, asunto: e.target.value }))} placeholder="Asunto" className="h-10 rounded-lg border border-border bg-background px-3 text-sm md:col-span-2" required />
            <input value={createForm.folios} onChange={(e) => setCreateForm((p) => ({ ...p, folios: e.target.value }))} placeholder="Folios" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
            <input type="date" value={createForm.fecha} onChange={(e) => setCreateForm((p) => ({ ...p, fecha: e.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" required />
          </div>
          <div className="rounded-xl border border-border bg-background p-4"><h4 className="mb-3 text-sm font-semibold text-foreground">Campos adicionales</h4><div className="grid gap-3 md:grid-cols-2">{createType?.campo_types.length ? createType.campo_types.map((c) => <div key={c.id} className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{c.name}</label>{renderCampo(c, createForm, setCreateForm)}</div>) : <p className="text-sm text-muted-foreground">Seleccione un tipo de documento.</p>}</div></div>
          <div className="flex justify-end"><button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Guardar</button></div>
        </form>
      </Modal>

      <Modal open={editOpen} title="Editar documento" onClose={() => setEditOpen(false)}>
        <form onSubmit={submitEdit} className="space-y-4">
          {editErr ? <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{editErr}</div> : null}
          <div className="grid gap-3 md:grid-cols-2">
            <select value={editForm.document_type_id} onChange={(e) => setEditForm((p) => ({ ...p, document_type_id: e.target.value, campos: {} }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" required><option value="">Tipo</option>{docTypes.filter((x) => x.name !== "Bloque").map((x) => <option key={x.id} value={String(x.id)}>{x.name}</option>)}</select>
            <input value={editForm.n_documento} onChange={(e) => setEditForm((p) => ({ ...p, n_documento: e.target.value.toUpperCase() }))} placeholder="N documento" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" required />
            <input value={editForm.asunto} onChange={(e) => setEditForm((p) => ({ ...p, asunto: e.target.value }))} placeholder="Asunto" className="h-10 rounded-lg border border-border bg-background px-3 text-sm md:col-span-2" required />
            <input value={editForm.folios} onChange={(e) => setEditForm((p) => ({ ...p, folios: e.target.value }))} placeholder="Folios" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
            <input type="date" value={editForm.fecha} onChange={(e) => setEditForm((p) => ({ ...p, fecha: e.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" required />
            <div className="md:col-span-2">
              {canUploadDocument ? (
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
          <div className="rounded-xl border border-border bg-background p-4"><h4 className="mb-3 text-sm font-semibold text-foreground">Campos adicionales</h4><div className="grid gap-3 md:grid-cols-2">{editType?.campo_types.length ? editType.campo_types.map((c) => <div key={c.id} className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{c.name}</label>{renderCampo(c, editForm, setEditForm)}</div>) : <p className="text-sm text-muted-foreground">Sin campos adicionales.</p>}</div></div>
          <div className="flex justify-end"><button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Guardar cambios</button></div>
        </form>
      </Modal>

      <Modal open={showOpen} title="Detalle del documento" onClose={() => setShowOpen(false)} maxWidth="max-w-4xl">
        {sel ? <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-border bg-background px-3 py-2"><p className="text-xs text-muted-foreground">N documento</p><p className="text-sm font-semibold text-foreground">{sel.n_documento}</p></div><div className="rounded-lg border border-border bg-background px-3 py-2"><p className="text-xs text-muted-foreground">Tipo</p><p className="text-sm font-semibold text-foreground">{sel.document_type_name}</p></div><div className="rounded-lg border border-border bg-background px-3 py-2 sm:col-span-2"><p className="text-xs text-muted-foreground">Asunto</p><p className="text-sm font-semibold text-foreground">{sel.asunto}</p></div></div><div className="rounded-lg border border-border bg-background px-3 py-3"><p className="mb-2 text-xs text-muted-foreground">Campos adicionales</p>{sel.campos.length ? <ul className="space-y-1 text-sm">{sel.campos.map((c) => <li key={c.campo_type_id}><span className="font-semibold text-foreground">{c.name}:</span> <span className="text-muted-foreground">{c.dato || "-"}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">Sin campos adicionales.</p>}</div></div> : null}
      </Modal>
    </section>
  );
}
