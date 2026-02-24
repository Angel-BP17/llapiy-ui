import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useEffect } from "react";
import { config } from "@/config/llapiy-config";
import { apiGet, toList, unwrapData } from "@/lib/llapiy-api";
import { Building2, Eye, Pencil, Plus, Trash2 } from "lucide-react";

type AreaRecord = {
  id: number;
  descripcion: string;
  abreviacion: string;
};

type GroupType = {
  id: number;
  descripcion: string;
};

type GroupRecord = {
  id: number;
  area_id: number;
  group_type_id: number;
  descripcion: string;
  abreviacion: string;
};

type SubgroupRecord = {
  id: number;
  group_id: number;
  descripcion: string;
  abreviacion: string;
  parent_subgroup_id: number | null;
};

type AreaForm = {
  descripcion: string;
  abreviacion: string;
};

type GroupForm = {
  descripcion: string;
  abreviacion: string;
  group_type_id: string;
};

type SubgroupForm = {
  descripcion: string;
  abreviacion: string;
  parent_subgroup_id: string;
};

const areasSeed: AreaRecord[] = [];
const groupTypesSeed: GroupType[] = [];
const groupsSeed: GroupRecord[] = [];
const subgroupsSeed: SubgroupRecord[] = [];

const emptyAreaForm: AreaForm = { descripcion: "", abreviacion: "" };
const emptyGroupForm: GroupForm = { descripcion: "", abreviacion: "", group_type_id: "" };
const emptySubgroupForm: SubgroupForm = { descripcion: "", abreviacion: "", parent_subgroup_id: "" };

