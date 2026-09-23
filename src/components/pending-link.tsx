"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";
import { Spinner } from "./loading-indicator";

function LinkFeedback() {
  const { pending } = useLinkStatus();
  return pending ? <span className="link-loading" role="status"><Spinner /><span className="sr-only">Loading page…</span></span> : null;
}

export default function PendingLink({ children, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props}>{children}<LinkFeedback /></Link>;
}
