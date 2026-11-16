// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { Loader } from "@cloudflare/kumo";
import { PlugsIcon, RobotIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import MCPPanel from "./MCPPanel";

function LazyAgentPanel() {
  const [AgentChat, setAgentChat] = useState<React.ComponentType | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    import("~/components/AgentPanel")
      .then((mod) => {
        setAgentChat(() => mod.default);
      })
      .catch((err) => {
        console.error("Failed to load AgentPanel:", err);
        setLoadError("Failed to load agent panel");
      });
  }, []);

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-kumo-danger text-xs">{loadError}</span>
      </div>
    );
  }
  if (!AgentChat) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <Loader size="base" />
        <span className="text-kumo-subtle text-xs">Loading agent...</span>
      </div>
    );
  }
  return <AgentChat />;
}

export default function AgentSidebar({
  assistantEnabled,
  mcpEnabled,
}: {
  assistantEnabled: boolean;
  mcpEnabled: boolean;
}) {
  const [selectedTab, setActiveTab] = useState<"agent" | "mcp">("agent");
  const activeTab = selectedTab === "agent" ? (assistantEnabled ? "agent" : "mcp") : mcpEnabled ? "mcp" : "agent";

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="border-kumo-line flex h-16 shrink-0 items-center border-b">
        {assistantEnabled && (
          <button
            type="button"
            onClick={() => setActiveTab("agent")}
            className={`flex h-full cursor-pointer items-center gap-1.5 border-b-2 bg-transparent px-8 text-base font-medium transition-colors ${
              activeTab === "agent"
                ? "border-kumo-brand text-kumo-default"
                : "text-kumo-subtle hover:text-kumo-default border-transparent"
            }`}
          >
            <RobotIcon size={16} weight={activeTab === "agent" ? "fill" : "regular"} />
            Agent
          </button>
        )}
        {mcpEnabled && (
          <button
            type="button"
            onClick={() => setActiveTab("mcp")}
            className={`flex h-full cursor-pointer items-center gap-1.5 border-b-2 bg-transparent px-8 text-base font-medium transition-colors ${
              activeTab === "mcp"
                ? "border-kumo-brand text-kumo-default"
                : "text-kumo-subtle hover:text-kumo-default border-transparent"
            }`}
          >
            <PlugsIcon size={16} weight={activeTab === "mcp" ? "fill" : "regular"} />
            MCP
          </button>
        )}
      </div>

      {/* Tab content — keep agent mounted so chat isn't lost */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {assistantEnabled && (
          <div className={activeTab === "agent" ? "h-full" : "hidden"}>
            <LazyAgentPanel />
          </div>
        )}
        {mcpEnabled && activeTab === "mcp" && <MCPPanel />}
      </div>
    </div>
  );
}
