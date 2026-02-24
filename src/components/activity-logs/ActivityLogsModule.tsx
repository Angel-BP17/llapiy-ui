import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { config } from "@/config/llapiy-config";
import { apiGet, downloadWebReport, getPaginationMeta, toList, unwrapData, type PaginationMeta } from "@/lib/llapiy-api";
import { ClipboardList, Eye, FileDown, LayoutGrid, Users } from "lucide-react";

type User = { id: number; name: string; last_name: string };
type LogRecord = {
  id: number;
  user_id: number | null;
  action: string;
  module: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
};

type Filters = { date: string; user_id: string; module: string };
const emptyFilters: Filters = { date: "", user_id: "", module: "" };
const emptyPagination: PaginationMeta = { currentPage: 1, lastPage: 1, perPage: 0, total: 0, from: 0, to: 0 };

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

function toDisplayDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString("es-PE")} ${date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`;
}

async function downloadActivityReport(filters: Filters) {
  try {
    await downloadWebReport(
      config.endpoints.activityLogs.pdf,
      {
        date: filters.date || undefined,
        user_id: filters.user_id || undefined,
        module: filters.module || undefined
      },
      "reporte_actividades.pdf"
    );
  } catch (error) {
    console.error("[ActivityLogsModule] Report error:", error);
    window.alert("No se pudo generar el reporte de actividades.");
  }
}

export default function ActivityLogsModule() {
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [userOptions, setUserOptions] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(emptyFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination);
  const [modules, setModules] = useState<string[]>([]);
  const [dataModalOpen, setDataModalOpen] = useState(false);
  const [dataModalTitle, setDataModalTitle] = useState("");
  const [dataModalData, setDataModalData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let ignore = false;

    const parsePayload = (value: unknown): Record<string, unknown> | null => {
      if (!value) return null;
      if (typeof value === "object") return value as Record<string, unknown>;
      if (typeof value === "string") {
        try {
          return JSON.parse(value) as Record<string, unknown>;
        } catch {
          return { value };
        }
      }
      return null;
    };

    const load = async () => {
      setIsLoading(true);
      try {
        const response = await apiGet<{
          logs: { data: any[] } | any[];
          users: any[];
          modules: string[];
        }>(config.endpoints.activityLogs.list, {
          date: appliedFilters.date || undefined,
          user_id: appliedFilters.user_id || undefined,
          module: appliedFilters.module || undefined,
          page: currentPage
        });
        const data = unwrapData(response) as { logs?: unknown; users?: unknown; modules?: unknown };

        const nextLogs = toList<any>(data?.logs).map((item) => ({
          id: Number(item?.id ?? 0),
          user_id: Number(item?.user_id ?? 0) || null,
          action: String(item?.action ?? item?.event ?? "update"),
          module: String(item?.model ?? "General").replace("App\\Models\\", ""),
          before: parsePayload(item?.before),
          after: parsePayload(item?.after),
          created_at: String(item?.created_at ?? "")
        }));

        const nextUsers = toList<any>(data?.users).map((item) => ({
          id: Number(item?.id ?? 0),
          name: String(item?.name ?? ""),
          last_name: String(item?.last_name ?? "")
        }));
        const nextModules = toList<any>(data?.modules).map((moduleName) => String(moduleName ?? "")).filter(Boolean);

        if (!ignore) {
          setLogs(nextLogs);
          setUserOptions(nextUsers);
          setModules([...new Set(nextModules)].sort());
          setPagination(getPaginationMeta(data?.logs));
        }
      } catch (error) {
        console.error("[ActivityLogsModule] Load error:", error);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    void load();
    return () => {
      ignore = true;
    };
  }, [appliedFilters, currentPage]);

  const totalPages = Math.max(1, pagination.lastPage);
  const paginatedLogs = logs;

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const openDataModal = (title: string, data: Record<string, unknown> | null) => {
    if (!data) return;
    setDataModalTitle(title);
    setDataModalData(data);
    setDataModalOpen(true);
  };

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-border bg-gradient-to-r from-slate-900 to-emerald-700 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">Auditoria del sistema</p>
            <h2 className="mt-2 text-2xl font-semibold">Registro de actividades</h2>
            <p className="mt-1 text-sm text-white/75">Revisa cambios, usuarios y modulos afectados.</p>
          </div>
          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold">{isLoading ? <span className="inline-block h-4 w-16 animate-pulse rounded-full bg-white/30" /> : `${pagination.total} registros`}</span>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Actividades listadas</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : pagination.total}</p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Usuarios en filtro</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : userOptions.length}</p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Modulos detectados</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{isLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted" /> : modules.length}</p>
            </div>
          </div>
        </article>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Fecha</label>
            <input type="date" value={filters.date} onChange={(event) => setFilters((previous) => ({ ...previous, date: event.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Usuario</label>
            <select value={filters.user_id} onChange={(event) => setFilters((previous) => ({ ...previous, user_id: event.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              <option value="">Todos</option>
              {userOptions.map((user) => (
                <option key={user.id} value={String(user.id)}>
                  {user.name} {user.last_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Modulo</label>
            <select value={filters.module} onChange={(event) => setFilters((previous) => ({ ...previous, module: event.target.value }))} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              <option value="">Todos</option>
              {modules.map((moduleName) => (
                <option key={moduleName} value={moduleName}>
                  {moduleName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button type="button" onClick={() => { setCurrentPage(1); setAppliedFilters({ ...filters }); }} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
              Buscar
            </button>
            <button type="button" onClick={() => { setFilters(emptyFilters); setAppliedFilters(emptyFilters); setCurrentPage(1); }} className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground">
              Limpiar
            </button>
          </div>
        </div>
        <div className="mt-4">
          <button type="button" onClick={() => void downloadActivityReport(appliedFilters)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white">
            <FileDown className="h-4 w-4" />
            Generar reporte
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-muted/60">
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Accion</th>
                <th className="px-4 py-3">Modulo</th>
                <th className="px-4 py-3">Datos antes</th>
                <th className="px-4 py-3">Datos despues</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`activity-loading-${index}`} className="border-t border-border">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-8 animate-pulse rounded bg-muted/70" />
                    </td>
                  </tr>
                ))
              ) : paginatedLogs.length ? (
                paginatedLogs.map((log) => {
                  const user = userOptions.find((item) => item.id === log.user_id);
                  return (
                    <tr key={log.id} className="border-t border-border">
                      <td className="px-4 py-3">{user ? `${user.name} ${user.last_name}` : "Desconocido"}</td>
                      <td className="px-4 py-3">{log.action}</td>
                      <td className="px-4 py-3">{log.module}</td>
                      <td className="px-4 py-3">
                        {log.before ? (
                          <button type="button" onClick={() => openDataModal("Datos antes", log.before)} className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white">
                            <Eye className="h-3.5 w-3.5" />
                            Ver datos
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {log.after ? (
                          <button type="button" onClick={() => openDataModal("Datos despues", log.after)} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                            <Eye className="h-3.5 w-3.5" />
                            Ver datos
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{toDisplayDate(log.created_at)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No hay actividades registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
        <p className="text-muted-foreground">Mostrando {paginatedLogs.length} de {pagination.total} actividades</p>
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

      <Modal open={dataModalOpen} title={dataModalTitle} onClose={() => setDataModalOpen(false)}>
        {dataModalData ? (
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(dataModalData).map(([key, value]) => (
                <tr key={key} className="border-b border-border last:border-0">
                  <th className="w-40 px-2 py-2 text-left font-semibold text-foreground">{key}</th>
                  <td className="px-2 py-2 text-muted-foreground">{typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </Modal>
    </section>
  );
}
