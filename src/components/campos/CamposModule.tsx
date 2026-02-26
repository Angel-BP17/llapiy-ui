import { useEffect, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { withId } from "@/config/llapiy-config";
import { getPaginationMeta, toList } from "@/lib/llapiy-api";
import { ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { MetadataService } from "@/services/MetadataService";

type DataType = "string" | "text" | "char" | "int" | "float" | "double" | "boolean" | "enum";

type CampoRecord = {
  id: number;
  name: string;
  data_type: DataType;
  is_nullable: boolean;
  length: number | null;
  allow_negative: boolean;
  allow_zero: boolean;
  enum_values: string[];
  document_types_count: number;
};

type CampoForm = {
  name: string;
  data_type: DataType;
  is_nullable: boolean;
  length: string;
  allow_negative: boolean;
  allow_zero: boolean;
  enum_values_text: string;
};

const dataTypes: DataType[] = ["string", "text", "char", "int", "float", "double", "boolean", "enum"];

const emptyForm: CampoForm = {
  name: "",
  data_type: "string",
  is_nullable: true,
  length: "",
  allow_negative: false,
  allow_zero: true,
  enum_values_text: ""
};
const emptyPagination = { currentPage: 1, lastPage: 1, perPage: 0, total: 0, from: 0, to: 0 };

function toForm(campo: CampoRecord): CampoForm {
  return {
    name: campo.name,
    data_type: campo.data_type,
    is_nullable: campo.is_nullable,
    length: campo.length ? String(campo.length) : "",
    allow_negative: campo.allow_negative,
    allow_zero: campo.allow_zero,
    enum_values_text: campo.enum_values.join(", ")
  };
}

function parseEnumValues(input: string): string[] {
  return input
    .split(/\r?\n|,/g)
    .map((value) => value.trim())
    .filter(Boolean);
}

function validateForm(form: CampoForm): string | null {
  if (!form.name.trim()) return "Ingrese el nombre del campo.";
  if (form.length && Number(form.length) < 1) return "La longitud debe ser mayor a 0.";
  if (form.data_type === "char" && form.length && Number(form.length) > 1) return "Para CHAR la longitud maxima es 1.";
  if (form.data_type === "enum" && !parseEnumValues(form.enum_values_text).length) return "Ingrese valores para el enum.";
  return null;
}

function CampoFormFields({
  form,
  setForm,
  error,
  submitLabel
}: {
  form: CampoForm;
  setForm: Dispatch<SetStateAction<CampoForm>>;
  error: string;
  submitLabel: string;
}) {
  const isNumericType = ["int", "float", "double"].includes(form.data_type);
  const isEnumType = form.data_type === "enum";

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      <div className="grid gap-3">
        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">Nombre del campo</label>
          <input
            value={form.name}
            onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            placeholder="Ej. Prioridad"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">Tipo de dato</label>
          <select
            value={form.data_type}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                data_type: event.target.value as DataType,
                allow_negative: ["int", "float", "double"].includes(event.target.value) ? previous.allow_negative : false,
                allow_zero: ["int", "float", "double"].includes(event.target.value) ? previous.allow_zero : true,
                enum_values_text: event.target.value === "enum" ? previous.enum_values_text : ""
              }))
            }
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
          >
            {dataTypes.map((type) => (
              <option key={type} value={type}>
                {type.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">Longitud (opcional)</label>
          <input
            type="number"
            min={1}
            value={form.length}
            onChange={(event) => setForm((previous) => ({ ...previous, length: event.target.value }))}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={form.is_nullable}
            onChange={(event) => setForm((previous) => ({ ...previous, is_nullable: event.target.checked }))}
            className="h-4 w-4 rounded border-border"
          />
          Permitir valor nulo
        </label>

        {isNumericType ? (
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Opciones para numeros</p>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.allow_negative}
                onChange={(event) => setForm((previous) => ({ ...previous, allow_negative: event.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              Permitir valores negativos
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.allow_zero}
                onChange={(event) => setForm((previous) => ({ ...previous, allow_zero: event.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              Permitir valor 0
            </label>
          </div>
        ) : null}

        {isEnumType ? (
          <div className="rounded-lg border border-border bg-background p-3">
            <label className="mb-1 block text-sm font-semibold text-foreground">Valores del enum</label>
            <textarea
              rows={3}
              value={form.enum_values_text}
              onChange={(event) => setForm((previous) => ({ ...previous, enum_values_text: event.target.value }))}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              placeholder="Pendiente, Aprobado, Rechazado"
            />
            <p className="mt-1 text-xs text-muted-foreground">Separa por comas o saltos de linea.</p>
          </div>
        ) : null}
      </div>

      <div className="flex justify-end">
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

function configSummary(campo: CampoRecord) {
  const tokens: string[] = [];
  tokens.push(campo.is_nullable ? "Nullable" : "No nullable");
  if (campo.length) tokens.push(`Longitud: ${campo.length}`);
  if (["int", "float", "double"].includes(campo.data_type)) {
    tokens.push(campo.allow_negative ? "Permite negativos" : "Sin negativos");
    tokens.push(campo.allow_zero ? "Permite cero" : "Sin cero");
  }
  return tokens.join(" | ");
}

export default function CamposModule() {
  const [campos, setCampos] = useState<CampoRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(emptyPagination);
  const [totalCamposCount, setTotalCamposCount] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<CampoRecord | null>(null);
  const [createForm, setCreateForm] = useState<CampoForm>(emptyForm);
  const [editForm, setEditForm] = useState<CampoForm>(emptyForm);
  const [createError, setCreateError] = useState("");
  const [editError, setEditError] = useState("");

  const loadCampos = async (searchValue = "", pageValue = currentPage) => {
    setIsLoading(true);
    try {
      const data = await MetadataService.getCampos(searchValue, pageValue);
      const next = toList<any>(data?.campos).map((item) => ({
        id: Number(item?.id ?? 0),
        name: String(item?.name ?? ""),
        data_type: String(item?.data_type ?? "string") as DataType,
        is_nullable: Boolean(item?.is_nullable ?? true),
        length: item?.length ? Number(item.length) : null,
        allow_negative: Boolean(item?.allow_negative ?? false),
        allow_zero: Boolean(item?.allow_zero ?? true),
        enum_values: Array.isArray(item?.enum_values) ? item.enum_values.map((value: unknown) => String(value)) : [],
        document_types_count: Number(item?.document_types_count ?? 0)
      }));
      setCampos(next);
      const nextPagination = getPaginationMeta(data?.campos);
      setPagination(nextPagination);
      setTotalCamposCount(Number(data?.totalCampos ?? nextPagination.total ?? 0));
    } catch (error) {
      console.error("[CamposModule] Load error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCampos(appliedSearch, currentPage);
  }, [appliedSearch, currentPage]);

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateForm(createForm);
    if (error) {
      setCreateError(error);
      return;
    }

    void (async () => {
      try {
        await MetadataService.createCampo({
          name: createForm.name.trim(),
          data_type: createForm.data_type,
          is_nullable: createForm.is_nullable,
          length: createForm.length ? Number(createForm.length) : undefined,
          allow_negative: createForm.allow_negative,
          allow_zero: createForm.allow_zero,
          enum_values: createForm.enum_values_text || undefined
        });
        await loadCampos(appliedSearch, currentPage);
        setCreateOpen(false);
        setCreateForm(emptyForm);
        setCreateError("");
      } catch (apiError: any) {
        setCreateError(apiError?.message || "No se pudo crear el campo.");
      }
    })();
  };

  const submitEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const error = validateForm(editForm);
    if (error) {
      setEditError(error);
      return;
    }

    void (async () => {
      try {
        await MetadataService.updateCampo(selected.id, {
          name: editForm.name.trim(),
          data_type: editForm.data_type,
          is_nullable: editForm.is_nullable,
          length: editForm.length ? Number(editForm.length) : undefined,
          allow_negative: editForm.allow_negative,
          allow_zero: editForm.allow_zero,
          enum_values: editForm.enum_values_text || undefined
        });
        await loadCampos(appliedSearch, currentPage);
        setEditOpen(false);
        setSelected(null);
        setEditError("");
      } catch (apiError: any) {
        setEditError(apiError?.message || "No se pudo actualizar el campo.");
      }
    })();
  };

  const deleteCampo = (campo: CampoRecord) => {
    if (campo.document_types_count > 0) return;
    if (!window.confirm(`Eliminar el campo ${campo.name}?`)) return;
    void (async () => {
      try {
        await MetadataService.deleteCampo(campo.id);
        await loadCampos(appliedSearch, currentPage);
      } catch (error) {
        console.error("[CamposModule] Delete error:", error);
        window.alert("No se pudo eliminar el campo.");
      }
    })();
  };

  const totalPages = Math.max(1, pagination.lastPage);

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-border bg-gradient-to-r from-slate-900 to-cyan-700 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">Definicion de metadatos</p>
            <h2 className="mt-2 text-2xl font-semibold">Campos adicionales</h2>
            <p className="mt-1 text-sm text-white/75">Configura campos reutilizables para la gestion documental.</p>
          </div>
          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold">{isLoading ? <span className="inline-block h-4 w-16 animate-pulse rounded-full bg-white/30" /> : `${pagination.total} registros`}</span>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ListChecks className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total de campos</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : totalCamposCount}</p>
            </div>
          </div>
        </article>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full lg:max-w-lg">
            <label className="mb-2 block text-sm font-semibold text-foreground">Buscar</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm" placeholder="Nombre del campo" />
              <button type="button" onClick={() => { setAppliedSearch(search); setCurrentPage(1); }} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
                Aplicar
              </button>
              <button type="button" onClick={() => { setSearch(""); setAppliedSearch(""); setCurrentPage(1); }} className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground">
                Limpiar
              </button>
            </div>
          </div>
          <button type="button" onClick={() => { setCreateError(""); setCreateForm(emptyForm); setCreateOpen(true); }} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" />
            Crear nuevo campo
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
                <th className="px-4 py-3">Tipo de dato</th>
                <th className="px-4 py-3">Configuracion</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`campos-loading-${index}`} className="border-t border-border">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="h-8 animate-pulse rounded bg-muted/70" />
                    </td>
                  </tr>
                ))
              ) : campos.length ? (
                campos.map((campo, index) => (
                  <tr key={campo.id} className="border-t border-border">
                    <td className="px-4 py-3">{(pagination.from || 1) + index}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{campo.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold uppercase text-sky-700">
                        {campo.data_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-muted-foreground">{configSummary(campo)}</p>
                      {campo.data_type === "enum" && campo.enum_values.length ? (
                        <p className="mt-1 text-xs text-muted-foreground">Valores: {campo.enum_values.join(", ")}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => { setSelected(campo); setEditError(""); setEditForm(toForm(campo)); setEditOpen(true); }} className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white">
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCampo(campo)}
                          disabled={campo.document_types_count > 0}
                          title={campo.document_types_count > 0 ? "No se puede eliminar porque tiene tipos de documentos asociados" : ""}
                          className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
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
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No se encontraron campos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
        <p className="text-muted-foreground">Mostrando {campos.length} de {pagination.total} campos</p>
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

      <Modal open={createOpen} title="Crear nuevo campo" onClose={() => setCreateOpen(false)}>
        <form onSubmit={submitCreate}>
          <CampoFormFields form={createForm} setForm={setCreateForm} error={createError} submitLabel="Guardar" />
        </form>
      </Modal>

      <Modal open={editOpen} title="Editar campo" onClose={() => setEditOpen(false)}>
        <form onSubmit={submitEdit}>
          <CampoFormFields form={editForm} setForm={setEditForm} error={editError} submitLabel="Actualizar" />
        </form>
      </Modal>
    </section>
  );
}
