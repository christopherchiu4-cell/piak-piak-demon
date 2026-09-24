"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * A <details> overflow menu. Native disclosure means it works without JS;
 * the effect only adds the click-outside and Escape conveniences.
 */
export function OverflowMenu({ children, label = "More actions" }: { children: ReactNode; label?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = ref.current;
    if (!details) return;
    function onPointerDown(event: PointerEvent) {
      if (details && details.open && !details.contains(event.target as Node)) details.open = false;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && details?.open) details.open = false;
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return <details className="overflow-menu" ref={ref}>
    <summary aria-label={label}><span aria-hidden="true">•••</span></summary>
    <div className="menu-panel">{children}</div>
  </details>;
}
