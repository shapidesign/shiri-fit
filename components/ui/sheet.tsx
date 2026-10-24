"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

/** Bottom sheet on top of the native <dialog>: focus trap, Esc, backdrop click — all for free. */
export function Sheet({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      onClose={(e) => { if (e.target === ref.current) onClose(); }} // a nested sheet's close must not close this one
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <div className="safe-bottom px-5 pt-3">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" aria-hidden />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="סגירה" className="grid h-10 w-10 place-items-center rounded-full bg-surface">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70dvh] overflow-y-auto pb-2">{children}</div>
      </div>
    </dialog>
  );
}
