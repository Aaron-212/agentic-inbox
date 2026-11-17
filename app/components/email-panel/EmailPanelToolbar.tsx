// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { m } from "shared/paraglide/messages.js";

import { getEmailDeleteLabel, getFolderDisplayName } from "shared/folders";
import { Button, Tooltip } from "@cloudflare/kumo";
import { useEffect, useRef, useState } from "react";
import {
  ArrowBendUpLeftIcon,
  ArrowBendUpRightIcon,
  ArrowLeftIcon,
  ChatCircleIcon,
  CodeIcon,
  EnvelopeOpenIcon,
  EnvelopeSimpleIcon,
  FolderSimpleIcon,
  PaperPlaneTiltIcon,
  PencilSimpleIcon,
  StarIcon,
  SparkleIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { Folder, Email } from "~/types";

interface EmailPanelToolbarProps {
  email: Email;
  mailboxId?: string;
  isDraftFolder: boolean;
  isSending: boolean;
  moveToFolders: Folder[];
  lastReceivedMessage?: Email;
  onBack: () => void;
  onSendDraft: () => void;
  onEditDraft: () => void;
  onReply: () => void;
  aiRepliesEnabled: boolean;
  onDraftAIReply: () => void;
  isGeneratingAIReply: boolean;
  onReplyAll: () => void;
  onForward: () => void;
  onToggleStar: () => void;
  onToggleRead: () => void;
  onMove: (folderId: string) => void;
  onViewSource: () => void;
  onDelete: () => void;
}

export default function EmailPanelToolbar({
  email,
  isDraftFolder,
  isSending,
  moveToFolders,
  onBack,
  onSendDraft,
  onEditDraft,
  onReply,
  aiRepliesEnabled,
  onDraftAIReply,
  isGeneratingAIReply,
  onReplyAll,
  onForward,
  onToggleStar,
  onToggleRead,
  onMove,
  onViewSource,
  onDelete,
}: EmailPanelToolbarProps) {
  return (
    <div className="border-kumo-line flex h-12 shrink-0 flex-wrap items-center gap-1 border-b px-3 md:px-4">
      <Button
        variant="ghost"
        shape="square"
        size="sm"
        icon={<ArrowLeftIcon size={18} />}
        onClick={onBack}
        aria-label={m.back_list()}
        className="shrink-0 md:hidden"
      />
      <div
        role="separator"
        aria-orientation="vertical"
        className="border-kumo-line mx-0.5 h-5 shrink-0 border-l md:hidden"
      />

      {isDraftFolder ? (
        <>
          <Button
            variant="primary"
            size="sm"
            icon={<PaperPlaneTiltIcon size={16} />}
            onClick={onSendDraft}
            loading={isSending}
          >
            {isSending ? m.sending() : m.send()}
          </Button>
          <Button variant="secondary" size="sm" icon={<PencilSimpleIcon size={16} />} onClick={onEditDraft}>
            {m.edit()}
          </Button>
        </>
      ) : (
        <>
          <Tooltip
            content={m.reply()}
            side="bottom"
            render={
              <Button
                variant="ghost"
                shape="square"
                size="sm"
                icon={<ArrowBendUpLeftIcon size={18} />}
                onClick={onReply}
                aria-label={m.reply()}
              />
            }
          />
          {aiRepliesEnabled && (
            <Tooltip
              content={m.reply_ai()}
              side="bottom"
              render={
                <Button
                  type="button"
                  variant="ghost"
                  shape="square"
                  size="sm"
                  icon={<SparkleIcon size={18} aria-hidden="true" />}
                  onClick={() => {
                    if (!isGeneratingAIReply) onDraftAIReply();
                  }}
                  loading={isGeneratingAIReply}
                  aria-label={m.reply_ai()}
                  aria-disabled={isGeneratingAIReply}
                  aria-busy={isGeneratingAIReply}
                />
              }
            />
          )}
          <Tooltip
            content={m.reply_all()}
            side="bottom"
            render={
              <Button
                variant="ghost"
                shape="square"
                size="sm"
                icon={<ChatCircleIcon size={18} />}
                onClick={onReplyAll}
                aria-label={m.reply_all()}
              />
            }
          />
          <Tooltip
            content={m.forward()}
            side="bottom"
            render={
              <Button
                variant="ghost"
                shape="square"
                size="sm"
                icon={<ArrowBendUpRightIcon size={18} />}
                onClick={onForward}
                aria-label={m.forward()}
              />
            }
          />
        </>
      )}

      <div className="bg-kumo-fill mx-0.5 h-5 w-px" />

      <Tooltip
        content={email.starred ? m.unstar() : m.star()}
        side="bottom"
        render={
          <Button
            variant="ghost"
            shape="square"
            size="sm"
            icon={
              <StarIcon
                size={18}
                weight={email.starred ? "fill" : "regular"}
                className={email.starred ? "text-kumo-warning" : ""}
              />
            }
            onClick={onToggleStar}
            aria-label={email.starred ? m.unstar() : m.star()}
          />
        }
      />

      <Tooltip
        content={email.read ? m.mark_as_unread() : m.mark_as_read()}
        side="bottom"
        render={
          <Button
            variant="ghost"
            shape="square"
            size="sm"
            icon={email.read ? <EnvelopeSimpleIcon size={18} /> : <EnvelopeOpenIcon size={18} />}
            onClick={onToggleRead}
            aria-label={email.read ? m.mark_as_unread() : m.mark_as_read()}
          />
        }
      />

      <MoveToFolderMenu folders={moveToFolders} onMove={onMove} />

      <div className="ml-auto flex items-center gap-0.5">
        <Tooltip
          content={m.view_source()}
          side="bottom"
          render={
            <Button
              variant="ghost"
              shape="square"
              size="sm"
              icon={<CodeIcon size={18} />}
              onClick={onViewSource}
              aria-label={m.view_source()}
            />
          }
        />
        <Tooltip
          content={getEmailDeleteLabel(email.folder_id)}
          side="bottom"
          render={
            <Button
              variant="ghost"
              shape="square"
              size="sm"
              icon={<TrashIcon size={18} />}
              onClick={onDelete}
              aria-label={getEmailDeleteLabel(email.folder_id)}
            />
          }
        />
        <Tooltip
          content={m.close()}
          side="bottom"
          render={
            <Button
              variant="ghost"
              shape="square"
              size="sm"
              icon={<XIcon size={18} />}
              onClick={onBack}
              aria-label={m.close()}
              className="hidden md:inline-flex"
            />
          }
        />
      </div>
    </div>
  );
}

function MoveToFolderMenu({ folders, onMove }: { folders: Folder[]; onMove: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Tooltip
        content={m.move_folder()}
        side="bottom"
        render={
          <Button
            variant="ghost"
            shape="square"
            size="sm"
            icon={<FolderSimpleIcon size={18} />}
            onClick={() => setOpen((o) => !o)}
            aria-label={m.move_folder()}
          />
        }
      />
      {open && (
        <div className="border-kumo-line bg-kumo-elevated absolute top-full left-0 z-50 mt-1 min-w-[160px] rounded-lg border py-1 shadow-lg">
          <div className="text-kumo-subtle px-3 py-1.5 text-xs font-medium">{m.move_to()}</div>
          <div className="bg-kumo-line my-1 h-px" />
          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              className="text-kumo-default hover:bg-kumo-overlay w-full px-3 py-1.5 text-left text-sm transition-colors"
              onClick={() => {
                onMove(f.id);
                setOpen(false);
              }}
            >
              {getFolderDisplayName(f.id, f.name)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
