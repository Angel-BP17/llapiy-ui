import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { config, withParams } from "@/config/llapiy-config";
import { toList, unwrapData, apiDelete, apiGet, apiPost, apiPut } from "@/lib/llapiy-api";
import { Modal } from "@/components/ui/modal";
import {
  type Andamio,
  type Archivo,
  type Box,
  type Section
} from "./storage-data";
import { Boxes, Eye, FileArchive, Layers, LayoutGrid, Pencil, Trash2 } from "lucide-react";

type ViewState =
  | { level: "sections" }
  | { level: "andamios"; sectionId: number }
  | { level: "boxes"; sectionId: number; andamioId: number }
  | { level: "archivos"; sectionId: number; andamioId: number; boxId: number };

type SectionForm = { n_section: string; descripcion: string };
type AndamioForm = { n_andamio: string; descripcion: string };
type BoxForm = { n_box: string; descripcion: string };

const emptySectionForm: SectionForm = { n_section: "", descripcion: "" };
const emptyAndamioForm: AndamioForm = { n_andamio: "", descripcion: "" };
const emptyBoxForm: BoxForm = { n_box: "", descripcion: "" };

type StorageLevel = ViewState["level"];
type StorageModuleProps = {
  initialLevel?: StorageLevel;
  sectionId?: number;
  andamioId?: number;
  boxId?: number;
};

const sectionsPath = "/sections";
const andamiosPath = (sectionId: number) => `${sectionsPath}?level=andamios&section=${sectionId}`;
const boxesPath = (sectionId: number, andamioId: number) =>
  `${sectionsPath}?level=boxes&section=${sectionId}&andamio=${andamioId}`;
const archivosPath = (sectionId: number, andamioId: number, boxId: number) =>
  `${sectionsPath}?level=archivos&section=${sectionId}&andamio=${andamioId}&box=${boxId}`;

const toValidId = (value: number | undefined) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
  }
  return fallback;
}

function resolveViewFromProps(
  initialLevel: StorageLevel,
  sectionId?: number,
  andamioId?: number,
  boxId?: number
): ViewState {
  const validSectionId = toValidId(sectionId);
  const validAndamioId = toValidId(andamioId);
  const validBoxId = toValidId(boxId);

  if (initialLevel === "archivos" && validSectionId && validAndamioId && validBoxId) {
    return {
      level: "archivos",
      sectionId: validSectionId,
      andamioId: validAndamioId,
      boxId: validBoxId
    };
  }
  if (initialLevel === "boxes" && validSectionId && validAndamioId) {
    return { level: "boxes", sectionId: validSectionId, andamioId: validAndamioId };
  }
  if (initialLevel === "andamios" && validSectionId) {
    return { level: "andamios", sectionId: validSectionId };
  }
  return { level: "sections" };
}

