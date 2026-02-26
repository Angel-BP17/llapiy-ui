import { Eye, Pencil, Trash2 } from "lucide-react";

type AreaRecord = {
  id: number;
  descripcion: string;
  abreviacion: string;
};

type AreaCardProps = {
  area: AreaRecord;
  isLoading: boolean;
  totalGroups: number;
  onDetails: (area: AreaRecord) => void;
  onEdit: (area: AreaRecord) => void;
  onDelete: (id: number) => void;
};

export function AreaCard({ area, isLoading, totalGroups, onDetails, onEdit, onDelete }: AreaCardProps) {
  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-base font-semibold text-foreground">
        {area.descripcion} ({area.abreviacion || "-"})
      </h3>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => onDetails(area)} className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white">
          <Eye className="h-3.5 w-3.5" />
          Ver grupos y subgrupos
        </button>
        <button type="button" onClick={() => onEdit(area)} className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white">
          <Pencil className="h-3.5 w-3.5" />
          Editar area
        </button>
        <button
          type="button"
          onClick={() => onDelete(area.id)}
          disabled={totalGroups > 0}
          title={totalGroups > 0 ? "No se puede eliminar porque tiene grupos asociados" : ""}
          className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Eliminar area
        </button>
      </div>
    </article>
  );
}
