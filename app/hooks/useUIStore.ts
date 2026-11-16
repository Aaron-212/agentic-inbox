// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { create } from "zustand";
import type { Email } from "~/types";
import { useComposeStore } from "./useComposeStore";

export type ComposeMode = "new" | "reply" | "reply-all" | "forward";

export interface ComposeOptions {
  mode: ComposeMode;
  originalEmail?: Email | null;
  /** When editing a draft, this holds the draft email to pre-fill the composer */
  draftEmail?: Email | null;
}

interface UIState {
  // Side panel state
  selectedEmailId: string | null;
  selectEmail: (id: string | null) => void;
  startCompose: (mailboxId: string | undefined, options?: ComposeOptions) => void;
  closePanel: () => void;

  // Mobile sidebar
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;

  // Agent panel
  isAgentPanelOpen: boolean;
  setAgentPanelOpen: (open: boolean) => void;
  toggleAgentPanel: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  selectedEmailId: null,
  isSidebarOpen: false,
  isAgentPanelOpen: false,

  selectEmail: (id) => set({ selectedEmailId: id }),

  startCompose: (mailboxId, options) => {
    if (!mailboxId) return;
    useComposeStore.getState().startCompose(mailboxId, options);
    set({ isSidebarOpen: false });
  },

  closePanel: () => set({ selectedEmailId: null }),

  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  toggleSidebar: () => set({ isSidebarOpen: !get().isSidebarOpen }),

  setAgentPanelOpen: (open) => set({ isAgentPanelOpen: open }),
  toggleAgentPanel: () => set({ isAgentPanelOpen: !get().isAgentPanelOpen }),
}));
