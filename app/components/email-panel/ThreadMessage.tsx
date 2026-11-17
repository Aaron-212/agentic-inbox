// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { Badge, Button, Tooltip } from "@cloudflare/kumo";
import {
  CaretDownIcon,
  CaretUpIcon,
  CodeIcon,
  PaperPlaneTiltIcon,
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import EmailAttachmentList from "~/components/EmailAttachmentList";
import EmailIframe from "~/components/EmailIframe";
import { formatDetailDate, formatShortDate, rewriteInlineImages, stripHtml } from "~/lib/utils";
import type { Email } from "~/types";
import DeliveryStatus from "./DeliveryStatus";

interface ThreadMessageProps {
  email: Email;
  mailboxId?: string;
  mailboxEmail?: string;
  isLast: boolean;
  isDraft?: boolean;
  isSending?: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSendDraft?: () => void;
  onEditDraft?: () => void;
  onDeleteDraft?: () => void;
  onViewSource?: () => void;
  onPreviewImage?: (url: string, filename: string) => void;
}

function Avatar({ isDraft, isSelf, sender }: { isDraft?: boolean; isSelf: boolean; sender: string }) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        isDraft
          ? "bg-kumo-fill text-kumo-subtle"
          : isSelf
            ? "bg-kumo-brand text-kumo-inverse"
            : "bg-kumo-fill text-kumo-default"
      }`}
    >
      {isDraft ? "D" : sender.charAt(0).toUpperCase()}
    </div>
  );
}

export default function ThreadMessage({
  email,
  mailboxId,
  mailboxEmail,
  isLast,
  isDraft,
  isSending,
  isExpanded,
  onToggleExpand,
  onSendDraft,
  onEditDraft,
  onDeleteDraft,
  onViewSource,
  onPreviewImage,
}: ThreadMessageProps) {
  const isSelf = email.sender === mailboxEmail;
  const containerClassName = `${!isLast ? "border-b border-kumo-line" : ""} ${isDraft ? "border-l-2 border-l-kumo-warning bg-kumo-warning/[0.02]" : ""}`;
  const senderLabel = isDraft ? "Draft reply" : isSelf ? "You" : email.sender;

  if (!isExpanded) {
    return (
      <div className={containerClassName}>
        <button
          type="button"
          onClick={onToggleExpand}
          className="hover:bg-kumo-tint flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left"
        >
          <Avatar isDraft={isDraft} isSelf={isSelf} sender={email.sender} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-kumo-default truncate text-sm font-medium">{senderLabel}</span>
              <span className="text-kumo-subtle shrink-0 text-xs">{formatDetailDate(email.date)}</span>
            </div>
            <p className="text-kumo-subtle truncate text-xs">{stripHtml(email.body || "").slice(0, 80)}</p>
          </div>
          <CaretDownIcon size={14} className="text-kumo-subtle shrink-0" />
        </button>
        {email.send_status && (
          <div className="px-4 pb-3">
            <DeliveryStatus email={email} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`group/thread-msg ${containerClassName}`}>
      <div className="px-4 py-4 md:px-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <button type="button" onClick={onToggleExpand} className="shrink-0" aria-label="Collapse message">
              <div className="hover:ring-kumo-brand/30 cursor-pointer rounded-full transition-shadow hover:ring-2">
                <Avatar isDraft={isDraft} isSelf={isSelf} sender={email.sender} />
              </div>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-kumo-default truncate text-sm font-medium">{senderLabel}</span>
                {isDraft && <Badge variant="outline">Draft</Badge>}
              </div>
              <div className="text-kumo-subtle text-xs">To: {email.recipient}</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className="text-kumo-subtle text-xs">{formatShortDate(email.date)}</span>
            {onViewSource && (
              <Tooltip
                content="View source"
                side="bottom"
                render={
                  <Button
                    variant="ghost"
                    shape="square"
                    size="sm"
                    icon={<CodeIcon size={14} />}
                    onClick={onViewSource}
                    aria-label="View source"
                    className="!h-6 !w-6 transition-opacity"
                  />
                }
              />
            )}
            <button type="button" onClick={onToggleExpand} className="ml-1" aria-label="Collapse message">
              <CaretUpIcon size={14} className="text-kumo-subtle hover:text-kumo-default transition-colors" />
            </button>
          </div>
        </div>

        <DeliveryStatus email={email} />
        <div className="mt-3 md:ml-[42px]">
          <EmailIframe
            body={rewriteInlineImages(email.body || "", mailboxId || "", email.id, email.attachments)}
            autoSize
          />
        </div>

        {isDraft && (onSendDraft || onEditDraft || onDeleteDraft) && (
          <div className="mt-3 flex gap-2 md:ml-[42px]">
            {onSendDraft && (
              <Button
                variant="primary"
                size="sm"
                icon={<PaperPlaneTiltIcon size={14} />}
                onClick={onSendDraft}
                loading={isSending}
                disabled={isSending}
              >
                {isSending ? "Sending..." : "Send"}
              </Button>
            )}
            {onEditDraft && (
              <Button
                variant="secondary"
                size="sm"
                icon={<PencilSimpleIcon size={14} />}
                onClick={onEditDraft}
                disabled={isSending}
              >
                Edit
              </Button>
            )}
            {onDeleteDraft && (
              <Button
                variant="ghost"
                size="sm"
                icon={<TrashIcon size={14} />}
                onClick={onDeleteDraft}
                disabled={isSending}
              >
                Discard
              </Button>
            )}
          </div>
        )}

        <EmailAttachmentList
          mailboxId={mailboxId}
          emailId={email.id}
          attachments={email.attachments}
          onPreviewImage={onPreviewImage}
          className="mt-3 md:ml-[42px]"
        />
      </div>
    </div>
  );
}
