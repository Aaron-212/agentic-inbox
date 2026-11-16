// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { Sidebar as KumoSidebar } from "@cloudflare/kumo";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Outlet, useParams, useSearchParams } from "react-router";
import AgentSidebar from "~/components/AgentSidebar";
import FloatingComposer from "~/components/FloatingComposer";
import Header from "~/components/Header";
import Sidebar from "~/components/Sidebar";
import { getAIFeatures } from "shared/ai-features";
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
  const [searchParams] = useSearchParams();
  const requestedEmailId = searchParams.get("email");
  // Prefetch mailbox data for child components
  const { data: mailbox } = useMailbox(mailboxId);
  const aiFeatures = getAIFeatures(mailbox?.settings);
  const showAgentSidebar = !!mailbox && (aiFeatures.assistant || aiFeatures.mcp);
  const prevMailboxIdRef = useRef<string | undefined>(undefined);
  const { isSidebarOpen, openSidebar, closeSidebar, isAgentPanelOpen, setAgentPanelOpen, selectEmail } = useUIStore();
  const isMobile = useSyncExternalStore(subscribeToMobileSidebar, getIsMobileSidebar, getServerIsMobileSidebar);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  useEffect(() => {
    if (prevMailboxIdRef.current && mailboxId && prevMailboxIdRef.current !== mailboxId) {
      selectEmail(requestedEmailId);
      closeSidebar();
    }

    prevMailboxIdRef.current = mailboxId;
  }, [mailboxId, requestedEmailId, selectEmail, closeSidebar]);

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
      <div className="bg-kumo-base flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="@container relative min-h-0 flex-1 overflow-hidden">
          <Outlet />
          <FloatingComposer />
        </main>
      </div>

      {/* Keep chat mounted when collapsed, but disconnect it when AI is disabled. */}
      {showAgentSidebar && (
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
          className="hidden h-full w-auto shrink-0 lg:flex"
        >
          <KumoSidebar id="agent-sidebar" aria-label={aiFeatures.assistant ? "Agent" : "MCP"}>
            <AgentSidebar assistantEnabled={aiFeatures.assistant} mcpEnabled={aiFeatures.mcp} />
            <KumoSidebar.ResizeHandle aria-label="Resize agent sidebar" />
          </KumoSidebar>
        </KumoSidebar.Provider>
      )}
    </KumoSidebar.Provider>
  );
}
