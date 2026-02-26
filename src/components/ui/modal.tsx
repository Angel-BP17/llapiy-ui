import type { ReactNode } from "react";

export type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
};

export function Modal({
  open,
  title,
  onClose,
  children,
  maxWidth = "max-w-5xl",
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
      <div
        className={`max-h-[92vh] w-full overflow-hidden rounded-2xl border border-border bg-card shadow-xl ${maxWidth}`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-accent"
          >
            Cerrar
          </button>
        </div>
        <div className="max-h-[calc(92vh-72px)] overflow-y-auto px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
