// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { m } from "shared/paraglide/messages.js";

import { Badge, Button, Loader, Tooltip } from "@cloudflare/kumo";
import {
  ArrowUpIcon,
  RobotIcon,
  TrashIcon,
  UserIcon,
  EnvelopeSimpleIcon,
  MagnifyingGlassIcon,
  PaperPlaneTiltIcon,
  EyeIcon,
  ArrowBendUpLeftIcon,
  WrenchIcon,
  CheckCircleIcon,
  StopIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useConfirmation } from "~/hooks/useConfirmation";
import { useUIStore } from "~/hooks/useUIStore";
import type { UIMessage } from "ai";

const getToolLabels = (): Record<string, { label: string; icon: React.ReactNode }> => ({
  list_emails: {
    label: m.fetching_emails(),
    icon: <EnvelopeSimpleIcon size={14} weight="bold" />,
  },
  get_email: {
    label: m.reading_email(),
    icon: <EyeIcon size={14} weight="bold" />,
  },
  get_thread: {
    label: m.loading_thread(),
    icon: <ArrowBendUpLeftIcon size={14} weight="bold" />,
  },
  search_emails: {
    label: m.searching(),
    icon: <MagnifyingGlassIcon size={14} weight="bold" />,
  },
  draft_email: {
    label: m.drafting_email(),
    icon: <PaperPlaneTiltIcon size={14} weight="bold" />,
  },
  draft_reply: {
    label: m.drafting_reply(),
    icon: <PaperPlaneTiltIcon size={14} weight="bold" />,
  },
  discard_draft: {
    label: m.discarding_draft(),
    icon: <TrashIcon size={14} weight="bold" />,
  },
  mark_email_read: {
    label: m.updating_status(),
    icon: <CheckCircleIcon size={14} weight="bold" />,
  },
  move_email: {
    label: m.moving_email(),
    icon: <EnvelopeSimpleIcon size={14} weight="bold" />,
  },
});

function ToolCallBadge({ toolName, state }: { toolName: string; state: string }) {
  const info = getToolLabels()[toolName] || {
    label: toolName,
    icon: <WrenchIcon size={14} weight="bold" />,
  };
  const isDone = state === "output-available" || state === "result" || state === "output-error";

  return (
    <div className="bg-kumo-fill/50 flex items-center gap-1.5 rounded px-2 py-1 text-xs">
      <span className="text-kumo-brand">{info.icon}</span>
      <span className="text-kumo-subtle">{info.label}</span>
      {isDone ? (
        <CheckCircleIcon size={12} weight="fill" className="text-kumo-success ml-auto" />
      ) : (
        <Loader size="sm" className="ml-auto" />
      )}
    </div>
  );
}

function getToolNameFromPart(part: UIMessage["parts"][number]): string | null {
  if (part.type === "dynamic-tool") return (part as any).toolName ?? null;
  if (part.type.startsWith("tool-")) return part.type.replace("tool-", "");
  return null;
}

function hasDraftReplyTool(message: UIMessage): boolean {
  return message.parts.some((part) => {
    const toolName = getToolNameFromPart(part);
    return toolName === "draft_reply";
  });
}

function DraftActions({ onEdit, disabled }: { onEdit: () => void; disabled: boolean }) {
  return (
    <div className="mt-1 flex gap-1.5">
      <Button variant="primary" size="sm" icon={<PencilSimpleIcon size={14} />} onClick={onEdit} disabled={disabled}>
        {m.edit_send_composer()}
      </Button>
    </div>
  );
}

