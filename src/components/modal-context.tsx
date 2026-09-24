"use client";

import { createContext, useContext } from "react";

/**
 * Lets a form inside a modal dismiss it without the modal passing a callback
 * down as a child function — server components cannot hand functions to client
 * components, so the close handler travels through context instead.
 */
const ModalCloseContext = createContext<(() => void) | null>(null);

export const ModalCloseProvider = ModalCloseContext.Provider;

export function useModalClose() {
  return useContext(ModalCloseContext);
}
