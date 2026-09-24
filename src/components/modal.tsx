"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ModalCloseProvider } from "./modal-context";

/**
 * A native <dialog>. Contents mount only once opened, so forms inside start
 * fresh each time. Anything within can dismiss it via useModalClose();
 * ActionForm does that automatically with closeOnSuccess.
 */
export function Modal({ label, title, description, className = "button secondary", wide, children }: {
  label: ReactNode;
  title: string;
  description?: string;
  className?: string;
  /** Widens the dialog for content that needs to browse a list rather than fill a few fields. */
  wide?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => { ref.current?.close(); setOpen(false); }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) dialog.showModal();
  }, [open]);

  return <>
    <button type="button" className={className} onClick={() => setOpen(true)}>{label}</button>
    {open && <dialog ref={ref} className={wide ? "modal modal-wide" : "modal"} onClose={() => setOpen(false)} onClick={(event) => { if (event.target === ref.current) close(); }}>
      <div className="modal-card">
        <div className="row-between"><h2>{title}</h2><button type="button" className="modal-close" aria-label="Close" onClick={close}>×</button></div>
        {description && <p className="muted">{description}</p>}
        <ModalCloseProvider value={close}>{children}</ModalCloseProvider>
      </div>
    </dialog>}
  </>;
}