function MessageBubble({
  message,
  onAction,
  isStreaming,
}: {
  message: UIMessage;
  onAction?: (action: string) => void;
  isStreaming: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-kumo-brand text-kumo-inverse" : "bg-kumo-fill text-kumo-default"
        }`}
      >
        {isUser ? <UserIcon size={12} weight="bold" /> : <RobotIcon size={12} weight="bold" />}
      </div>
      <div className={`flex max-w-[85%] min-w-0 flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        {message.parts.map((part, i) => {
          const key = `${message.id}-part-${i}`;
          if (part.type === "text" && part.text.trim()) {
            return (
              <div
                key={key}
                className={`overflow-wrap-anywhere rounded-lg px-3 py-2 text-sm/relaxed wrap-break-word ${
                  isUser
                    ? "bg-kumo-brand text-kumo-inverse rounded-tr-sm"
                    : "bg-kumo-elevated text-kumo-default border-kumo-line overflow-hidden rounded-tl-sm border"
                }`}
              >
                {isUser ? (
                  part.text
                ) : (
                  <Markdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "var(--color-link)",
                            textDecoration: "underline",
                          }}
                        >
                          {children}
                        </a>
                      ),
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      ul: ({ children }) => <ul className="mb-2 list-disc space-y-0.5 pl-4 last:mb-0">{children}</ul>,
                      ol: ({ children }) => (
                        <ol className="mb-2 list-decimal space-y-0.5 pl-4 last:mb-0">{children}</ol>
                      ),
                      li: ({ children }) => <li>{children}</li>,
                      h1: ({ children }) => <h3 className="mb-1 text-sm font-semibold">{children}</h3>,
                      h2: ({ children }) => <h4 className="mb-1 text-[13px] font-semibold">{children}</h4>,
                      h3: ({ children }) => <h5 className="mb-0.5 text-[13px] font-semibold">{children}</h5>,
                      code: ({ children }) => (
                        <code className="bg-kumo-fill rounded px-1 py-0.5 text-[12px]">{children}</code>
                      ),
                      table: ({ children }) => (
                        <div className="my-2 overflow-x-auto">
                          <table className="w-full border-collapse text-xs">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="border-kumo-line bg-kumo-fill/30 border-b">{children}</thead>
                      ),
                      th: ({ children }) => (
                        <th className="text-kumo-strong px-2 py-1 text-left font-semibold">{children}</th>
                      ),
                      td: ({ children }) => <td className="border-kumo-line/50 border-b px-2 py-1">{children}</td>,
                    }}
                  >
                    {part.text}
                  </Markdown>
                )}
              </div>
            );
          }
          const toolName = getToolNameFromPart(part);
          if (toolName) {
            return <ToolCallBadge key={key} toolName={toolName} state={(part as any).state ?? "running"} />;
          }
          return null;
        })}
        {/* Show action buttons for draft replies */}
        {!isUser && hasDraftReplyTool(message) && onAction && (
          <DraftActions onEdit={() => onAction("edit")} disabled={isStreaming} />
        )}
      </div>
    </div>
  );
}

