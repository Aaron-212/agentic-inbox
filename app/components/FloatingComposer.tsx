// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { m } from "shared/paraglide/messages.js";

import { Loader } from "@cloudflare/kumo";
import { lazy, Suspense } from "react";
import { useComposeStore } from "~/hooks/useComposeStore";

const ComposePanel = lazy(() => import("./ComposePanel"));

export default function FloatingComposer() {
  const sessions = useComposeStore((state) => state.sessions);
  const restore = useComposeStore((state) => state.restore);

  const hasMinimized = sessions.some((session) => session.minimized);
  const hasOpenComposer = sessions.some((session) => !session.minimized);
  const hasExpandedComposer = sessions.some((session) => !session.minimized && session.expanded);

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className={`absolute inset-0 ${hasMinimized && !hasExpandedComposer ? "@3xl:bottom-16" : ""}`}>
        <Suspense
          fallback={
            <div role="status" aria-label={m.loading_composer()} className="flex h-full items-center justify-center">
              <Loader size="base" />
            </div>
          }
        >
          {sessions.map((session) => (
            <ComposePanel key={session.id} session={session} />
          ))}
        </Suspense>
      </div>
      <div
        className={`pointer-events-auto absolute inset-x-0 bottom-0 gap-2 overflow-x-auto px-2 ${hasExpandedComposer ? "hidden" : hasOpenComposer ? "hidden @3xl:flex" : "flex"}`}
      >
        {sessions
          .filter((session) => session.minimized)
          .map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => restore(session.id)}
              className="border-kumo-line bg-kumo-base hover:bg-kumo-tint max-w-64 shrink-0 rounded-t-lg border px-4 py-3 text-left shadow-lg first:ml-auto"
              aria-label={m.resume_composer({
                subject: session.fields?.subject || m.new_message(),
                mailbox: session.mailboxId,
              })}
            >
              <span className="block truncate text-sm font-medium">{session.fields?.subject || m.new_message()}</span>
              <span className="text-kumo-subtle block truncate text-xs">{session.mailboxId}</span>
            </button>
          ))}
      </div>
    </div>
  );
}
