// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { Button, Tooltip } from "@cloudflare/kumo";
import { CheckIcon, CopyIcon, PlugsIcon, WrenchIcon } from "@phosphor-icons/react";
import { useState } from "react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable or permission denied — ignore silently
    }
  };

  return (
    <Tooltip
      content={copied ? "Copied!" : "Copy"}
      render={
        <Button
          variant="ghost"
          shape="square"
          size="sm"
          icon={copied ? <CheckIcon size={12} weight="bold" className="text-kumo-success" /> : <CopyIcon size={12} />}
          onClick={handleCopy}
          aria-label="Copy to clipboard"
        />
      }
    />
  );
}

const TOOLS = [
  { name: "list_mailboxes", desc: "List all mailboxes" },
  { name: "list_emails", desc: "List emails in a folder" },
  { name: "get_email", desc: "Read a full email with body" },
  { name: "get_thread", desc: "Load a conversation thread" },
  { name: "search_emails", desc: "Search emails by query" },
  { name: "draft_reply", desc: "Draft a reply to an email" },
  { name: "send_reply", desc: "Send a reply" },
  { name: "send_email", desc: "Send a new email" },
  { name: "mark_email_read", desc: "Mark email as read/unread" },
  { name: "move_email", desc: "Move email to a folder" },
];

export default function MCPPanel() {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://your-app.workers.dev";
  const mcpUrl = `${baseUrl}/mcp`;

  return (
    <div className="flex h-full flex-col">
      {/* Content */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {/* Intro */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="bg-kumo-brand/10 flex h-10 w-10 items-center justify-center rounded-xl">
              <PlugsIcon size={20} weight="duotone" className="text-kumo-brand" />
            </div>
            <div>
              <h3 className="text-kumo-default text-sm font-semibold">Connect via MCP</h3>
              <p className="text-kumo-subtle text-xs">Model Context Protocol</p>
            </div>
          </div>
          <p className="text-kumo-subtle text-xs leading-relaxed">
            This email agent exposes an MCP server so AI coding assistants can manage your inbox directly — read emails,
            search, draft replies, and send messages using natural language.
          </p>
        </div>

        {/* MCP URL */}
        <div className="space-y-1.5">
          <label className="text-kumo-subtle block text-xs font-medium">Server URL</label>
          <div className="group relative">
            <div className="absolute top-1/2 right-1.5 -translate-y-1/2">
              <CopyButton text={mcpUrl} />
            </div>
            <div className="bg-kumo-recessed text-kumo-default border-kumo-line rounded-lg border px-3 py-2.5 pr-10 font-mono text-[11px] leading-relaxed break-all">
              {mcpUrl}
            </div>
          </div>
        </div>

        {/* Available tools */}
        <div className="space-y-2">
          <h4 className="text-kumo-subtle px-0.5 text-xs font-semibold tracking-wider uppercase">Available Tools</h4>
          <div className="border-kumo-line divide-kumo-line divide-y rounded-lg border">
            {TOOLS.map((tool) => (
              <div key={tool.name} className="flex items-center gap-2.5 px-3 py-2">
                <WrenchIcon size={12} weight="bold" className="text-kumo-brand shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-kumo-default font-mono text-xs font-medium">{tool.name}</span>
                </div>
                <span className="text-kumo-subtle shrink-0 text-[11px]">{tool.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
