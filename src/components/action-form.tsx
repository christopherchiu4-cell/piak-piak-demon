"use client";

import { createContext, useContext, useRef, useState, useTransition, type ButtonHTMLAttributes, type FormEvent, type ReactNode } from "react";
import { unstable_rethrow } from "next/navigation";
import { createPortal } from "react-dom";
import { Spinner } from "./loading-indicator";

const FormContext = createContext({ pending: false, submitter: "" });

export function ActionForm({ action, children, className, successMessage = "Changes saved.", confirmMessage, feedbackPlacement = "inline", errorMessage = "We couldn’t complete that request. Your entries are still here. Check your connection and try again." }: {
  action: (data: FormData) => Promise<void>;
  children: ReactNode;
  className?: string;
  successMessage?: string;
  confirmMessage?: string;
  feedbackPlacement?: "inline" | "toast";
  errorMessage?: string;
}) {
  const [pending, startTransition] = useTransition();
  const locked = useRef(false);
  const [submitter, setSubmitter] = useState("");
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Lock synchronously, before React renders the disabled controls.
    if (locked.current || pending) return;
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    const button = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    // Include the clicked button's name/value (e.g. Save draft versus Publish).
    const data = new FormData(event.currentTarget, button);
    locked.current = true;
    setSubmitter(`${button?.name ?? ""}:${button?.value ?? ""}`);
    setMessage("");
    setFailed(false);
    startTransition(async () => {
      try {
        await action(data);
        setMessage(successMessage);
      } catch (error) {
        unstable_rethrow(error);
        setFailed(true);
        setMessage(errorMessage);
      } finally {
        locked.current = false;
      }
    });
  }

  return <FormContext.Provider value={{ pending, submitter }}>
    <form action={action} onSubmit={submit} className={className} aria-busy={pending}>
      <fieldset className="form-controls" disabled={pending}>{children}</fieldset>
      {feedbackPlacement === "inline" ? <p className={`form-feedback${failed ? " form-error" : ""}`} role={failed ? "alert" : "status"} aria-live="polite">
        {pending ? "Please wait while we finish your request…" : message}
      </p> : <>
        <span className="sr-only" role="status">{pending ? "Please wait while we finish your request…" : ""}</span>
        {message && createPortal(<div className={`request-toast${failed ? " request-toast-error" : ""}`} role={failed ? "alert" : "status"}>
          <span className="toast-symbol" aria-hidden="true">{failed ? "!" : "✓"}</span><p>{message}</p><button type="button" aria-label="Dismiss notification" onClick={() => setMessage("")}>×</button>
        </div>, document.body)}
      </>}
    </form>
  </FormContext.Provider>;
}

export function SubmitButton({ children, pendingLabel = "Saving…", disabled, name, value, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { pendingLabel?: string }) {
  const { pending, submitter } = useContext(FormContext);
  const active = pending && submitter === `${name ?? ""}:${value ?? ""}`;
  return <button {...props} type="submit" name={name} value={value} disabled={disabled || pending} aria-busy={active}>
    {active && <Spinner />}{active ? pendingLabel : children}
  </button>;
}
