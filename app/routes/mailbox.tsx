// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { Sidebar as KumoSidebar } from "@cloudflare/kumo";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Outlet, useParams } from "react-router";
import AgentSidebar from "~/components/AgentSidebar";
import ComposeEmail from "~/components/ComposeEmail";
import Header from "~/components/Header";
import Sidebar from "~/components/Sidebar";
import { useMailbox } from "~/queries/mailboxes";
import { useUIStore } from "~/hooks/useUIStore";

const mobileSidebarQuery = "(max-width: 767px)";

function subscribeToMobileSidebar(callback: () => void) {
  const query = window.matchMedia(mobileSidebarQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getIsMobileSidebar() {
  return window.matchMedia(mobileSidebarQuery).matches;
}

function getServerIsMobileSidebar() {
  return false;
}

export default function MailboxRoute() {
  const { mailboxId } = useParams<{ mailboxId: string }>();
  // Prefetch mailbox data for child components
  useMailbox(mailboxId);
  const prevMailboxIdRef = useRef<string | undefined>(undefined);
  const { isSidebarOpen, openSidebar, closeSidebar, isAgentPanelOpen, closePanel, closeComposeModal } = useUIStore();
  const isMobile = useSyncExternalStore(subscribeToMobileSidebar, getIsMobileSidebar, getServerIsMobileSidebar);

  useEffect(() => {
    if (prevMailboxIdRef.current && mailboxId && prevMailboxIdRef.current !== mailboxId) {
      closePanel();
      closeComposeModal();
      closeSidebar();
    }

    prevMailboxIdRef.current = mailboxId;
  }, [mailboxId, closeComposeModal, closePanel, closeSidebar]);

  return (
    <KumoSidebar.Provider
      open={isMobile ? isSidebarOpen : true}
      onOpenChange={isMobile ? (open) => (open ? openSidebar() : closeSidebar()) : undefined}
      collapsible="offcanvas"
      resizable
      defaultWidth={256}
      minWidth={200}
      maxWidth={320}
      className="h-screen overflow-hidden"
      style={{ "--sidebar-bg": "var(--color-kumo-recessed)" } as React.CSSProperties}
    >
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 bg-kumo-base">
        <Header />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>

      {/* Agent + MCP sidebar -- togglable on desktop */}
      {isAgentPanelOpen && (
        <div className="hidden lg:flex w-[380px] shrink-0 border-l border-kumo-line flex-col bg-kumo-base overflow-hidden">
          <AgentSidebar />
        </div>
      )}

      <ComposeEmail />
    </KumoSidebar.Provider>
  );
}
