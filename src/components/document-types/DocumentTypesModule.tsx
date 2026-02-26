import { useEffect, useMemo, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { getPaginationMeta, toList } from "@/lib/llapiy-api";
import { Eye, FileText, ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { MetadataService } from "@/services/MetadataService";

type Subgroup = {
  id: number;
  descripcion: string;
  subgroups?: Subgroup[];
};

type Group = {
  id: number;
  descripcion: string;
  subgroups: Subgroup[];
};

type AreaGroupType = {
  id: number;
  group_type: {
    id: number;
    descripcion: string;
  };
  groups: Group[];
};

type Area = {
  id: number;
  descripcion: string;
  area_group_types: AreaGroupType[];
};

type CampoType = {
  id: number;
  name: string;
  data_type: string;
};

type DocumentTypeRecord = {
  id: number;
  name: string;
  campoTypeIds: number[];
  groupIds: number[];
  subgroupIds: number[];
  documentsCount: number;
};

type DocumentTypeForm = {
  name: string;
  campoTypeIds: number[];
  groupIds: number[];
  subgroupIds: number[];
};

type Filters = {
  name: string;
  areaId: string;
  groupId: string;
  subgroupId: string;
};

const emptyForm: DocumentTypeForm = {
  name: "",
  campoTypeIds: [],
  groupIds: [],
  subgroupIds: []
};
const emptyFilters: Filters = { name: "", areaId: "", groupId: "", subgroupId: "" };
const emptyPagination = { currentPage: 1, lastPage: 1, perPage: 0, total: 0, from: 0, to: 0 };

function flattenSubgroups(subgroups: Subgroup[]): Subgroup[] {
  const all: Subgroup[] = [];
  for (const subgroup of subgroups) {
    all.push(subgroup);
    if (subgroup.subgroups?.length) {
      all.push(...flattenSubgroups(subgroup.subgroups));
    }
  }
  return all;
}

function getAreaGroups(area: Area): Group[] {
  return (area.area_group_types || []).flatMap((areaGroupType) => areaGroupType.groups || []);
}

function DocumentTypeFormFields({
  form,
  setForm,
  error,
  submitLabel,
  areas,
  campoTypes
}: {
  form: DocumentTypeForm;
  setForm: Dispatch<SetStateAction<DocumentTypeForm>>;
  error: string;
  submitLabel: string;
  areas: Area[];
  campoTypes: CampoType[];
}) {
  const [treeSearch, setTreeSearch] = useState("");
  const [campoSearch, setCampoSearch] = useState("");

  const groupMap = useMemo(() => {
    const map = new Map<number, Group>();
    areas.forEach((area) => getAreaGroups(area).forEach((group) => map.set(group.id, group)));
    return map;
  }, [areas]);

  const subgroupMap = useMemo(() => {
    const map = new Map<number, Subgroup>();
    areas.forEach((area) => {
      getAreaGroups(area).forEach((group) => {
        flattenSubgroups(group.subgroups).forEach((subgroup) => map.set(subgroup.id, subgroup));
      });
    });
    return map;
  }, [areas]);

  const filteredAreas = useMemo(() => {
    const query = treeSearch.trim().toLowerCase();
    if (!query) return areas;

    return areas.filter((area) => {
      if (area.descripcion.toLowerCase().includes(query)) return true;
      return getAreaGroups(area).some((group) => {
        if (group.descripcion.toLowerCase().includes(query)) return true;
        return flattenSubgroups(group.subgroups).some((subgroup) => subgroup.descripcion.toLowerCase().includes(query));
      });
    });
  }, [treeSearch, areas]);

  const filteredCampos = useMemo(() => {
    const query = campoSearch.trim().toLowerCase();
    if (!query) return campoTypes;
    return campoTypes.filter((campo) => campo.name.toLowerCase().includes(query));
  }, [campoSearch, campoTypes]);

  const toggleSubgroupRecursive = (subgroup: Subgroup, checked: boolean) => {
    setForm((previous) => {
      const next = { ...previous };
      const subgroupSet = new Set(previous.subgroupIds);

      const apply = (item: Subgroup) => {
        if (checked) subgroupSet.add(item.id);
        else subgroupSet.delete(item.id);
        item.subgroups?.forEach(apply);
      };

      apply(subgroup);
      next.subgroupIds = [...subgroupSet];
      return next;
    });
  };

  const toggleGroup = (group: Group, checked: boolean) => {
    setForm((previous) => {
      const groupSet = new Set(previous.groupIds);
      const subgroupSet = new Set(previous.subgroupIds);
      const subgroupIds = flattenSubgroups(group.subgroups).map((subgroup) => subgroup.id);

      if (checked) {
        groupSet.add(group.id);
        subgroupIds.forEach((id) => subgroupSet.add(id));
      } else {
        groupSet.delete(group.id);
        subgroupIds.forEach((id) => subgroupSet.delete(id));
      }

      return {
        ...previous,
        groupIds: [...groupSet],
        subgroupIds: [...subgroupSet]
      };
    });
  };

  const toggleArea = (area: Area, checked: boolean) => {
    const groups = getAreaGroups(area);
    setForm((previous) => {
      const groupSet = new Set(previous.groupIds);
      const subgroupSet = new Set(previous.subgroupIds);
      const subgroupIds = groups.flatMap((group) => flattenSubgroups(group.subgroups).map((subgroup) => subgroup.id));

      groups.forEach((group) => {
        if (checked) groupSet.add(group.id);
        else groupSet.delete(group.id);
      });

      subgroupIds.forEach((id) => {
        if (checked) subgroupSet.add(id);
        else subgroupSet.delete(id);
      });

      return {
        ...previous,
        groupIds: [...groupSet],
        subgroupIds: [...subgroupSet]
      };
    });
  };

  const toggleCampo = (campoId: number, checked: boolean) => {
    setForm((previous) => {
      const campoSet = new Set(previous.campoTypeIds);
      if (checked) campoSet.add(campoId);
      else campoSet.delete(campoId);
      return { ...previous, campoTypeIds: [...campoSet] };
    });
  };

  const selectedGroupLabels = form.groupIds.map((groupId) => groupMap.get(groupId)?.descripcion).filter(Boolean) as string[];
  const selectedSubgroupLabels = form.subgroupIds.map((subgroupId) => subgroupMap.get(subgroupId)?.descripcion).filter(Boolean) as string[];
  const selectedCampoLabels = form.campoTypeIds.map((campoId) => campoTypes.find((campo) => campo.id === campoId)?.name).filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      <div className="space-y-1">
        <label className="text-sm font-semibold text-foreground">Nombre del tipo de documento</label>
        <input
          type="text"
          value={form.name}
          onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
          placeholder="Ej. Informe tecnico"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Areas, grupos y subgrupos</h4>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm((previous) => ({ ...previous, groupIds: [], subgroupIds: [] }))} className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground">
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => {
                  const allGroups = areas.flatMap((area) => getAreaGroups(area).map((group) => group.id));
                  const allSubgroups = areas.flatMap((area) =>
                    getAreaGroups(area).flatMap((group) => flattenSubgroups(group.subgroups).map((subgroup) => subgroup.id))
                  );
                  setForm((previous) => ({ ...previous, groupIds: allGroups, subgroupIds: allSubgroups }));
                }}
                className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground"
              >
                Todo
              </button>
            </div>
          </div>
          <input value={treeSearch} onChange={(event) => setTreeSearch(event.target.value)} className="mb-3 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm" placeholder="Buscar area, grupo o subgrupo" />
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {filteredAreas.map((area) => {
              const groups = getAreaGroups(area);
              const areaGroupIds = groups.map((group) => group.id);
              const areaSubgroupIds = groups.flatMap((group) => flattenSubgroups(group.subgroups).map((subgroup) => subgroup.id));
              const areaChecked = areaGroupIds.length > 0 && areaGroupIds.every((id) => form.groupIds.includes(id)) && areaSubgroupIds.every((id) => form.subgroupIds.includes(id));

              return (
                <div key={area.id} className="rounded-lg border border-border bg-card p-3">
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <input type="checkbox" checked={areaChecked} onChange={(event) => toggleArea(area, event.target.checked)} className="h-4 w-4 rounded border-border" />
                    {area.descripcion}
                  </label>
                  <div className="space-y-2 pl-6">
                    {groups.map((group) => (
                      <div key={group.id}>
                        <label className="flex items-center gap-2 text-sm text-foreground">
                          <input
                            type="checkbox"
                            checked={form.groupIds.includes(group.id)}
                            onChange={(event) => toggleGroup(group, event.target.checked)}
                            className="h-4 w-4 rounded border-border"
                          />
                          Grupo: {group.descripcion}
                        </label>
                        <div className="space-y-1 pl-6 pt-1">
                          {flattenSubgroups(group.subgroups).map((subgroup) => (
                            <label key={subgroup.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={form.subgroupIds.includes(subgroup.id)}
                                onChange={(event) => toggleSubgroupRecursive(subgroup, event.target.checked)}
                                className="h-3.5 w-3.5 rounded border-border"
                              />
                              Subgrupo: {subgroup.descripcion}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 rounded-lg border border-dashed border-border bg-card px-3 py-2">
            <p className="text-xs font-semibold text-foreground">Seleccionados ({selectedGroupLabels.length + selectedSubgroupLabels.length})</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedGroupLabels.map((label) => (
                <span key={`group-${label}`} className="rounded-full bg-blue-100 px-2 py-1 text-[11px] text-blue-700">
                  {label}
                </span>
              ))}
              {selectedSubgroupLabels.map((label) => (
                <span key={`subgroup-${label}`} className="rounded-full bg-sky-100 px-2 py-1 text-[11px] text-sky-700">
                  {label}
                </span>
              ))}
              {!selectedGroupLabels.length && !selectedSubgroupLabels.length ? <span className="text-xs text-muted-foreground">Sin seleccion.</span> : null}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Campos</h4>
            <button type="button" onClick={() => setForm((previous) => ({ ...previous, campoTypeIds: [] }))} className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground">
              Limpiar
            </button>
          </div>
          <input value={campoSearch} onChange={(event) => setCampoSearch(event.target.value)} className="mb-3 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm" placeholder="Buscar campo por nombre" />
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border bg-card p-3">
            {filteredCampos.map((campo) => (
              <label key={campo.id} className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.campoTypeIds.includes(campo.id)}
                  onChange={(event) => toggleCampo(campo.id, event.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                {campo.name}
                <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">{campo.data_type}</span>
              </label>
            ))}
            {!filteredCampos.length ? <p className="text-sm text-muted-foreground">No hay resultados.</p> : null}
          </div>
          <div className="mt-3 rounded-lg border border-dashed border-border bg-card px-3 py-2">
            <p className="text-xs font-semibold text-foreground">Campos seleccionados ({selectedCampoLabels.length})</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedCampoLabels.map((label) => (
                <span key={label} className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] text-emerald-700">
                  {label}
                </span>
              ))}
              {!selectedCampoLabels.length ? <span className="text-xs text-muted-foreground">Sin seleccion.</span> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

function toDocumentTypePayload(form: DocumentTypeForm) {
  return {
    name: form.name.trim(),
    campos: JSON.stringify(toUniqueIds(form.campoTypeIds)),
    groups: JSON.stringify(toUniqueIds(form.groupIds)),
    subgroups: JSON.stringify(toUniqueIds(form.subgroupIds))
  };
}

function toUniqueIds(values: number[]) {
  return [...new Set(values.filter((value) => Number.isFinite(value) && value > 0))];
}

function validateDocumentTypeForm(form: DocumentTypeForm): string | null {
  if (!form.name.trim()) return "Ingrese el nombre del tipo de documento.";
  if (!form.campoTypeIds.length) return "Seleccione al menos un campo.";
  if (!form.groupIds.length && !form.subgroupIds.length) return "Seleccione al menos un grupo o subgrupo.";
  return null;
}

export default function DocumentTypesModule() {
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeRecord[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [campoTypes, setCampoTypes] = useState<CampoType[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(emptyFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(emptyPagination);
  const [totalDocumentTypesCount, setTotalDocumentTypesCount] = useState(0);
  const [totalCamposCount, setTotalCamposCount] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [listTitle, setListTitle] = useState("");
  const [listItems, setListItems] = useState<string[]>([]);

  const [selected, setSelected] = useState<DocumentTypeRecord | null>(null);
  const [createForm, setCreateForm] = useState<DocumentTypeForm>(emptyForm);
  const [editForm, setEditForm] = useState<DocumentTypeForm>(emptyForm);
  const [createError, setCreateError] = useState("");
  const [editError, setEditError] = useState("");

  const loadDocumentTypes = async (filtersValue = appliedFilters, pageValue = currentPage) => {
    setIsLoading(true);
    try {
      const data = await MetadataService.getDocumentTypes(filtersValue, pageValue);
      const nextRecords: DocumentTypeRecord[] = toList<any>(data?.documentTypes).map((item) => ({
        id: Number(item?.id ?? 0),
        name: String(item?.name ?? ""),
        campoTypeIds: toList<any>(item?.campo_types || item?.campoTypes).map((campo) => Number(campo?.id ?? 0)).filter(Boolean),
        groupIds: toList<any>(item?.groups).map((group) => Number(group?.id ?? 0)).filter(Boolean),
        subgroupIds: toList<any>(item?.subgroups).map((subgroup) => Number(subgroup?.id ?? 0)).filter(Boolean),
        documentsCount: Number(item?.documents_count ?? 0)
      }));

      const nextAreas: Area[] = toList<any>(data?.areas).map((area) => ({
        id: Number(area?.id ?? 0),
        descripcion: String(area?.descripcion ?? ""),
        area_group_types: toList<any>(area?.area_group_types).map((areaGroupType) => ({
          id: Number(areaGroupType?.id ?? 0),
          group_type: {
            id: Number(areaGroupType?.group_type?.id ?? 0),
            descripcion: String(areaGroupType?.group_type?.descripcion ?? "")
          },
          groups: toList<any>(areaGroupType?.groups).map((group) => ({
            id: Number(group?.id ?? 0),
            descripcion: String(group?.descripcion ?? ""),
            subgroups: toList<any>(group?.subgroups).map((subgroup) => ({
              id: Number(subgroup?.id ?? 0),
              descripcion: String(subgroup?.descripcion ?? "")
            }))
          }))
        }))
      }));

      const nextCampos: CampoType[] = toList<any>(data?.campoTypes).map((campo) => ({
        id: Number(campo?.id ?? 0),
        name: String(campo?.name ?? ""),
        data_type: String(campo?.data_type ?? "string")
      }));

      setDocumentTypes(nextRecords);
      setAreas(nextAreas);
      setCampoTypes(nextCampos);
      
      const nextPagination = getPaginationMeta(data?.documentTypes);
      setPagination(nextPagination);
      setTotalDocumentTypesCount(Number(data?.totalDocumentTypes ?? nextPagination.total ?? 0));
      setTotalCamposCount(Number(data?.totalCampos ?? nextCampos.length));
    } catch (error) {
      console.error("[DocumentTypesModule] Load error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDocumentTypes(appliedFilters, currentPage);
  }, [appliedFilters, currentPage]);

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateDocumentTypeForm(createForm);
    if (error) {
      setCreateError(error);
      return;
    }

    void (async () => {
      try {
        await MetadataService.createDocumentType(toDocumentTypePayload(createForm));
        await loadDocumentTypes(appliedFilters, currentPage);
        setCreateOpen(false);
        setCreateForm(emptyForm);
        setCreateError("");
      } catch (apiError: any) {
        setCreateError(apiError?.message || "No se pudo crear el tipo de documento.");
      }
    })();
  };

  const submitEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;

    const error = validateDocumentTypeForm(editForm);
    if (error) {
      setEditError(error);
      return;
    }

    void (async () => {
      try {
        await MetadataService.updateDocumentType(selected.id, toDocumentTypePayload(editForm));
        await loadDocumentTypes(appliedFilters, currentPage);
        setEditOpen(false);
        setSelected(null);
        setEditError("");
      } catch (apiError: any) {
        setEditError(apiError?.message || "No se pudo actualizar el tipo de documento.");
      }
    })();
  };

  const deleteRecord = (record: DocumentTypeRecord) => {
    if (record.documentsCount > 0) return;
    if (!window.confirm(`Eliminar el tipo de documento ${record.name}?`)) return;
    void (async () => {
      try {
        await MetadataService.deleteDocumentType(record.id);
        await loadDocumentTypes(appliedFilters, currentPage);
      } catch (apiError: any) {
        window.alert(apiError?.message || "No se pudo eliminar el tipo de documento.");
      }
    })();
  };

  const groups = useMemo(() => areas.flatMap((area) => getAreaGroups(area)), [areas]);
  const subgroups = useMemo(() => groups.flatMap((group) => flattenSubgroups(group.subgroups)), [groups]);
  const groupMap = useMemo(() => new Map(groups.map((group) => [group.id, group.descripcion])), [groups]);
  const subgroupMap = useMemo(() => new Map(subgroups.map((subgroup) => [subgroup.id, subgroup.descripcion])), [subgroups]);
  const campoMap = useMemo(() => new Map(campoTypes.map((campo) => [campo.id, campo.name])), [campoTypes]);

  const openListModal = (title: string, ids: number[], map: Map<number, string>, emptyMessage: string) => {
    const items = ids.map((id) => map.get(id)).filter(Boolean) as string[];
    setListTitle(title);
    setListItems(items.length ? items : [emptyMessage]);
    setListOpen(true);
  };

  const totalPages = Math.max(1, pagination.lastPage);

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-border bg-gradient-to-r from-slate-900 to-indigo-700 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">Configuracion documental</p>
            <h2 className="mt-2 text-2xl font-semibold">Tipos de documentos</h2>
            <p className="mt-1 text-sm text-white/75">Estructura campos y clasificacion por area, grupo y subgrupo.</p>
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
              <p className="text-xs text-muted-foreground">Tipos de documentos</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : totalDocumentTypesCount}</p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ListChecks className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Campos disponibles</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : totalCamposCount}</p>
            </div>
          </div>
        </article>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <input value={filters.name} onChange={(event) => setFilters((previous) => ({ ...previous, name: event.target.value }))} placeholder="Nombre" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
          <select value={filters.areaId} onChange={(event) => setFilters((previous) => ({ ...previous, areaId: event.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
            <option value="">Area</option>
            {areas.map((area) => (
              <option key={area.id} value={String(area.id)}>
                {area.descripcion}
              </option>
            ))}
          </select>
          <select value={filters.groupId} onChange={(event) => setFilters((previous) => ({ ...previous, groupId: event.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
            <option value="">Grupo</option>
            {groups.map((group) => (
              <option key={group.id} value={String(group.id)}>
                {group.descripcion}
              </option>
            ))}
          </select>
          <select value={filters.subgroupId} onChange={(event) => setFilters((previous) => ({ ...previous, subgroupId: event.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
            <option value="">Subgrupo</option>
            {subgroups.map((subgroup) => (
              <option key={subgroup.id} value={String(subgroup.id)}>
                {subgroup.descripcion}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setCurrentPage(1);
              setAppliedFilters({ ...filters });
            }}
            className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Aplicar filtros
          </button>
          <button
            type="button"
            onClick={() => {
              setCreateError("");
              setCreateForm(emptyForm);
              setCreateOpen(true);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Crear tipo de documento
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters(emptyFilters);
              setAppliedFilters(emptyFilters);
              setCurrentPage(1);
            }}
            className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground"
          >
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
                <th className="px-4 py-3">Campos</th>
                <th className="px-4 py-3">Grupos</th>
                <th className="px-4 py-3">Subgrupos</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`document-types-loading-${index}`} className="border-t border-border">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-8 animate-pulse rounded bg-muted/70" />
                    </td>
                  </tr>
                ))
              ) : documentTypes.length ? (
                documentTypes.map((record, index) => (
                  <tr key={record.id} className="border-t border-border">
                    <td className="px-4 py-3">{(pagination.from || 1) + index}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{record.name}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => openListModal(`Campos de ${record.name}`, record.campoTypeIds, campoMap, "Sin campos")} className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white">
                        <Eye className="h-3.5 w-3.5" />
                        Ver
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => openListModal(`Grupos de ${record.name}`, record.groupIds, groupMap, "Sin grupos")} className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white">
                        <Eye className="h-3.5 w-3.5" />
                        Ver
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => openListModal(`Subgrupos de ${record.name}`, record.subgroupIds, subgroupMap, "Sin subgrupos")} className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white">
                        <Eye className="h-3.5 w-3.5" />
                        Ver
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => { setSelected(record); setEditError(""); setEditForm({ name: record.name, campoTypeIds: [...record.campoTypeIds], groupIds: [...record.groupIds], subgroupIds: [...record.subgroupIds] }); setEditOpen(true); }} className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white">
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRecord(record)}
                          disabled={record.documentsCount > 0}
                          title={record.documentsCount > 0 ? "No se puede eliminar porque tiene documentos asociados" : ""}
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
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No se encontraron tipos de documentos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
        <p className="text-muted-foreground">
          Mostrando {documentTypes.length} de {pagination.total} tipos de documentos
        </p>
        <div className="flex items-center gap-2">
          <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
            Anterior
          </button>
          <span className="text-xs text-muted-foreground">
            Pagina {currentPage} de {totalPages}
          </span>
          <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
            Siguiente
          </button>
        </div>
      </div>

      <Modal open={createOpen} title="Crear tipo de documento" onClose={() => setCreateOpen(false)} maxWidth="max-w-6xl">
        <form onSubmit={submitCreate}>
          <DocumentTypeFormFields form={createForm} setForm={setCreateForm} error={createError} submitLabel="Guardar" areas={areas} campoTypes={campoTypes} />
        </form>
      </Modal>

      <Modal open={editOpen} title="Editar tipo de documento" onClose={() => setEditOpen(false)} maxWidth="max-w-6xl">
        <form onSubmit={submitEdit}>
          <DocumentTypeFormFields form={editForm} setForm={setEditForm} error={editError} submitLabel="Actualizar" areas={areas} campoTypes={campoTypes} />
        </form>
      </Modal>

      <Modal open={listOpen} title={listTitle} onClose={() => setListOpen(false)} maxWidth="max-w-xl">
        <ul className="space-y-2 text-sm">
          {listItems.map((item, index) => (
            <li key={`${item}-${index}`} className="rounded-lg border border-border bg-background px-3 py-2 text-foreground">
              {item}
            </li>
          ))}
        </ul>
      </Modal>
    </section>
  );
}
