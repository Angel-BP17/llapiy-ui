import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { config, withId } from "@/config/llapiy-config";
import { apiGet, apiPut, toList, unwrapData } from "@/lib/llapiy-api";
import { useAuthPermissions } from "@/lib/use-auth-permissions";

type Area = { id: number; descripcion: string };
type Section = { id: number; n_section: string };
type Andamio = { id: number; n_andamio: string; section_id: number };
type Box = { id: number; n_box: string; andamio_id: number };

type InboxBlock = {
  id: number;
  n_bloque: string;
  asunto: string;
  folios: string;
  fecha: string;
  area_id: number | null;
  box_id: number | null;
  root_file: string | null;
};

type Filters = {
  search: string;
  area_id: string;
  periodo: string;
};

type StorageForm = {
  section_id: string;
  andamio_id: string;
  box_id: string;
};

const areas: Area[] = [];
const sections: Section[] = [];
const andamios: Andamio[] = [];
const boxes: Box[] = [];

const emptyStorageForm: StorageForm = { section_id: "", andamio_id: "", box_id: "" };

function Modal({
  open,
  title,
  onClose,
  children,
  maxWidth = "max-w-lg"
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

function monthName(dateText: string) {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-PE", { month: "long" }).replace(/^\w/, (char) => char.toUpperCase());
}

function yearOf(dateText: string) {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return "";
  return String(date.getFullYear());
}

export default function InboxModule() {
  const [blocks, setBlocks] = useState<InboxBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ search: "", area_id: "", periodo: "" });
  const [currentPage, setCurrentPage] = useState(1);

  const [storageOpen, setStorageOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<InboxBlock | null>(null);
  const [storageForm, setStorageForm] = useState<StorageForm>(emptyStorageForm);
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [storageError, setStorageError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [attendedCountApi, setAttendedCountApi] = useState<number | null>(null);
  const [unattendedCountApi, setUnattendedCountApi] = useState<number | null>(null);
  const { can: canByPermission } = useAuthPermissions();

  const canUploadBlock = canByPermission("blocks.upload");

  const loadInbox = async () => {
    setIsLoading(true);
    try {
      const response = await apiGet<{
        documents: { data: any[] } | any[];
        areas: any[];
        sections: any[];
        andamios: any[];
        boxes: any[];
        periodos: (string | number)[];
        attendedBlocksCount: number;
        unattendedBlocksCount: number;
      }>(config.endpoints.inbox.list, {
        search: filters.search || undefined,
        area_id: filters.area_id || undefined,
        fecha: filters.periodo || undefined
      });

      const data = unwrapData(response) as {
        documents?: unknown;
        areas?: unknown;
        sections?: unknown;
        andamios?: unknown;
        boxes?: unknown;
        attendedBlocksCount?: number;
        unattendedBlocksCount?: number;
      };

      const nextBlocks = toList<any>(data?.documents).map((item) => ({
        id: Number(item?.id ?? 0),
        n_bloque: String(item?.n_bloque ?? ""),
        asunto: String(item?.asunto ?? ""),
        folios: String(item?.folios ?? ""),
        fecha: String(item?.fecha ?? ""),
        area_id: Number(item?.area_id ?? item?.user?.group?.area_group_type?.area_id ?? 0) || null,
        box_id: Number(item?.box_id ?? 0) || null,
        root_file: item?.root ? String(item.root) : null
      }));

      const nextAreas = toList<any>(data?.areas).map((item) => ({
        id: Number(item?.id ?? 0),
        descripcion: String(item?.descripcion ?? "")
      }));
      const nextSections = toList<any>(data?.sections).map((item) => ({
        id: Number(item?.id ?? 0),
        n_section: String(item?.n_section ?? "")
      }));
      const nextAndamios = toList<any>(data?.andamios).map((item) => ({
        id: Number(item?.id ?? 0),
        n_andamio: String(item?.n_andamio ?? ""),
        section_id: Number(item?.section_id ?? 0)
      }));
      const nextBoxes = toList<any>(data?.boxes).map((item) => ({
        id: Number(item?.id ?? 0),
        n_box: String(item?.n_box ?? ""),
        andamio_id: Number(item?.andamio_id ?? 0)
      }));

      setBlocks(nextBlocks);
      areas.splice(0, areas.length, ...nextAreas);
      sections.splice(0, sections.length, ...nextSections);
      andamios.splice(0, andamios.length, ...nextAndamios);
      boxes.splice(0, boxes.length, ...nextBoxes);
      setAttendedCountApi(typeof data?.attendedBlocksCount === "number" ? data.attendedBlocksCount : null);
      setUnattendedCountApi(typeof data?.unattendedBlocksCount === "number" ? data.unattendedBlocksCount : null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadInbox().catch((error) => {
      console.error("[InboxModule] Load error:", error);
    });
  }, []);

  const years = useMemo(() => [...new Set(blocks.map((block) => yearOf(block.fecha)).filter(Boolean))].sort((a, b) => Number(b) - Number(a)), [blocks]);

  const filteredBlocks = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return blocks.filter((block) => {
      const bySearch = !query || block.asunto.toLowerCase().includes(query) || block.n_bloque.toLowerCase().includes(query);
      const byArea = !filters.area_id || String(block.area_id) === filters.area_id;
      const byPeriodo = !filters.periodo || yearOf(block.fecha) === filters.periodo;
      return bySearch && byArea && byPeriodo;
    });
  }, [blocks, filters]);

  const attendedCount = blocks.filter((block) => block.box_id !== null).length;
  const unattendedCount = blocks.length - attendedCount;

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredBlocks.length / pageSize));
  const paginatedBlocks = filteredBlocks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const andamiosForSection = useMemo(() => (storageForm.section_id ? andamios.filter((andamio) => andamio.section_id === Number(storageForm.section_id)) : []), [storageForm.section_id]);
  const boxesForAndamio = useMemo(() => (storageForm.andamio_id ? boxes.filter((box) => box.andamio_id === Number(storageForm.andamio_id)) : []), [storageForm.andamio_id]);

  const openStorageModal = (block: InboxBlock) => {
    setSelectedBlock(block);
    setStorageError("");
    if (block.box_id) {
      const box = boxes.find((item) => item.id === block.box_id);
      const andamio = box ? andamios.find((item) => item.id === box.andamio_id) : null;
      setStorageForm({
        section_id: andamio ? String(andamio.section_id) : "",
        andamio_id: andamio ? String(andamio.id) : "",
        box_id: box ? String(box.id) : ""
      });
    } else {
      setStorageForm(emptyStorageForm);
    }
    setStorageOpen(true);
  };

  const openUploadModal = (block: InboxBlock) => {
    setSelectedBlock(block);
    setUploadError("");
    setUploadFileName(block.root_file ?? "");
    setUploadFile(null);
    setUploadOpen(true);
  };

  const submitStorage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedBlock) return;
    if (!storageForm.section_id || !storageForm.andamio_id || !storageForm.box_id) {
      setStorageError("Seleccione seccion, andamio y caja.");
      return;
    }
    void (async () => {
      try {
        await apiPut(withId(config.endpoints.inbox.updateStorage, selectedBlock.id), {
          n_box: Number(storageForm.box_id),
          n_andamio: storageForm.andamio_id,
          n_section: storageForm.section_id
        });
        await loadInbox();
        setStorageOpen(false);
        setSelectedBlock(null);
        setStorageError("");
      } catch (error: unknown) {
        const message =
          typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof (error as { message?: unknown }).message === "string"
            ? (error as { message: string }).message
            : "No se pudo actualizar el almacenamiento.";
        setStorageError(message);
      }
    })();
  };

  const submitUpload = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedBlock) return;
    if (!uploadFile) {
      setUploadError("Seleccione un archivo PDF.");
      return;
    }
    void (async () => {
      try {
        const formData = new FormData();
        formData.append("root", uploadFile);
        await apiPut(withId(config.endpoints.blocks.upload, selectedBlock.id), formData);
        await loadInbox();
        setUploadOpen(false);
        setSelectedBlock(null);
        setUploadError("");
      } catch (error: unknown) {
        const message =
          typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof (error as { message?: unknown }).message === "string"
            ? (error as { message: string }).message
            : "No se pudo subir el archivo.";
        setUploadError(message);
      }
    })();
  };

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-border bg-gradient-to-r from-slate-900 to-blue-700 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">Flujo de ingreso de bloques</p>
            <h2 className="mt-2 text-2xl font-semibold">Gestion de bandeja de entrada</h2>
            <p className="mt-1 text-sm text-white/75">Busca, asigna almacenamiento y registra archivos en un solo lugar.</p>
          </div>
          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold">{isLoading ? <span className="inline-block h-4 w-16 animate-pulse rounded-full bg-white/30" /> : `${filteredBlocks.length} registros`}</span>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Bloques en bandeja</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : filteredBlocks.length}</p>
        </article>
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Bloques atendidos</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : (attendedCountApi ?? attendedCount)}</p>
        </article>
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Bloques sin atender</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : (unattendedCountApi ?? unattendedCount)}</p>
        </article>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-muted-foreground">Asunto</label>
            <input value={filters.search} onChange={(event) => setFilters((previous) => ({ ...previous, search: event.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" placeholder="Ej. informe, solicitud, memo" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Area</label>
            <select value={filters.area_id} onChange={(event) => setFilters((previous) => ({ ...previous, area_id: event.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              <option value="">Todas las areas</option>
              {areas.map((area) => (
                <option key={area.id} value={String(area.id)}>
                  {area.descripcion}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Periodo</label>
            <select value={filters.periodo} onChange={(event) => setFilters((previous) => ({ ...previous, periodo: event.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              <option value="">Todos</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => { setCurrentPage(1); void loadInbox().catch((error) => console.error("[InboxModule] Search error:", error)); }} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
            Aplicar
          </button>
          <button type="button" onClick={() => { setFilters({ search: "", area_id: "", periodo: "" }); setCurrentPage(1); void loadInbox().catch((error) => console.error("[InboxModule] Clear error:", error)); }} className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground">
            Limpiar filtros
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center shadow-sm">
          <div className="mx-auto mb-3 h-16 w-16 animate-pulse rounded-full bg-muted" />
          <p className="text-sm text-muted-foreground">Cargando bloques de bandeja...</p>
        </div>
      ) : !paginatedBlocks.length ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-2xl text-muted-foreground">+</div>
          <h3 className="text-lg font-semibold text-foreground">No hay bloques en la bandeja</h3>
          <p className="mt-1 text-sm text-muted-foreground">Ajusta los filtros o espera nuevos ingresos para continuar.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="bg-muted/60">
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Asunto</th>
                    <th className="px-4 py-3">Folios</th>
                    <th className="px-4 py-3">Periodo</th>
                    <th className="px-4 py-3">Mes</th>
                    <th className="px-4 py-3">Area</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBlocks.map((block) => {
                    const area = areas.find((item) => item.id === block.area_id);
                    return (
                      <tr key={block.id} className="border-t border-border">
                        <td className="px-4 py-3 text-muted-foreground">#{block.id}</td>
                        <td className="px-4 py-3">
                          <p className="max-w-[320px] truncate font-semibold text-foreground" title={block.asunto}>{block.asunto}</p>
                          <p className="text-xs text-muted-foreground">Bloque N. {block.n_bloque}</p>
                        </td>
                        <td className="px-4 py-3">{block.folios}</td>
                        <td className="px-4 py-3">{yearOf(block.fecha)}</td>
                        <td className="px-4 py-3">{monthName(block.fecha)}</td>
                        <td className="px-4 py-3">{area?.descripcion ?? "Sin area"}</td>
                        <td className="px-4 py-3">
                          {block.box_id ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Atendido</span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Sin atender</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => openStorageModal(block)} className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white">
                              Asignar
                            </button>
                            {canUploadBlock ? (
                              <button type="button" onClick={() => openUploadModal(block)} className="rounded-md bg-slate-600 px-3 py-1.5 text-xs font-semibold text-white">
                                Subir archivo
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
            <p className="text-muted-foreground">Mostrando {paginatedBlocks.length} de {filteredBlocks.length} bloques</p>
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
        </>
      )}

      <Modal open={storageOpen} title="Asignar almacenamiento" onClose={() => setStorageOpen(false)}>
        <form onSubmit={submitStorage} className="space-y-4">
          {storageError ? <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{storageError}</div> : null}
          <p className="text-sm text-muted-foreground">Selecciona seccion, andamio y caja.</p>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Seccion</label>
              <select value={storageForm.section_id} onChange={(event) => setStorageForm({ section_id: event.target.value, andamio_id: "", box_id: "" })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
                <option value="">Seleccione una seccion</option>
                {sections.map((section) => (
                  <option key={section.id} value={String(section.id)}>
                    {section.n_section}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Andamio</label>
              <select value={storageForm.andamio_id} onChange={(event) => setStorageForm((previous) => ({ ...previous, andamio_id: event.target.value, box_id: "" }))} disabled={!storageForm.section_id} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm disabled:opacity-60">
                <option value="">{storageForm.section_id ? "Seleccione un andamio" : "Seleccione una seccion primero"}</option>
                {andamiosForSection.map((andamio) => (
                  <option key={andamio.id} value={String(andamio.id)}>
                    {andamio.n_andamio}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Caja</label>
              <select value={storageForm.box_id} onChange={(event) => setStorageForm((previous) => ({ ...previous, box_id: event.target.value }))} disabled={!storageForm.andamio_id} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm disabled:opacity-60">
                <option value="">{storageForm.andamio_id ? "Seleccione una caja" : "Seleccione un andamio primero"}</option>
                {boxesForAndamio.map((box) => (
                  <option key={box.id} value={String(box.id)}>
                    {box.n_box}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Guardar</button>
          </div>
        </form>
      </Modal>

      {canUploadBlock ? (
        <Modal open={uploadOpen} title="Subir archivo del bloque" onClose={() => setUploadOpen(false)}>
          <form onSubmit={submitUpload} className="space-y-4">
            {uploadError ? <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{uploadError}</div> : null}
            <p className="text-sm text-muted-foreground">Bloque N. {selectedBlock?.n_bloque}</p>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Archivo (.pdf)</label>
              <input
                type="file"
                accept=".pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setUploadFile(file ?? null);
                  setUploadFileName(file ? file.name : "");
                }}
                className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              {uploadFileName ? <p className="mt-2 text-xs text-muted-foreground">Seleccionado: {uploadFileName}</p> : null}
            </div>
            <div className="flex justify-end">
              <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Subir archivo</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
