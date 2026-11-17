// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { m } from "shared/paraglide/messages.js";

import { Button, Input, Sidebar as KumoSidebar, Tooltip, useSidebar } from "@cloudflare/kumo";
import { GearSixIcon, ListIcon, MagnifyingGlassIcon, PlugsIcon, RobotIcon, XIcon } from "@phosphor-icons/react";
import { type KeyboardEvent, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { getAIFeatures } from "shared/ai-features";
import LanguageSelect from "~/components/LanguageSelect";
import { useMailbox } from "~/queries/mailboxes";
import { useUIStore } from "~/hooks/useUIStore";

export default function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const { mailboxId } = useParams<{ mailboxId: string }>();
  const { data: mailbox } = useMailbox(mailboxId);
  const aiFeatures = getAIFeatures(mailbox?.settings);
  const showAgentSidebar = !!mailbox && (aiFeatures.assistant || aiFeatures.mcp);
  const panelName = aiFeatures.assistant ? m.agent_panel() : m.mcp_panel();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isSidebarOpen, toggleSidebar, toggleAgentPanel, isAgentPanelOpen } = useUIStore();
  const { open: isDesktopSidebarOpen } = useSidebar();

  // Sync search input with URL query param so it stays populated
  const urlQuery = searchParams.get("q") || "";
  const [previousSearch, setPreviousSearch] = useState<{ pathname: string; query: string } | null>(null);
  if (previousSearch?.pathname !== location.pathname || previousSearch?.query !== urlQuery) {
    setPreviousSearch({ pathname: location.pathname, query: urlQuery });
    if (location.pathname.includes("/search") && urlQuery) {
      setSearchQuery(urlQuery);
    }
  }

  const performSearch = () => {
    if (mailboxId && searchQuery.trim()) {
      const q = searchQuery.trim();
      navigate(`/mailbox/${mailboxId}/search?q=${encodeURIComponent(q)}`);
      setIsSearchExpanded(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    if (location.pathname.includes("/search") && mailboxId) {
      navigate(`/mailbox/${mailboxId}/emails/inbox`);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
      performSearch();
    }
    if (e.key === "Escape") {
      if (searchQuery) {
        clearSearch();
      } else {
        setIsSearchExpanded(false);
      }
    }
  };

  const isSettingsActive = location.pathname.includes("/settings");

  return (
    <header className="bg-kumo-base border-kumo-line sticky top-0 z-10 flex h-16 items-center gap-2 border-b px-4 md:gap-4 md:px-5">
      {/* Hamburger menu - mobile only */}
      <Button
        variant="ghost"
        shape="square"
        size="sm"
        icon={<ListIcon size={20} />}
        onClick={toggleSidebar}
        aria-label={m.toggle_sidebar()}
        aria-expanded={isSidebarOpen}
        aria-controls="folder-sidebar"
        className="shrink-0 md:hidden"
      />

      <Tooltip
        content={isDesktopSidebarOpen ? m.collapse_sidebar() : m.expand_sidebar()}
        render={
          <KumoSidebar.Trigger
            aria-label={isDesktopSidebarOpen ? m.collapse_sidebar() : m.expand_sidebar()}
            aria-expanded={isDesktopSidebarOpen}
            aria-controls="folder-sidebar"
            className="hidden shrink-0 md:inline-flex"
          />
        }
      />

      {/* Search - full on desktop, collapsible on mobile */}
      <div
        className={`flex max-w-lg flex-1 items-center gap-1 transition-all ${
          isSearchExpanded ? "flex" : "hidden md:flex"
        }`}
      >
        <div className="relative flex flex-1 items-center">
          <Input
            className="w-full"
            aria-label={m.search_emails()}
            placeholder={m.search_placeholder()}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="text-kumo-subtle hover:text-kumo-default hover:bg-kumo-tint absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 transition-colors"
              aria-label={m.clear_search()}
            >
              <XIcon size={14} />
            </button>
          )}
        </div>
        <Tooltip
          content={m.search()}
          side="bottom"
          render={
            <Button
              variant="ghost"
              shape="square"
              icon={<MagnifyingGlassIcon size={20} />}
              onClick={performSearch}
              aria-label={m.search()}
            />
          }
        />
      </div>

      {/* Search toggle button - mobile only, hidden when search is expanded */}
      {!isSearchExpanded && (
        <Button
          variant="ghost"
          shape="square"
          size="sm"
          icon={<MagnifyingGlassIcon size={20} />}
          onClick={() => setIsSearchExpanded(true)}
          aria-label={m.search()}
          className="shrink-0 md:hidden"
        />
      )}

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <LanguageSelect />
        {showAgentSidebar && (
          <Tooltip
            content={isAgentPanelOpen ? m.hide_panel({ panel: panelName }) : m.show_panel({ panel: panelName })}
            side="bottom"
            render={
              <Button
                variant={isAgentPanelOpen ? "secondary" : "ghost"}
                shape="square"
                icon={aiFeatures.assistant ? <RobotIcon size={20} /> : <PlugsIcon size={20} />}
                onClick={toggleAgentPanel}
                aria-label={m.toggle_panel({ panel: panelName })}
                aria-expanded={isAgentPanelOpen}
                aria-controls="agent-sidebar"
                className="hidden lg:inline-flex"
              />
            }
          />
        )}
        <Tooltip
          content={m.settings()}
          side="bottom"
          render={
            <Button
              variant={isSettingsActive ? "secondary" : "ghost"}
              shape="square"
              icon={<GearSixIcon size={20} />}
              onClick={() =>
                navigate(isSettingsActive ? `/mailbox/${mailboxId}/emails/inbox` : `/mailbox/${mailboxId}/settings`)
              }
              aria-label={m.settings()}
            />
          }
        />
      </div>
    </header>
  );
}