function AgentChatConnected({
  mailboxId,
  useAgent,
  useAgentChat,
}: {
  mailboxId: string;
  useAgent: typeof import("agents/react").useAgent;
  useAgentChat: typeof import("@cloudflare/ai-chat/react").useAgentChat;
}) {
  const { confirm, confirmationDialog } = useConfirmation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState("");
  const { startCompose } = useUIStore();

  const agent = useAgent({ agent: "EmailAgent", name: mailboxId });
  const { messages, sendMessage, status, setMessages, stop } = useAgentChat({ agent });
  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;
    setInputValue("");
    sendMessage({ text });
    if (inputRef.current) inputRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
      handleSend();
    }
  };

  const suggestedPrompts = [m.suggest_latest(), m.suggest_unread(), m.suggest_reply()];

  return (
    <div className="flex h-full flex-col">
      {confirmationDialog}
      {/* Header */}
      <div className="border-kumo-line flex shrink-0 items-center justify-between border-b px-3 py-1.5">
        <div className="flex items-center gap-2">
          <Badge variant="beta">AI</Badge>
          <span className="text-kumo-subtle text-xs">{m.email_agent()}</span>
        </div>
        <div className="flex items-center gap-1">
          {isStreaming && <Loader size="sm" />}
          {messages.length > 0 && (
            <Tooltip
              content={m.clear_chat()}
              render={
                <Button
                  variant="ghost"
                  shape="square"
                  size="sm"
                  icon={<TrashIcon size={14} />}
                  onClick={async () => {
                    if (
                      await confirm({
                        title: m.clear_chat_title(),
                        description: m.clear_chat_confirm(),
                        confirmLabel: m.clear_chat(),
                      })
                    ) {
                      setMessages([]);
                    }
                  }}
                  aria-label={m.clear_chat()}
                />
              }
            />
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div className="bg-kumo-brand/10 flex size-12 items-center justify-center rounded-xl">
              <RobotIcon size={24} weight="duotone" className="text-kumo-brand" />
            </div>
            <p className="text-kumo-subtle px-4 text-center text-xs/relaxed">{m.agent_intro()}</p>
            <div className="flex w-full flex-col gap-1.5">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage({ text: prompt })}
                  className="border-kumo-line text-kumo-subtle hover:bg-kumo-tint hover:border-kumo-fill-hover cursor-pointer rounded-lg border bg-transparent px-3 py-2 text-left text-xs transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isStreaming={isStreaming}
                onAction={(action) => {
                  if (action === "edit") {
                    // Extract draft data from the draft_reply tool result
                    let draftData: {
                      to?: string;
                      subject?: string;
                      body?: string;
                      id?: string;
                    } | null = null;
                    for (const part of msg.parts) {
                      if ((part as any).toolName === "draft_reply" && (part as any).result) {
                        draftData = (part as any).result;
                        break;
                      }
                    }
                    if (draftData) {
                      const draftEmail = {
                        id: draftData.id || "",
                        subject: draftData.subject || "",
                        sender: mailboxId,
                        recipient: draftData.to || "",
                        date: new Date().toISOString(),
                        read: true,
                        starred: false,
                        body: draftData.body || "",
                      };
                      startCompose(mailboxId, {
                        mode: "reply",
                        originalEmail: null,
                        draftEmail,
                      });
                    } else {
                      sendMessage({
                        text: m.edit_draft_prompt(),
                      });
                    }
                  }
                }}
              />
            ))}
            {isStreaming && (
              <div className="flex gap-2">
                <div className="bg-kumo-fill text-kumo-default flex size-6 shrink-0 items-center justify-center rounded-full">
                  <RobotIcon size={12} weight="bold" />
                </div>
                <div className="bg-kumo-elevated border-kumo-line flex items-center gap-1.5 rounded-lg rounded-tl-sm border px-3 py-2">
                  <Loader size="sm" />
                  <span className="text-kumo-subtle text-xs">{m.thinking()}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-kumo-line shrink-0 border-t px-3 py-2">
        {isStreaming ? (
          <div className="flex justify-center">
            <Button variant="secondary" size="sm" icon={<StopIcon size={14} weight="fill" />} onClick={() => stop()}>
              {m.stop_generating()}
            </Button>
          </div>
        ) : (
          <div className="flex items-end gap-1.5">
            <textarea
              ref={inputRef}
              id="agent-chat-input"
              name="agent-chat-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={m.ask_agent()}
              rows={1}
              aria-label={m.chat_input()}
              className="border-kumo-line bg-kumo-control text-kumo-default placeholder:text-kumo-subtle focus:ring-kumo-focus max-h-25 min-h-9 flex-1 resize-none rounded-lg border px-3 py-2 text-xs focus:ring-1 focus:outline-none"
              style={{ height: "auto", overflow: "hidden" }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = `${Math.min(t.scrollHeight, 100)}px`;
                t.style.overflow = t.scrollHeight > 100 ? "auto" : "hidden";
              }}
            />
            <Button
              variant="primary"
              shape="square"
              size="sm"
              disabled={!inputValue.trim()}
              icon={<ArrowUpIcon size={14} weight="bold" />}
              onClick={handleSend}
              aria-label={m.send_message()}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentPanel() {
  const { mailboxId } = useParams<{ mailboxId: string }>();
  const [hooks, setHooks] = useState<{
    useAgent: typeof import("agents/react").useAgent;
    useAgentChat: typeof import("@cloudflare/ai-chat/react").useAgentChat;
  } | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([import("agents/react"), import("@cloudflare/ai-chat/react")])
      .then(([a, c]) =>
        setHooks({
          useAgent: a.useAgent,
          useAgentChat: c.useAgentChat,
        }),
      )
      .catch((err) => {
        console.error("Failed to load agent modules:", err);
        setLoadError(m.agent_connect_failed());
      });
  }, []);

  if (loadError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <span className="text-kumo-danger text-xs">{loadError}</span>
      </div>
    );
  }

  if (!hooks) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <Loader size="base" />
        <span className="text-kumo-subtle text-xs">{m.connecting()}</span>
      </div>
    );
  }

  return (
    <AgentChatConnected
      mailboxId={mailboxId ?? "default"}
      useAgent={hooks.useAgent}
      useAgentChat={hooks.useAgentChat}
    />
  );
}
