import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { withId } from "@/config/llapiy-config";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { AreaCard } from "./AreaCard";
import { SubgroupTreeView, subgroupTree, type SubgroupRecord } from "./SubgroupTree";
import { AreaService } from "@/services/AreaService";

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

const emptyAreaForm: AreaForm = { descripcion: "", abreviacion: "" };
const emptyGroupForm: GroupForm = { descripcion: "", abreviacion: "", group_type_id: "" };
const emptySubgroupForm: SubgroupForm = { descripcion: "", abreviacion: "", parent_subgroup_id: "" };

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
  }
  return fallback;
}

export default function AreasModule() {
  const [areas, setAreas] = useState<AreaRecord[]>([]);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [subgroups, setSubgroups] = useState<SubgroupRecord[]>([]);
  const [groupTypes, setGroupTypes] = useState<GroupType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<AreaRecord | null>(null);

  const [areaForm, setAreaForm] = useState<AreaForm>(emptyAreaForm);
  const [groupForm, setGroupForm] = useState<GroupForm>(emptyGroupForm);
  const [subgroupForms, setSubgroupForms] = useState<Record<number, SubgroupForm>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAreasData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await AreaService.getFullStructure();
      setAreas(data.areas);
      setGroups(data.groups);
      setSubgroups(data.subgroups);
      setGroupTypes(data.groupTypes);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "No se pudo cargar el modulo de areas."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAreasData();
  }, [loadAreasData]);

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
    if (isSubmitting) return;
    setErrorMessage("");
    if (!areaForm.descripcion.trim()) {
      setErrorMessage("Ingrese la descripcion del area.");
      return;
    }

    void (async () => {
      setIsSubmitting(true);
      try {
        await AreaService.createArea({
          descripcion: areaForm.descripcion.trim(),
          abreviacion: areaForm.abreviacion.trim() || undefined
        });
        await loadAreasData();
        setCreateOpen(false);
        setAreaForm(emptyAreaForm);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "No se pudo crear el area."));
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const submitEditArea = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedArea) return;
    if (isSubmitting) return;
    if (!areaForm.descripcion.trim()) {
      setErrorMessage("Ingrese la descripcion del area.");
      return;
    }

    void (async () => {
      setIsSubmitting(true);
      try {
        await AreaService.updateArea(selectedArea.id, {
          descripcion: areaForm.descripcion.trim(),
          abreviacion: areaForm.abreviacion.trim() || undefined
        });
        await loadAreasData();
        setEditOpen(false);
        setSelectedArea(null);
        setAreaForm(emptyAreaForm);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "No se pudo actualizar el area."));
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const deleteArea = (areaId: number) => {
    if (isSubmitting) return;
    if (totalGroupsForArea(areaId) > 0) return;
    if (!window.confirm("Eliminar esta area y sus datos relacionados?")) return;

    void (async () => {
      setIsSubmitting(true);
      try {
        await AreaService.deleteArea(areaId);
        await loadAreasData();
        setSelectedArea((previous) => (previous?.id === areaId ? null : previous));
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "No se pudo eliminar el area."));
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const submitCreateGroup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedArea) return;
    if (isSubmitting) return;
    if (!groupForm.descripcion.trim() || !groupForm.group_type_id) {
      setErrorMessage("Complete descripcion y tipo de grupo.");
      return;
    }

    void (async () => {
      setIsSubmitting(true);
      setErrorMessage("");
      try {
        await AreaService.createGroup({
          area_id: selectedArea.id,
          group_type_id: Number(groupForm.group_type_id),
          descripcion: groupForm.descripcion.trim()
        });
        await loadAreasData();
        setGroupForm(emptyGroupForm);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "No se pudo crear el grupo."));
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const updateGroupInline = (group: GroupRecord) => {
    if (isSubmitting) return;
    const descripcion = window.prompt("Nueva descripcion del grupo:", group.descripcion);
    if (descripcion === null) return;
    const abreviacion = window.prompt("Nueva abreviacion:", group.abreviacion);
    if (abreviacion === null) return;

    void (async () => {
      setIsSubmitting(true);
      try {
        await AreaService.updateGroup(group.id, {
          descripcion: descripcion.trim(),
          abreviacion: abreviacion.trim() || undefined
        });
        await loadAreasData();
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "No se pudo actualizar el grupo."));
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const deleteGroup = (groupId: number) => {
    if (isSubmitting) return;
    if ((subgroupsByGroup.get(groupId)?.length ?? 0) > 0) return;
    if (!window.confirm("Eliminar este grupo?")) return;

    void (async () => {
      setIsSubmitting(true);
      try {
        await AreaService.deleteGroup(groupId);
        await loadAreasData();
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "No se pudo eliminar el grupo."));
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const subgroupFormForGroup = (groupId: number): SubgroupForm => subgroupForms[groupId] ?? emptySubgroupForm;

  const setSubgroupFormForGroup = (groupId: number, next: SubgroupForm) =>
    setSubgroupForms((previous) => ({ ...previous, [groupId]: next }));

  const submitCreateSubgroup = (event: FormEvent<HTMLFormElement>, groupId: number) => {
    event.preventDefault();
    if (isSubmitting) return;
    const form = subgroupFormForGroup(groupId);
    if (!form.descripcion.trim()) {
      setErrorMessage("Ingrese la descripcion del subgrupo.");
      return;
    }

    void (async () => {
      setIsSubmitting(true);
      setErrorMessage("");
      try {
        await AreaService.createSubgroup({
          group_id: groupId,
          descripcion: form.descripcion.trim(),
          abreviacion: form.abreviacion.trim() || undefined,
          parent_subgroup_id: form.parent_subgroup_id ? Number(form.parent_subgroup_id) : undefined
        });
        await loadAreasData();
        setSubgroupFormForGroup(groupId, emptySubgroupForm);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "No se pudo crear el subgrupo."));
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const deleteSubgroup = (subgroupId: number) => {
    if (isSubmitting) return;
    const hasChildren = subgroups.some((item) => item.parent_subgroup_id === subgroupId);
    if (hasChildren && !window.confirm("Este subgrupo tiene hijos. Eliminarlos tambien?")) return;

    void (async () => {
      setIsSubmitting(true);
      try {
        await AreaService.deleteSubgroup(subgroupId);
        await loadAreasData();
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "No se pudo eliminar el subgrupo."));
      } finally {
        setIsSubmitting(false);
      }
    })();
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
            <AreaCard 
              key={area.id} 
              area={area} 
              isLoading={isLoading} 
              totalGroups={totalGroupsForArea(area.id)}
              onDetails={openAreaDetails}
              onEdit={openEditArea}
              onDelete={deleteArea}
            />
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
