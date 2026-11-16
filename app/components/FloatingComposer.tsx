// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { useComposeStore } from "~/hooks/useComposeStore";
import ComposePanel from "./ComposePanel";

export default function FloatingComposer() {
  const sessions = useComposeStore((state) => state.sessions);
  const restore = useComposeStore((state) => state.restore);

  const hasMinimized = sessions.some((session) => session.minimized);
  const hasOpenComposer = sessions.some((session) => !session.minimized);
  const hasExpandedComposer = sessions.some((session) => !session.minimized && session.expanded);

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className={`absolute inset-0 ${hasMinimized && !hasExpandedComposer ? "@3xl:bottom-16" : ""}`}>
        {sessions.map((session) => (
          <ComposePanel key={session.id} session={session} />
        ))}
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
              aria-label={`Resume ${session.fields?.subject || "new message"} from ${session.mailboxId}`}
            >
              <span className="block truncate text-sm font-medium">{session.fields?.subject || "New message"}</span>
              <span className="text-kumo-subtle block truncate text-xs">{session.mailboxId}</span>
            </button>
          ))}
      </div>
    </div>
  );
}
