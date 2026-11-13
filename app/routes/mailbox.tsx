// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { Sidebar as KumoSidebar } from "@cloudflare/kumo";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
  const {
    isSidebarOpen,
    openSidebar,
    closeSidebar,
    isAgentPanelOpen,
    setAgentPanelOpen,
    closePanel,
    closeComposeModal,
  } = useUIStore();
  const isMobile = useSyncExternalStore(subscribeToMobileSidebar, getIsMobileSidebar, getServerIsMobileSidebar);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

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
      open={isMobile ? isSidebarOpen : isDesktopSidebarOpen}
      onOpenChange={isMobile ? (open) => (open ? openSidebar() : closeSidebar()) : setIsDesktopSidebarOpen}
      collapsible="offcanvas"
      resizable
      defaultWidth={256}
      minWidth={200}
      maxWidth={320}
      className="h-screen overflow-hidden"
    >
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 bg-kumo-base">
        <Header />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>

      {/* Keep the right sidebar mounted when collapsed so chat and tab state survive. */}
      <KumoSidebar.Provider
        side="right"
        open={isAgentPanelOpen}
        onOpenChange={setAgentPanelOpen}
        collapsible="offcanvas"
        contained
        resizable
        defaultWidth={380}
        minWidth={320}
        maxWidth={560}
        className="hidden lg:flex h-full w-auto shrink-0"
      >
        <KumoSidebar id="agent-sidebar" aria-label="Agent and MCP">
          <AgentSidebar />
          <KumoSidebar.ResizeHandle aria-label="Resize agent sidebar" />
        </KumoSidebar>
      </KumoSidebar.Provider>

      <ComposeEmail />
    </KumoSidebar.Provider>
  );
}