function resolveViewFromQueryString(queryString: string): ViewState | null {
  const params = new URLSearchParams(queryString);
  const level = params.get("level");
  const sectionId = toValidId(Number.parseInt(params.get("section") ?? "", 10));
  const andamioId = toValidId(Number.parseInt(params.get("andamio") ?? "", 10));
  const boxId = toValidId(Number.parseInt(params.get("box") ?? "", 10));

  if (level === "archivos" && sectionId && andamioId && boxId) {
    return { level: "archivos", sectionId, andamioId, boxId };
  }
  if (level === "boxes" && sectionId && andamioId) {
    return { level: "boxes", sectionId, andamioId };
  }
  if (level === "andamios" && sectionId) {
    return { level: "andamios", sectionId };
  }
  if (level === "sections") {
    return { level: "sections" };
  }
  return null;
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export default function StorageModule({
  initialLevel = "sections",
  sectionId,
  andamioId,
  boxId
}: StorageModuleProps) {
  const [sections, setSections] = useState<Section[]>([]);
  const [andamios, setAndamios] = useState<Andamio[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [sectionForm, setSectionForm] = useState<SectionForm>(emptySectionForm);
  const [andamioForm, setAndamioForm] = useState<AndamioForm>(emptyAndamioForm);
  const [boxForm, setBoxForm] = useState<BoxForm>(emptyBoxForm);

  const [sectionEditOpen, setSectionEditOpen] = useState(false);
  const [andamioEditOpen, setAndamioEditOpen] = useState(false);
  const [boxEditOpen, setBoxEditOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editingAndamio, setEditingAndamio] = useState<Andamio | null>(null);
  const [editingBox, setEditingBox] = useState<Box | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const initialView = useMemo(
    () => resolveViewFromProps(initialLevel, sectionId, andamioId, boxId),
    [andamioId, boxId, initialLevel, sectionId]
  );
  const [view, setView] = useState<ViewState>(() => {
    if (typeof window === "undefined") return initialView;
    return resolveViewFromQueryString(window.location.search) ?? initialView;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      setView(initialView);
      return;
    }
    setView(resolveViewFromQueryString(window.location.search) ?? initialView);
  }, [initialView]);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setIsLoading(true);
      try {
        if (view.level === "sections") {
          const response = await apiGet<{ sections: any[] }>(config.endpoints.storage.sections, {
            search: search || undefined
          });
          const data = unwrapData(response) as { sections?: unknown };
          const nextSections = toList<any>(data?.sections).map((item) => ({
            id: Number(item?.id ?? 0),
            n_section: Number(item?.n_section ?? 0),
            descripcion: String(item?.descripcion ?? "")
          }));
          if (!ignore) {
            setSections(nextSections);
          }
          return;
        }

        if (view.level === "andamios") {
          const response = await apiGet<{ andamios: any[] }>(
            withParams(config.endpoints.storage.andamios, { section: view.sectionId }),
            { search: search || undefined }
          );
          const data = unwrapData(response) as { andamios?: unknown };
          const nextAndamios = toList<any>(data?.andamios).map((item) => ({
            id: Number(item?.id ?? 0),
            section_id: Number(item?.section_id ?? view.sectionId),
            n_andamio: Number(item?.n_andamio ?? 0),
            descripcion: String(item?.descripcion ?? "")
          }));
          if (!ignore) {
            setAndamios((previous) => {
              const others = previous.filter((item) => item.section_id !== view.sectionId);
              return [...others, ...nextAndamios];
            });
          }
          return;
        }

        if (view.level === "boxes") {
          const response = await apiGet<{ boxes: any[] }>(
            withParams(config.endpoints.storage.boxes, { section: view.sectionId, andamio: view.andamioId }),
            { search: search || undefined }
          );
          const data = unwrapData(response) as { boxes?: unknown };
          const nextBoxes = toList<any>(data?.boxes).map((item) => ({
            id: Number(item?.id ?? 0),
            andamio_id: Number(item?.andamio_id ?? view.andamioId),
            n_box: Number(item?.n_box ?? 0),
            descripcion: String(item?.descripcion ?? "")
          }));
          if (!ignore) {
            setBoxes((previous) => {
              const others = previous.filter((item) => item.andamio_id !== view.andamioId);
              return [...others, ...nextBoxes];
            });
          }
          return;
        }

        if (view.level === "archivos") {
          const response = await apiGet<{ blocks: { data: any[] } | any[] }>(
            withParams(config.endpoints.storage.archivos, {
              section: view.sectionId,
              andamio: view.andamioId,
              box: view.boxId
            }),
            { search: search || undefined }
          );
          const data = unwrapData(response) as { blocks?: unknown };
          const nextArchivos = toList<any>(data?.blocks).map((item) => ({
            id: Number(item?.id ?? 0),
            box_id: Number(item?.box_id ?? view.boxId) || null,
            n_bloque: String(item?.n_bloque ?? ""),
            asunto: String(item?.asunto ?? ""),
            folios: String(item?.folios ?? ""),
            periodo: String(item?.periodo ?? "")
          }));
          if (!ignore) {
            setArchivos((previous) => {
              const others = previous.filter((item) => item.box_id !== view.boxId);
              return [...others, ...nextArchivos];
            });
          }
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(getApiErrorMessage(error, "No se pudo cargar el modulo de almacenamiento."));
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    void load();
    return () => {
      ignore = true;
    };
  }, [reloadKey, search, view]);

  const sectionMap = useMemo(() => new Map(sections.map((section) => [section.id, section])), [sections]);
  const andamioMap = useMemo(() => new Map(andamios.map((andamio) => [andamio.id, andamio])), [andamios]);

  const activeSection = view.level !== "sections" ? sectionMap.get(view.sectionId) ?? null : null;
  const activeAndamio = view.level === "boxes" || view.level === "archivos" ? andamioMap.get(view.andamioId) ?? null : null;
  const activeBox = view.level === "archivos" ? boxes.find((box) => box.id === view.boxId) ?? null : null;

  const sectionsFiltered = useMemo(() => {
    const term = normalize(search);
    if (!term) return sections;
    return sections.filter((section) => normalize(`seccion ${section.n_section} ${section.descripcion}`).includes(term));
  }, [sections, search]);

  const andamiosFiltered = useMemo(() => {
    if (view.level !== "andamios" && view.level !== "boxes" && view.level !== "archivos") return [];
    const term = normalize(search);
    return andamios
      .filter((andamio) => andamio.section_id === view.sectionId)
      .filter((andamio) => !term || normalize(`andamio ${andamio.n_andamio} ${andamio.descripcion}`).includes(term));
  }, [andamios, search, view]);

  const boxesFiltered = useMemo(() => {
    if (view.level !== "boxes" && view.level !== "archivos") return [];
    const term = normalize(search);
    return boxes
      .filter((box) => box.andamio_id === view.andamioId)
      .filter((box) => !term || normalize(`caja ${box.n_box} ${box.descripcion}`).includes(term));
  }, [boxes, search, view]);

  const archivosFiltered = useMemo(() => {
    if (view.level !== "archivos") return [];
    const term = normalize(search);
    return archivos
      .filter((archivo) => archivo.box_id === view.boxId)
      .filter(
        (archivo) =>
          !term ||
          normalize(`${archivo.n_bloque} ${archivo.asunto} ${archivo.folios} ${archivo.periodo}`).includes(term)
      );
  }, [archivos, search, view]);

  const andamiosBySectionCount = useMemo(() => {
    const counts = new Map<number, number>();
    andamios.forEach((andamio) => counts.set(andamio.section_id, (counts.get(andamio.section_id) ?? 0) + 1));
    return counts;
  }, [andamios]);

  const boxesByAndamioCount = useMemo(() => {
    const counts = new Map<number, number>();
    boxes.forEach((box) => counts.set(box.andamio_id, (counts.get(box.andamio_id) ?? 0) + 1));
    return counts;
  }, [boxes]);

  const archivosByBoxCount = useMemo(() => {
    const counts = new Map<number, number>();
    archivos.forEach((archivo) => {
      if (archivo.box_id !== null) counts.set(archivo.box_id, (counts.get(archivo.box_id) ?? 0) + 1);
    });
    return counts;
  }, [archivos]);

  const createSection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    if (!sectionForm.n_section || !sectionForm.descripcion.trim()) {
      setErrorMessage("Complete numero y descripcion de la seccion.");
      return;
    }
    void (async () => {
      try {
        await apiPost(config.endpoints.storage.sections, {
          n_section: sectionForm.n_section,
          descripcion: sectionForm.descripcion.trim()
        });
        setSectionForm(emptySectionForm);
        setReloadKey((previous) => previous + 1);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "No se pudo crear la seccion."));
      }
    })();
  };

  const openEditSection = (section: Section) => {
    setEditingSection(section);
    setSectionForm({ n_section: String(section.n_section), descripcion: section.descripcion });
    setSectionEditOpen(true);
  };

  const updateSection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingSection) return;
    if (!sectionForm.n_section || !sectionForm.descripcion.trim()) {
      setErrorMessage("Complete numero y descripcion de la seccion.");
      return;
    }
    void (async () => {
      try {
        await apiPut(
          withParams(config.endpoints.storage.sectionById, {
            section: editingSection.id
          }),
          {
            n_section: sectionForm.n_section,
            descripcion: sectionForm.descripcion.trim()
          }
        );
        setSectionEditOpen(false);
        setEditingSection(null);
        setSectionForm(emptySectionForm);
        setReloadKey((previous) => previous + 1);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "No se pudo actualizar la seccion."));
      }
    })();
  };

  const deleteSection = (sectionId: number) => {
    if ((andamiosBySectionCount.get(sectionId) ?? 0) > 0) return;
    if (!window.confirm("Seguro de eliminar esta seccion?")) return;
    void (async () => {
      try {
        await apiDelete(
          withParams(config.endpoints.storage.sectionById, {
            section: sectionId
          })
        );
        setReloadKey((previous) => previous + 1);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "No se pudo eliminar la seccion."));
      }
    })();
  };

  const createAndamio = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (view.level !== "andamios" && view.level !== "boxes" && view.level !== "archivos") return;
    setErrorMessage("");
    if (!andamioForm.n_andamio || !andamioForm.descripcion.trim()) {
      setErrorMessage("Complete numero y descripcion del andamio.");
      return;
    }
    void (async () => {
      try {
        await apiPost(
          withParams(config.endpoints.storage.andamios, {
            section: view.sectionId
          }),
          {
            n_andamio: Number(andamioForm.n_andamio),
            descripcion: andamioForm.descripcion.trim()
          }
        );
        setAndamioForm(emptyAndamioForm);
        setReloadKey((previous) => previous + 1);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "No se pudo crear el andamio."));
      }
    })();
  };

  const openEditAndamio = (andamio: Andamio) => {
    setEditingAndamio(andamio);
    setAndamioForm({ n_andamio: String(andamio.n_andamio), descripcion: andamio.descripcion });
    setAndamioEditOpen(true);
  };

  const updateAndamio = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingAndamio) return;
    if (!andamioForm.n_andamio || !andamioForm.descripcion.trim()) {
      setErrorMessage("Complete numero y descripcion del andamio.");
      return;
    }
    void (async () => {
      try {
        await apiPut(
          withParams(config.endpoints.storage.andamioById, {
            section: editingAndamio.section_id,
            andamio: editingAndamio.id
          }),
          {
            n_andamio: Number(andamioForm.n_andamio),
            descripcion: andamioForm.descripcion.trim()
          }
        );
        setAndamioEditOpen(false);
        setEditingAndamio(null);
        setAndamioForm(emptyAndamioForm);
        setReloadKey((previous) => previous + 1);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "No se pudo actualizar el andamio."));
      }
    })();
  };

  const deleteAndamio = (andamioId: number) => {
    if ((boxesByAndamioCount.get(andamioId) ?? 0) > 0) return;
    if (!window.confirm("Seguro de eliminar este andamio?")) return;
    const andamio = andamios.find((item) => item.id === andamioId);
    if (!andamio) return;

    void (async () => {
      try {
        await apiDelete(
          withParams(config.endpoints.storage.andamioById, {
            section: andamio.section_id,
            andamio: andamio.id
          })
        );
        setReloadKey((previous) => previous + 1);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "No se pudo eliminar el andamio."));
      }
    })();
  };

  const createBox = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (view.level !== "boxes" && view.level !== "archivos") return;
    setErrorMessage("");
    if (!boxForm.n_box) {
      setErrorMessage("Ingrese el numero de caja.");
      return;
    }
    void (async () => {
      try {
        await apiPost(
          withParams(config.endpoints.storage.boxes, {
            section: view.sectionId,
            andamio: view.andamioId
          }),
          {
            n_box: boxForm.n_box
          }
        );
        setBoxForm(emptyBoxForm);
        setReloadKey((previous) => previous + 1);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "No se pudo crear la caja."));
      }
    })();
  };

  const openEditBox = (box: Box) => {
    setEditingBox(box);
    setBoxForm({ n_box: String(box.n_box), descripcion: box.descripcion });
    setBoxEditOpen(true);
  };

  const updateBox = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingBox) return;
    if (!boxForm.n_box) {
      setErrorMessage("Ingrese el numero de caja.");
      return;
    }
    if (view.level !== "boxes" && view.level !== "archivos") return;
    void (async () => {
      try {
        await apiPut(
          withParams(config.endpoints.storage.boxById, {
            section: view.sectionId,
            andamio: editingBox.andamio_id,
            box: editingBox.id
          }),
          {
            n_box: boxForm.n_box
          }
        );
        setBoxEditOpen(false);
        setEditingBox(null);
        setBoxForm(emptyBoxForm);
        setReloadKey((previous) => previous + 1);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "No se pudo actualizar la caja."));
      }
    })();
  };

  const deleteBox = (boxId: number) => {
    if ((archivosByBoxCount.get(boxId) ?? 0) > 0) return;
    if (!window.confirm("Seguro de eliminar esta caja?")) return;
    if (view.level !== "boxes" && view.level !== "archivos") return;
    void (async () => {
      try {
        await apiDelete(
          withParams(config.endpoints.storage.boxById, {
            section: view.sectionId,
            andamio: view.andamioId,
            box: boxId
          })
        );
        setReloadKey((previous) => previous + 1);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "No se pudo eliminar la caja."));
      }
    })();
  };

  const removeArchivoFromStorage = (archivoId: number) => {
    if (!window.confirm("Seguro de retirar este archivo?")) return;
    if (view.level !== "archivos") return;
    void (async () => {
      try {
        await apiPost(
          withParams(config.endpoints.storage.moveArchivo, {
            section: view.sectionId,
            andamio: view.andamioId,
            box: view.boxId,
            block: archivoId
          })
        );
        setReloadKey((previous) => previous + 1);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "No se pudo retirar el archivo del almacen."));
      }
    })();
  };

  const titleByLevel = {
    sections: "Gestion de secciones",
    andamios: activeSection ? `Andamios de la seccion ${activeSection.n_section}` : "Andamios",
    boxes: activeAndamio ? `Cajas del andamio ${activeAndamio.n_andamio}` : "Cajas",
    archivos: activeBox ? `Archivos en caja ${activeBox.n_box}` : "Archivos"
  };

  const countByLevel = {
    sections: sectionsFiltered.length,
    andamios: andamiosFiltered.length,
    boxes: boxesFiltered.length,
    archivos: archivosFiltered.length
  };

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-border bg-gradient-to-r from-slate-900 to-indigo-700 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">Estructura de almacen</p>
            <h2 className="mt-2 text-2xl font-semibold">{titleByLevel[view.level]}</h2>
            <p className="mt-1 text-sm text-white/75">Administra secciones, andamios, cajas y archivos almacenados.</p>
          </div>
          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold">
            {isLoading ? (
              <span className="inline-block h-4 w-16 animate-pulse rounded-full bg-white/30" />
            ) : (
              `${countByLevel[view.level]} registros`
            )}
          </span>
        </div>
      </header>

      {errorMessage ? <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div> : null}

      {view.level === "sections" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-1">
            <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <LayoutGrid className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Secciones registradas</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : sections.length}</p>
                </div>
              </div>
            </article>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="Numero o descripcion de seccion" />
              <button type="button" onClick={() => setSearch("")} className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground">
                Limpiar
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">Registrar nueva seccion</h3>
            <form onSubmit={createSection} className="mt-3 flex flex-col gap-2 md:flex-row">
              <input type="number" min={1} value={sectionForm.n_section} onChange={(event) => setSectionForm((previous) => ({ ...previous, n_section: event.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="Numero de seccion" />
              <input value={sectionForm.descripcion} onChange={(event) => setSectionForm((previous) => ({ ...previous, descripcion: event.target.value }))} className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm" placeholder="Descripcion" />
              <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
                Guardar
              </button>
            </form>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <article key={`sections-loading-${index}`} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="h-5 animate-pulse rounded bg-muted/70" />
                  <div className="mt-2 h-4 animate-pulse rounded bg-muted/70" />
                  <div className="mt-4 h-8 animate-pulse rounded bg-muted/70" />
                </article>
              ))
            ) : sectionsFiltered.length ? (
              sectionsFiltered.map((section) => (
                <article key={section.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <h4 className="text-base font-semibold text-foreground">Seccion {section.n_section}</h4>
                  <p className="mt-2 text-sm text-muted-foreground">Descripcion: {section.descripcion}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a href={andamiosPath(section.id)} className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white">
                      <Eye className="h-3.5 w-3.5" />
                      Ver andamios
                    </a>
                    <button type="button" onClick={() => openEditSection(section)} className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white">
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSection(section.id)}
                      disabled={(andamiosBySectionCount.get(section.id) ?? 0) > 0}
                      title={(andamiosBySectionCount.get(section.id) ?? 0) > 0 ? "No se puede eliminar porque tiene andamios asociados" : ""}
                      className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="col-span-full rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
                No se encontraron secciones con ese criterio.
              </div>
            )}
          </div>
        </>
      ) : null}

      {view.level === "andamios" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-1">
            <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Andamios registrados</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : andamiosFiltered.length}</p>
                </div>
              </div>
            </article>
          </div>

          <div className="flex">
            <a href={sectionsPath} className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground">
              Volver a secciones
            </a>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="Numero o descripcion de andamio" />
              <button type="button" onClick={() => setSearch("")} className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground">
                Limpiar
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">Registrar nuevo andamio</h3>
            <form onSubmit={createAndamio} className="mt-3 flex flex-col gap-2 md:flex-row">
              <input type="number" min={1} value={andamioForm.n_andamio} onChange={(event) => setAndamioForm((previous) => ({ ...previous, n_andamio: event.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="Numero de andamio" />
              <input value={andamioForm.descripcion} onChange={(event) => setAndamioForm((previous) => ({ ...previous, descripcion: event.target.value }))} className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm" placeholder="Descripcion" />
              <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
                Guardar
              </button>
            </form>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <article key={`andamios-loading-${index}`} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="h-5 animate-pulse rounded bg-muted/70" />
                  <div className="mt-2 h-4 animate-pulse rounded bg-muted/70" />
                  <div className="mt-4 h-8 animate-pulse rounded bg-muted/70" />
                </article>
              ))
            ) : andamiosFiltered.length ? (
              andamiosFiltered.map((andamio) => (
                <article key={andamio.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <h4 className="text-base font-semibold text-foreground">Andamio {andamio.n_andamio}</h4>
                  <p className="mt-2 text-sm text-muted-foreground">Descripcion: {andamio.descripcion}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a href={boxesPath(andamio.section_id, andamio.id)} className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white">
                      <Eye className="h-3.5 w-3.5" />
                      Ver cajas
                    </a>
                    <button type="button" onClick={() => openEditAndamio(andamio)} className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white">
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAndamio(andamio.id)}
                      disabled={(boxesByAndamioCount.get(andamio.id) ?? 0) > 0}
                      title={(boxesByAndamioCount.get(andamio.id) ?? 0) > 0 ? "No se puede eliminar porque tiene cajas asociadas" : ""}
                      className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="col-span-full rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
                No se encontraron andamios con ese criterio.
              </div>
            )}
          </div>
        </>
      ) : null}

      {view.level === "boxes" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-1">
            <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Boxes className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cajas registradas</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : boxesFiltered.length}</p>
                </div>
              </div>
            </article>
          </div>

          <div className="flex">
            <a href={andamiosPath(view.sectionId)} className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground">
              Volver a andamios
            </a>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="Numero de caja" />
              <button type="button" onClick={() => setSearch("")} className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground">
                Limpiar
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">Registrar nueva caja</h3>
            <form onSubmit={createBox} className="mt-3 flex flex-col gap-2 md:flex-row">
              <input type="number" min={1} value={boxForm.n_box} onChange={(event) => setBoxForm((previous) => ({ ...previous, n_box: event.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="Numero de caja" />
              <input value={boxForm.descripcion} onChange={(event) => setBoxForm((previous) => ({ ...previous, descripcion: event.target.value }))} className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm" placeholder="Descripcion" />
              <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
                Guardar
              </button>
            </form>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <article key={`boxes-loading-${index}`} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="h-5 animate-pulse rounded bg-muted/70" />
                  <div className="mt-2 h-4 animate-pulse rounded bg-muted/70" />
                  <div className="mt-4 h-8 animate-pulse rounded bg-muted/70" />
                </article>
              ))
            ) : boxesFiltered.length ? (
              boxesFiltered.map((box) => (
                <article key={box.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <h4 className="text-base font-semibold text-foreground">Caja {box.n_box}</h4>
                  <p className="mt-2 text-sm text-muted-foreground">{box.descripcion}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a href={archivosPath(view.sectionId, view.andamioId, box.id)} className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white">
                      <Eye className="h-3.5 w-3.5" />
                      Ver archivos
                    </a>
                    <button type="button" onClick={() => openEditBox(box)} className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white">
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteBox(box.id)}
                      disabled={(archivosByBoxCount.get(box.id) ?? 0) > 0}
                      title={(archivosByBoxCount.get(box.id) ?? 0) > 0 ? "No se puede eliminar porque tiene archivos asociados" : ""}
                      className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="col-span-full rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
                No se encontraron cajas con ese criterio.
              </div>
            )}
          </div>
        </>
      ) : null}

      {view.level === "archivos" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-1">
            <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileArchive className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Archivos en caja</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : archivosFiltered.length}</p>
                </div>
              </div>
            </article>
          </div>

          <div className="flex">
            <a href={boxesPath(view.sectionId, view.andamioId)} className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground">
              Volver a cajas
            </a>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm" placeholder="N. bloque, asunto, folios o periodo" />
              <button type="button" onClick={() => setSearch("")} className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground">
                Limpiar
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead className="bg-muted/60">
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Asunto</th>
                    <th className="px-4 py-3">Folios</th>
                    <th className="px-4 py-3">Periodo</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <tr key={`archivos-loading-${index}`} className="border-t border-border">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="h-8 animate-pulse rounded bg-muted/70" />
                        </td>
                      </tr>
                    ))
                  ) : archivosFiltered.length ? (
                    archivosFiltered.map((archivo) => (
                      <tr key={archivo.id} className="border-t border-border">
                        <td className="px-4 py-3">{archivo.id}</td>
                        <td className="px-4 py-3">{archivo.asunto}</td>
                        <td className="px-4 py-3">{archivo.folios}</td>
                        <td className="px-4 py-3">{archivo.periodo}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <a href="/bloques" className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white">
                              <Eye className="h-3.5 w-3.5" />
                              Ver documento
                            </a>
                            <button type="button" onClick={() => removeArchivoFromStorage(archivo.id)} className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">
                              Retirar del almacen
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No hay archivos en este paquete.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      <Modal open={sectionEditOpen} title="Editar seccion" onClose={() => setSectionEditOpen(false)}>
        <form onSubmit={updateSection} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Numero de seccion</label>
            <input type="number" min={1} value={sectionForm.n_section} onChange={(event) => setSectionForm((previous) => ({ ...previous, n_section: event.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Descripcion</label>
            <input value={sectionForm.descripcion} onChange={(event) => setSectionForm((previous) => ({ ...previous, descripcion: event.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={andamioEditOpen} title="Editar andamio" onClose={() => setAndamioEditOpen(false)}>
        <form onSubmit={updateAndamio} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Numero de andamio</label>
            <input type="number" min={1} value={andamioForm.n_andamio} onChange={(event) => setAndamioForm((previous) => ({ ...previous, n_andamio: event.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Descripcion</label>
            <input value={andamioForm.descripcion} onChange={(event) => setAndamioForm((previous) => ({ ...previous, descripcion: event.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={boxEditOpen} title="Editar caja" onClose={() => setBoxEditOpen(false)}>
        <form onSubmit={updateBox} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Numero de caja</label>
            <input type="number" min={1} value={boxForm.n_box} onChange={(event) => setBoxForm((previous) => ({ ...previous, n_box: event.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Descripcion</label>
            <input value={boxForm.descripcion} onChange={(event) => setBoxForm((previous) => ({ ...previous, descripcion: event.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Guardar
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