function Modal({
  open,
  title,
  onClose,
  children,
  maxWidth = "max-w-3xl"
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

function subgroupTree(groupId: number, subgroups: SubgroupRecord[]) {
  const byParent = new Map<number | null, SubgroupRecord[]>();
  subgroups
    .filter((item) => item.group_id === groupId)
    .forEach((item) => {
      const list = byParent.get(item.parent_subgroup_id) ?? [];
      list.push(item);
      byParent.set(item.parent_subgroup_id, list);
    });
  return byParent;
}

function SubgroupTreeView({
  parentId,
  tree,
  onDelete
}: {
  parentId: number | null;
  tree: Map<number | null, SubgroupRecord[]>;
  onDelete: (id: number) => void;
}) {
  const items = tree.get(parentId) ?? [];
  if (!items.length) return null;

  return (
    <ul className="mt-2 space-y-2 border-l border-border pl-3">
      {items.map((item) => (
        <li key={item.id}>
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-xs">
            <span className="font-semibold text-foreground">{item.descripcion}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{item.abreviacion}</span>
            <button type="button" onClick={() => onDelete(item.id)} className="ml-auto inline-flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-[10px] font-semibold text-white">
              <Trash2 className="h-3 w-3" />
              Eliminar
            </button>
          </div>
          <SubgroupTreeView parentId={item.id} tree={tree} onDelete={onDelete} />
        </li>
      ))}
    </ul>
  );
}

export default function AreasModule() {
  const [areas, setAreas] = useState<AreaRecord[]>(areasSeed);
  const [groups, setGroups] = useState<GroupRecord[]>(groupsSeed);
  const [subgroups, setSubgroups] = useState<SubgroupRecord[]>(subgroupsSeed);
  const [groupTypes, setGroupTypes] = useState<GroupType[]>(groupTypesSeed);
  const [isLoading, setIsLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<AreaRecord | null>(null);

  const [areaForm, setAreaForm] = useState<AreaForm>(emptyAreaForm);
  const [groupForm, setGroupForm] = useState<GroupForm>(emptyGroupForm);
  const [subgroupForms, setSubgroupForms] = useState<Record<number, SubgroupForm>>({});
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const [areasResponse, groupTypesResponse] = await Promise.all([
          apiGet<{ areas: any[] }>(config.endpoints.areas.list),
          apiGet<{ groupTypes: { data: any[] } | any[] }>(config.endpoints.groupTypes.list)
        ]);

        const areasData = unwrapData(areasResponse) as { areas?: unknown };
        const typesData = unwrapData(groupTypesResponse) as { groupTypes?: unknown };

        const nextAreas = toList<any>(areasData?.areas).map((area) => ({
          id: Number(area?.id ?? 0),
          descripcion: String(area?.descripcion ?? ""),
          abreviacion: String(area?.abreviacion ?? "")
        }));

        const nextGroups: GroupRecord[] = [];
        const nextSubgroups: SubgroupRecord[] = [];

        toList<any>(areasData?.areas).forEach((area) => {
          toList<any>(area?.groups).forEach((group) => {
            nextGroups.push({
              id: Number(group?.id ?? 0),
              area_id: Number(area?.id ?? 0),
              group_type_id: Number(group?.area_group_type?.group_type?.id ?? 0),
              descripcion: String(group?.descripcion ?? ""),
              abreviacion: String(group?.abreviacion ?? "")
            });

            toList<any>(group?.subgroups).forEach((subgroup) => {
              nextSubgroups.push({
                id: Number(subgroup?.id ?? 0),
                group_id: Number(group?.id ?? 0),
                descripcion: String(subgroup?.descripcion ?? ""),
                abreviacion: String(subgroup?.abreviacion ?? ""),
                parent_subgroup_id: Number(subgroup?.parent_subgroup_id ?? 0) || null
              });
            });
          });
        });

        const nextTypes = toList<any>(typesData?.groupTypes).map((item) => ({
          id: Number(item?.id ?? 0),
          descripcion: String(item?.descripcion ?? "")
        }));

        if (!ignore) {
          setAreas(nextAreas);
          setGroups(nextGroups);
          setSubgroups(nextSubgroups);
          setGroupTypes(nextTypes);
        }
      } catch (error) {
        console.error("[AreasModule] Load error:", error);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    void load();
    return () => {
      ignore = true;
    };
  }, []);

  const groupTypeMap = useMemo(() => new Map(groupTypes.map((item) => [item.id, item.descripcion])), [groupTypes]);
  const groupsByArea = useMemo(() => {
    const map = new Map<number, GroupRecord[]>();
    groups.forEach((group) => {
      const list = map.get(group.area_id) ?? [];
      list.push(group);
      map.set(group.area_id, list);
    });
    return map;
  }, [groups]);

  const subgroupsByGroup = useMemo(() => {
    const map = new Map<number, SubgroupRecord[]>();
    subgroups.forEach((subgroup) => {
      const list = map.get(subgroup.group_id) ?? [];
      list.push(subgroup);
      map.set(subgroup.group_id, list);
    });
    return map;
  }, [subgroups]);

  const visibleAreas = areas.filter((area) => area.descripcion !== "Todas");

  const totalGroupsForArea = (areaId: number) => groupsByArea.get(areaId)?.length ?? 0;

  const openAreaDetails = (area: AreaRecord) => {
    setSelectedArea(area);
    setGroupForm(emptyGroupForm);
    setErrorMessage("");
    setDetailsOpen(true);
  };

  const openEditArea = (area: AreaRecord) => {
    setSelectedArea(area);
    setAreaForm({ descripcion: area.descripcion, abreviacion: area.abreviacion });
    setErrorMessage("");
    setEditOpen(true);
  };

  const submitCreateArea = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    if (!areaForm.descripcion.trim()) {
      setErrorMessage("Ingrese la descripcion del area.");
      return;
    }
    const nextId = areas.length ? Math.max(...areas.map((item) => item.id)) + 1 : 1;
    setAreas((previous) => [...previous, { id: nextId, descripcion: areaForm.descripcion.trim(), abreviacion: areaForm.abreviacion.trim() }]);
    setCreateOpen(false);
    setAreaForm(emptyAreaForm);
  };

  const submitEditArea = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedArea) return;
    if (!areaForm.descripcion.trim()) {
      setErrorMessage("Ingrese la descripcion del area.");
      return;
    }
    setAreas((previous) =>
      previous.map((area) =>
        area.id === selectedArea.id ? { ...area, descripcion: areaForm.descripcion.trim(), abreviacion: areaForm.abreviacion.trim() } : area
      )
    );
    setEditOpen(false);
    setSelectedArea(null);
    setAreaForm(emptyAreaForm);
  };

  const deleteArea = (areaId: number) => {
    if (totalGroupsForArea(areaId) > 0) return;
    if (!window.confirm("Eliminar esta area y sus datos relacionados?")) return;
    setAreas((previous) => previous.filter((area) => area.id !== areaId));
  };

  const submitCreateGroup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedArea) return;
    if (!groupForm.descripcion.trim() || !groupForm.group_type_id) {
      setErrorMessage("Complete descripcion y tipo de grupo.");
      return;
    }
    const nextId = groups.length ? Math.max(...groups.map((item) => item.id)) + 1 : 1;
    setGroups((previous) => [
      ...previous,
      {
        id: nextId,
        area_id: selectedArea.id,
        group_type_id: Number(groupForm.group_type_id),
        descripcion: groupForm.descripcion.trim(),
        abreviacion: groupForm.abreviacion.trim()
      }
    ]);
    setGroupForm(emptyGroupForm);
    setErrorMessage("");
  };

  const updateGroupInline = (group: GroupRecord) => {
    const descripcion = window.prompt("Nueva descripcion del grupo:", group.descripcion);
    if (descripcion === null) return;
    const abreviacion = window.prompt("Nueva abreviacion:", group.abreviacion);
    if (abreviacion === null) return;
    setGroups((previous) => previous.map((item) => (item.id === group.id ? { ...item, descripcion: descripcion.trim(), abreviacion: abreviacion.trim() } : item)));
  };

  const deleteGroup = (groupId: number) => {
    if ((subgroupsByGroup.get(groupId)?.length ?? 0) > 0) return;
    if (!window.confirm("Eliminar este grupo?")) return;
    setGroups((previous) => previous.filter((group) => group.id !== groupId));
  };

  const subgroupFormForGroup = (groupId: number): SubgroupForm => subgroupForms[groupId] ?? emptySubgroupForm;

  const setSubgroupFormForGroup = (groupId: number, next: SubgroupForm) =>
    setSubgroupForms((previous) => ({ ...previous, [groupId]: next }));

  const submitCreateSubgroup = (event: FormEvent<HTMLFormElement>, groupId: number) => {
    event.preventDefault();
    const form = subgroupFormForGroup(groupId);
    if (!form.descripcion.trim()) {
      setErrorMessage("Ingrese la descripcion del subgrupo.");
      return;
    }
    const nextId = subgroups.length ? Math.max(...subgroups.map((item) => item.id)) + 1 : 1;
    setSubgroups((previous) => [
      ...previous,
      {
        id: nextId,
        group_id: groupId,
        descripcion: form.descripcion.trim(),
        abreviacion: form.abreviacion.trim(),
        parent_subgroup_id: form.parent_subgroup_id ? Number(form.parent_subgroup_id) : null
      }
    ]);
    setSubgroupFormForGroup(groupId, emptySubgroupForm);
    setErrorMessage("");
  };

  const deleteSubgroup = (subgroupId: number) => {
    const hasChildren = subgroups.some((item) => item.parent_subgroup_id === subgroupId);
    if (hasChildren) {
      if (!window.confirm("Este subgrupo tiene hijos. Eliminarlos tambien?")) return;
      const collectChildren = (parentId: number): number[] => {
        const direct = subgroups.filter((item) => item.parent_subgroup_id === parentId).map((item) => item.id);
        return [...direct, ...direct.flatMap((id) => collectChildren(id))];
      };
      const allChildren = collectChildren(subgroupId);
      setSubgroups((previous) => previous.filter((item) => item.id !== subgroupId && !allChildren.includes(item.id)));
      return;
    }
    setSubgroups((previous) => previous.filter((item) => item.id !== subgroupId));
  };

  const groupsForSelectedArea = selectedArea ? groups.filter((group) => group.area_id === selectedArea.id) : [];
  const groupsGroupedByType = useMemo(() => {
    const map = new Map<number, GroupRecord[]>();
    groupsForSelectedArea.forEach((group) => {
      const list = map.get(group.group_type_id) ?? [];
      list.push(group);
      map.set(group.group_type_id, list);
    });
    return map;
  }, [groupsForSelectedArea]);

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-border bg-gradient-to-r from-slate-900 to-cyan-700 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">Estructura organizacional</p>
            <h2 className="mt-2 text-2xl font-semibold">Gestion de areas</h2>
            <p className="mt-1 text-sm text-white/75">Administra areas y su relacion con grupos y subgrupos.</p>
          </div>
          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold">{isLoading ? <span className="inline-block h-4 w-16 animate-pulse rounded-full bg-white/30" /> : `${visibleAreas.length} registros`}</span>
        </div>
      </header>

      {errorMessage ? <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Areas registradas</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : visibleAreas.length}</p>
            </div>
          </div>
        </article>
      </div>

      <div className="flex">
        <button
          type="button"
          onClick={() => {
            setErrorMessage("");
            setAreaForm(emptyAreaForm);
            setCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Crear nueva area
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <article key={`areas-loading-${index}`} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="h-6 animate-pulse rounded bg-muted/70" />
              <div className="mt-4 h-8 animate-pulse rounded bg-muted/70" />
            </article>
          ))
        ) : visibleAreas.length ? (
          visibleAreas.map((area) => (
            <article key={area.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="text-base font-semibold text-foreground">
                {area.descripcion} ({area.abreviacion || "-"})
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => openAreaDetails(area)} className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white">
                  <Eye className="h-3.5 w-3.5" />
                  Ver grupos y subgrupos
                </button>
                <button type="button" onClick={() => openEditArea(area)} className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white">
                  <Pencil className="h-3.5 w-3.5" />
                  Editar area
                </button>
                <button
                  type="button"
                  onClick={() => deleteArea(area.id)}
                  disabled={totalGroupsForArea(area.id) > 0}
                  title={totalGroupsForArea(area.id) > 0 ? "No se puede eliminar porque tiene grupos asociados" : ""}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar area
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="col-span-full rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
            No se encontraron areas registradas.
          </div>
        )}
      </div>

      <Modal open={createOpen} title="Crear area" onClose={() => setCreateOpen(false)}>
        <form onSubmit={submitCreateArea} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Descripcion del area</label>
            <input value={areaForm.descripcion} onChange={(event) => setAreaForm((previous) => ({ ...previous, descripcion: event.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Abreviacion</label>
            <input value={areaForm.abreviacion} onChange={(event) => setAreaForm((previous) => ({ ...previous, abreviacion: event.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={editOpen} title="Editar area" onClose={() => setEditOpen(false)}>
        <form onSubmit={submitEditArea} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Descripcion del area</label>
            <input value={areaForm.descripcion} onChange={(event) => setAreaForm((previous) => ({ ...previous, descripcion: event.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Abreviacion</label>
            <input value={areaForm.abreviacion} onChange={(event) => setAreaForm((previous) => ({ ...previous, abreviacion: event.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Actualizar
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={detailsOpen} title={`Detalles del area${selectedArea ? ` ${selectedArea.descripcion}` : ""}`} onClose={() => setDetailsOpen(false)} maxWidth="max-w-6xl">
        {selectedArea ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-background p-4">
              <h4 className="text-sm font-semibold text-foreground">Agregar grupo</h4>
              <form onSubmit={submitCreateGroup} className="mt-3 grid gap-2 md:grid-cols-4">
                <input value={groupForm.descripcion} onChange={(event) => setGroupForm((previous) => ({ ...previous, descripcion: event.target.value }))} className="h-10 rounded-lg border border-border bg-card px-3 text-sm" placeholder="Descripcion del grupo" />
                <input value={groupForm.abreviacion} onChange={(event) => setGroupForm((previous) => ({ ...previous, abreviacion: event.target.value }))} className="h-10 rounded-lg border border-border bg-card px-3 text-sm" placeholder="Abreviacion" />
                <select value={groupForm.group_type_id} onChange={(event) => setGroupForm((previous) => ({ ...previous, group_type_id: event.target.value }))} className="h-10 rounded-lg border border-border bg-card px-3 text-sm">
                  <option value="">Seleccione un tipo</option>
                  {groupTypes.map((groupType) => (
                    <option key={groupType.id} value={String(groupType.id)}>
                      {groupType.descripcion}
                    </option>
                  ))}
                </select>
                <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
                  Guardar grupo
                </button>
              </form>
            </div>

            {[...groupsGroupedByType.entries()].length ? (
              [...groupsGroupedByType.entries()].map(([groupTypeId, typeGroups]) => (
                <section key={groupTypeId} className="rounded-xl border border-border bg-card p-4">
                  <h4 className="text-sm font-semibold text-foreground">{groupTypeMap.get(groupTypeId) ?? "Sin tipo"}</h4>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {typeGroups.map((group) => {
                      const groupSubgroups = subgroupsByGroup.get(group.id) ?? [];
                      const tree = subgroupTree(group.id, groupSubgroups);
                      const subgroupForm = subgroupFormForGroup(group.id);

                      return (
                        <article key={group.id} className="rounded-lg border border-border bg-background p-3">
                          <h5 className="text-sm font-semibold text-foreground">
                            {group.descripcion} ({group.abreviacion || "-"})
                          </h5>

                          <div className="mt-3">
                            <h6 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Agregar subgrupo</h6>
                            <form onSubmit={(event) => submitCreateSubgroup(event, group.id)} className="mt-2 space-y-2">
                              <input value={subgroupForm.descripcion} onChange={(event) => setSubgroupFormForGroup(group.id, { ...subgroupForm, descripcion: event.target.value })} className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm" placeholder="Descripcion del subgrupo" />
                              <div className="grid gap-2 sm:grid-cols-3">
                                <input value={subgroupForm.abreviacion} onChange={(event) => setSubgroupFormForGroup(group.id, { ...subgroupForm, abreviacion: event.target.value })} className="h-9 rounded-lg border border-border bg-card px-3 text-sm" placeholder="Abreviacion" />
                                <select value={subgroupForm.parent_subgroup_id} onChange={(event) => setSubgroupFormForGroup(group.id, { ...subgroupForm, parent_subgroup_id: event.target.value })} className="h-9 rounded-lg border border-border bg-card px-3 text-sm sm:col-span-2">
                                  <option value="">Sin padre</option>
                                  {groupSubgroups.map((subgroup) => (
                                    <option key={subgroup.id} value={String(subgroup.id)}>
                                      {subgroup.descripcion}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                                Guardar subgrupo
                              </button>
                            </form>
                          </div>

                          <div className="mt-3">
                            <h6 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subgrupos</h6>
                            {groupSubgroups.length ? (
                              <SubgroupTreeView parentId={null} tree={tree} onDelete={deleteSubgroup} />
                            ) : (
                              <p className="mt-2 text-xs text-muted-foreground">No hay subgrupos registrados.</p>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap justify-end gap-2">
                            <button type="button" onClick={() => updateGroupInline(group)} className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white">
                              <Pencil className="h-3.5 w-3.5" />
                              Editar grupo
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteGroup(group.id)}
                              disabled={(subgroupsByGroup.get(group.id)?.length ?? 0) > 0}
                              title={(subgroupsByGroup.get(group.id)?.length ?? 0) > 0 ? "No se puede eliminar porque tiene subgrupos asociados" : ""}
                              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Eliminar grupo
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))
            ) : (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                Esta area aun no tiene grupos registrados.
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
