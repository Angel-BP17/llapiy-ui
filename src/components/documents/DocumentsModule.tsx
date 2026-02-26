import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { getPaginationMeta, toList } from "@/lib/llapiy-api";
import { useAuthPermissions } from "@/lib/use-auth-permissions";
import { Eye, FileDown, FileText, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ArchiveService } from "@/services/ArchiveService";
import { AreaService } from "@/services/AreaService";

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

const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const empty: FormState = { document_type_id: "", n_documento: "", asunto: "", folios: "", fecha: "", root_url: "", area_id: "", group_id: "", subgroup_id: "", role_id: "", campos: {} };
const emptyFilters = { asunto: "", document_type_id: "", area_id: "", group_id: "", subgroup_id: "", year: "", month: "" };
const emptyPagination = { currentPage: 1, lastPage: 1, perPage: 0, total: 0, from: 0, to: 0 };

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

export default function DocumentsModule() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
  const [allAreas, setAllAreas] = useState<any[]>([]);
  const [allGroups, setAllGroups] = useState<any[]>([]);
  const [allSubgroups, setAllSubgroups] = useState<any[]>([]);
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [f, setF] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination);
  const [years, setYears] = useState<number[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [sel, setSel] = useState<Doc | null>(null);
  const [createForm, setCreateForm] = useState<FormState>(empty);
  const [editForm, setEditForm] = useState<FormState>(empty);
  const [createErr, setCreateErr] = useState("");
  const [editErr, setEditErr] = useState("");
  const [createUploadFile, setCreateUploadFile] = useState<File | null>(null);
  const [createUploadFileName, setCreateUploadFileName] = useState("");
  const [editUploadFile, setEditUploadFile] = useState<File | null>(null);
  const [editUploadFileName, setEditUploadFileName] = useState("");
  const { can: canByPermission } = useAuthPermissions();

  const canUploadDocument = canByPermission("documents.upload");

  const loadInitialData = async () => {
    try {
      const data = await AreaService.getFullStructure();
      setAllAreas(data.areas);
      setAllGroups(data.groups);
      setAllSubgroups(data.subgroups);
    } catch (error) {
      console.error("[DocumentsModule] Organizational structure load error:", error);
    }
  };

  const loadDocuments = async (filtersValue = appliedFilters, pageValue = page) => {
    setIsLoading(true);
    try {
      const data = await ArchiveService.getDocuments(filtersValue, pageValue);
      const nextPagination = getPaginationMeta(data?.documents);
      const next = toList<any>(data?.documents).map(mapApiDocument).filter((item) => item.id > 0);
      const nextDocTypes = toList<any>(data?.createDocumentTypes ?? data?.documentTypes ?? data?.document_types).map((item) => ({
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
      const nextRoles = toList<any>(data?.roles).map((item) => ({
        id: Number(item?.id ?? 0),
        name: String(item?.name ?? "")
      })).filter((item) => item.id > 0);

      setDocTypes(nextDocTypes);
      setRoles(nextRoles);
      
      setDocs(next);
      setPagination(nextPagination);
      setYears(
        toList<any>(data?.years)
          .map((value) => Number(value ?? 0))
          .filter((value) => value > 0)
          .sort((a, b) => b - a)
      );
      setTotalDocuments(Number(data?.totalDocuments ?? nextPagination.total ?? 0));
    } catch (error) {
      console.error("[DocumentsModule] Load error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    void loadDocuments(appliedFilters, page);
  }, [appliedFilters, page]);

  const filteredGroups = useMemo(() => {
    if (!f.area_id) return [];
    return allGroups.filter(g => g.area_id === Number(f.area_id));
  }, [f.area_id, allGroups]);

  const filteredSubgroups = useMemo(() => {
    if (!f.group_id) return [];
    return allSubgroups.filter(s => s.group_id === Number(f.group_id));
  }, [f.group_id, allSubgroups]);

  const handleFilterChange = (field: string, value: string) => {
    setF(prev => {
      const next = { ...prev, [field]: value };
      if (field === "area_id") {
        next.group_id = "";
        next.subgroup_id = "";
      }
      if (field === "group_id") {
        next.subgroup_id = "";
      }
      return next;
    });
  };

  const totalPages = Math.max(1, pagination.lastPage);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const getType = (id: string) => docTypes.find((x) => String(x.id) === id) ?? null;

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

  const submitCreate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const err = validate(createForm);
    if (err) return setCreateErr(err);
    const t = getType(createForm.document_type_id);
    if (!t) return;
    void (async () => {
      try {
        const response: any = await ArchiveService.createDocument({
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

        const newDocId = response?.data?.id || response?.id;
        if (newDocId && canUploadDocument && createUploadFile) {
          await ArchiveService.uploadDocumentFile(newDocId, createUploadFile);
        }

        await loadDocuments(appliedFilters, page);
        setCreateErr("");
        setCreateForm(empty);
        setCreateUploadFile(null);
        setCreateUploadFileName("");
        setCreateOpen(false);
      } catch (apiError: any) {
        setCreateErr(apiError?.message || "No se pudo crear el documento.");
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
        await ArchiveService.updateDocument(sel.id, {
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
          await ArchiveService.uploadDocumentFile(sel.id, editUploadFile);
        }

        await loadDocuments(appliedFilters, page);
        setEditErr("");
        setEditOpen(false);
        setSel(null);
        setEditUploadFile(null);
        setEditUploadFileName("");
      } catch (apiError: any) {
        setEditErr(apiError?.message || "No se pudo actualizar el documento.");
      }
    })();
  };

  const removeDocument = (document: Doc) => {
    if (!window.confirm(`Eliminar ${document.n_documento}?`)) return;
    void (async () => {
      try {
        await ArchiveService.deleteDocument(document.id);
        await loadDocuments(appliedFilters, page);
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

  const handleDownloadReport = () => {
    void ArchiveService.downloadDocumentsReport(appliedFilters).catch((error) => {
       console.error("[DocumentsModule] Report error:", error);
       window.alert("No se pudo generar el reporte.");
    });
  };

  const createType = getType(createForm.document_type_id);
  const editType = getType(editForm.document_type_id);
  const selectableDocTypes = docTypes.filter((x) => x.name !== "Bloque");

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
          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold">{isLoading ? <span className="inline-block h-4 w-16 animate-pulse rounded-full bg-white/30" /> : `${pagination.total} registros`}</span>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total de documentos</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : totalDocuments}</p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Tags className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tipos disponibles</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : docTypes.length}</p>
            </div>
          </div>
        </article>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <input value={f.asunto} onChange={(e) => setF((p) => ({ ...p, asunto: e.target.value }))} placeholder="Asunto" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
          <select value={f.document_type_id} onChange={(e) => setF((p) => ({ ...p, document_type_id: e.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="">Tipo</option>{selectableDocTypes.map((x) => <option key={x.id} value={String(x.id)}>{x.name}</option>)}</select>
          
          {/* Filtros dependientes */}
          <select value={f.area_id} onChange={(e) => handleFilterChange("area_id", e.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
            <option value="">Area</option>
            {allAreas.map((x) => <option key={x.id} value={String(x.id)}>{x.descripcion}</option>)}
          </select>
          
          <select 
            value={f.group_id} 
            onChange={(e) => handleFilterChange("group_id", e.target.value)} 
            disabled={!f.area_id}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm disabled:opacity-50"
          >
            <option value="">Grupo</option>
            {filteredGroups.map((x) => <option key={x.id} value={String(x.id)}>{x.descripcion}</option>)}
          </select>
          
          <select 
            value={f.subgroup_id} 
            onChange={(e) => setF((p) => ({ ...p, subgroup_id: e.target.value }))} 
            disabled={!f.group_id}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm disabled:opacity-50"
          >
            <option value="">Subgrupo</option>
            {filteredSubgroups.map((x) => <option key={x.id} value={String(x.id)}>{x.descripcion}</option>)}
          </select>

          <select value={f.year} onChange={(e) => setF((p) => ({ ...p, year: e.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="">Periodo</option>{years.map((y) => <option key={y} value={String(y)}>{y}</option>)}</select>
          <select value={f.month} onChange={(e) => setF((p) => ({ ...p, month: e.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="">Mes</option>{months.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}</select>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => { setPage(1); setAppliedFilters({ ...f }); }} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Aplicar filtros</button>
          <button
            type="button"
            disabled={!selectableDocTypes.length}
            title={!selectableDocTypes.length ? "Para ingresar un documento primero debe crear un tipo de documento." : ""}
            onClick={() => { setCreateErr(""); setCreateForm(empty); setCreateOpen(true); }}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Ingresar documento
          </button>
          <button
            type="button"
            disabled={!pagination.total}
            title={!pagination.total ? "Para generar un reporte debe existir al menos un documento." : ""}
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
            <thead className="bg-muted/60"><tr className="text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="px-4 py-3">#</th><th className="px-4 py-3">N documento</th><th className="px-4 py-3">Asunto</th><th className="px-4 py-3">Folios</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead>
            <tbody>
              {isLoading ? Array.from({ length: 6 }).map((_, index) => (
                <tr key={`documents-loading-${index}`} className="border-t border-border">
                  <td colSpan={6} className="px-4 py-3">
                    <div className="h-8 animate-pulse rounded bg-muted/70" />
                  </td>
                </tr>
              )) : docs.length ? docs.map((d, i) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="px-4 py-3">{(pagination.from || 1) + i}</td><td className="px-4 py-3 font-semibold text-foreground">{d.n_documento}</td><td className="px-4 py-3">{d.asunto}</td><td className="px-4 py-3">{d.folios || "-"}</td><td className="px-4 py-3">{d.document_type_name}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => { setSel(d); setShowOpen(true); }} className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white">
                        <Eye className="h-3.5 w-3.5" />
                        Ver
                      </button>
                      <button type="button" onClick={() => openEdit(d)} className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white">
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button type="button" onClick={() => removeDocument(d)} className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              )) : <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No se encontraron documentos.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
        <p className="text-muted-foreground">Mostrando {docs.length} de {pagination.total} documentos</p>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Anterior</button>
          <span className="text-xs text-muted-foreground">Pagina {page} de {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, page + 1))} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Siguiente</button>
        </div>
      </div>

      <Modal open={createOpen} title="Ingresar documento" onClose={() => setCreateOpen(false)}>
        <form onSubmit={submitCreate} className="space-y-4">
          {createErr ? <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{createErr}</div> : null}
          <div className="grid gap-3 md:grid-cols-2">
            <select value={createForm.document_type_id} onChange={(e) => setCreateForm((p) => ({ ...p, document_type_id: e.target.value, campos: {} }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" required><option value="">Tipo</option>{selectableDocTypes.map((x) => <option key={x.id} value={String(x.id)}>{x.name}</option>)}</select>
            <input value={createForm.n_documento} onChange={(e) => setCreateForm((p) => ({ ...p, n_documento: e.target.value.toUpperCase() }))} placeholder="N documento" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" required />
            <input value={createForm.asunto} onChange={(e) => setCreateForm((p) => ({ ...p, asunto: e.target.value }))} placeholder="Asunto" className="h-10 rounded-lg border border-border bg-background px-3 text-sm md:col-span-2" required />
            <input value={createForm.folios} onChange={(e) => setCreateForm((p) => ({ ...p, folios: e.target.value }))} placeholder="Folios" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
            <input type="date" value={createForm.fecha} onChange={(e) => setCreateForm((p) => ({ ...p, fecha: e.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" required />
            <div className="md:col-span-2">
              {canUploadDocument ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Adjuntar archivo (.pdf)</label>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setCreateUploadFile(file);
                      setCreateUploadFileName(file?.name ?? "");
                    }}
                    className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  {createUploadFileName ? <p className="text-xs text-muted-foreground">Seleccionado: {createUploadFileName}</p> : null}
                </div>
              ) : null}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-background p-4"><h4 className="mb-3 text-sm font-semibold text-foreground">Campos adicionales</h4><div className="grid gap-3 md:grid-cols-2">{createType?.campo_types.length ? createType.campo_types.map((c) => <div key={c.id} className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{c.name}</label>{renderCampo(c, createForm, setCreateForm)}</div>) : <p className="text-sm text-muted-foreground">Seleccione un tipo de documento.</p>}</div></div>
          <div className="flex justify-end"><button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Guardar</button></div>
        </form>
      </Modal>

      <Modal open={editOpen} title="Editar documento" onClose={() => setEditOpen(false)}>
        <form onSubmit={submitEdit} className="space-y-4">
          {editErr ? <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{editErr}</div> : null}
          <div className="grid gap-3 md:grid-cols-2">
            <select value={editForm.document_type_id} onChange={(e) => setEditForm((p) => ({ ...p, document_type_id: e.target.value, campos: {} }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" required><option value="">Tipo</option>{selectableDocTypes.map((x) => <option key={x.id} value={String(x.id)}>{x.name}</option>)}</select>
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
