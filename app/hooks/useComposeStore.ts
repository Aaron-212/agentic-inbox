// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ComposeOptions } from "./useUIStore";

export interface ComposeFields {
  to: string;
  cc: string;
  bcc: string;
  showCcBcc: boolean;
  subject: string;
  body: string;
}

export interface ComposeSize {
  width: number;
  height: number;
}

export interface ComposeSession {
  id: string;
  mailboxId: string;
  options: ComposeOptions;
  draftId: string;
  hasSavedDraft: boolean;
  fields: ComposeFields | null;
  revision: number;
  savedRevision: number;
  minimized: boolean;
  expanded: boolean;
}

interface ComposeState {
  composerSize: ComposeSize | null;
  setComposerSize: (size: ComposeSize | null) => void;
  sessions: ComposeSession[];
  recoveryUnavailable: boolean;
  startCompose: (mailboxId: string, options?: ComposeOptions) => void;
  updateSession: (id: string, changes: Partial<ComposeSession>) => void;
  updateFields: (id: string, changes: Partial<ComposeFields>) => void;
  restore: (id: string) => void;
  remove: (id: string) => void;
}

// Session storage keeps recovery scoped to this browser tab, avoiding competing autosaves across tabs.
const recoveryStorage = createJSONStorage(() => ({
  getItem: (name: string) => window.sessionStorage.getItem(name),
  setItem: (name: string, value: string) => {
    try {
      window.sessionStorage.setItem(name, value);
    } catch {
      queueMicrotask(() => {
        if (!useComposeStore.getState().recoveryUnavailable) {
          useComposeStore.setState({ recoveryUnavailable: true });
        }
      });
    }
  },
  removeItem: (name: string) => window.sessionStorage.removeItem(name),
}));

export const useComposeStore = create<ComposeState>()(
  persist(
    (set) => ({
      composerSize: null,
      setComposerSize: (composerSize) => set({ composerSize }),
      sessions: [],
      recoveryUnavailable: false,
      startCompose: (mailboxId, options = { mode: "new" }) =>
        set((state) => {
          const existing = options.draftEmail?.id
            ? state.sessions.find(
                (session) => session.mailboxId === mailboxId && session.draftId === options.draftEmail?.id,
              )
            : undefined;
          const id = existing?.id ?? crypto.randomUUID();
          const sessions = state.sessions.map((session) => ({ ...session, minimized: session.id !== id }));
          if (!existing) {
            sessions.push({
              id,
              mailboxId,
              options,
              draftId: options.draftEmail?.id || crypto.randomUUID(),
              hasSavedDraft: Boolean(options.draftEmail?.id),
              fields: null,
              revision: 0,
              savedRevision: 0,
              minimized: false,
              expanded: false,
            });
          }
          return { sessions };
        }),
      updateSession: (id, changes) =>
        set((state) => ({
          sessions: state.sessions.map((session) => (session.id === id ? { ...session, ...changes } : session)),
        })),
      updateFields: (id, changes) =>
        set((state) => ({
          sessions: state.sessions.map((session) => {
            if (session.id !== id || !session.fields) return session;
            if (Object.entries(changes).every(([key, value]) => session.fields?.[key as keyof ComposeFields] === value))
              return session;
            return {
              ...session,
              fields: { ...session.fields, ...changes },
              revision: session.revision + (Object.keys(changes).some((key) => key !== "showCcBcc") ? 1 : 0),
            };
          }),
        })),
      restore: (id) =>
        set((state) => ({ sessions: state.sessions.map((session) => ({ ...session, minimized: session.id !== id })) })),
      remove: (id) => set((state) => ({ sessions: state.sessions.filter((session) => session.id !== id) })),
    }),
    {
      name: "agentic-inbox-compose",
      storage: recoveryStorage,
      partialize: ({ sessions, composerSize }) => ({ sessions, composerSize }),
      skipHydration: true,
      onRehydrateStorage: () => (_state, error) => {
        if (error) useComposeStore.setState({ recoveryUnavailable: true });
      },
    },
  ),
);
