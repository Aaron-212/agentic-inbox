// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { m } from "shared/paraglide/messages.js";

import EmailAttachmentList from "~/components/EmailAttachmentList";
import EmailIframe from "~/components/EmailIframe";
import { formatDetailDate, rewriteInlineImages } from "~/lib/utils";
import type { Email } from "~/types";
import DeliveryStatus from "./DeliveryStatus";

interface SingleMessageViewProps {
  email: Email;
  mailboxId?: string;
  onPreviewImage: (url: string, filename: string) => void;
}

export default function SingleMessageView({ email, mailboxId, onPreviewImage }: SingleMessageViewProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-kumo-line border-b px-4 py-4 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="bg-kumo-fill text-kumo-default flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
              {email.sender.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-kumo-default truncate text-sm font-medium">{email.sender}</div>
              <div className="text-kumo-subtle text-xs">{m.to_address({ email: email.recipient })}</div>
            </div>
          </div>
          <span className="text-kumo-subtle shrink-0 text-xs">{formatDetailDate(email.date)}</span>
        </div>
        <DeliveryStatus email={email} />
      </div>

      <div className="min-h-0 flex-1">
        <EmailIframe body={rewriteInlineImages(email.body || "", mailboxId || "", email.id, email.attachments)} />
      </div>

      <EmailAttachmentList
        mailboxId={mailboxId}
        emailId={email.id}
        attachments={email.attachments}
        onPreviewImage={onPreviewImage}
        className="border-kumo-line shrink-0 border-t px-4 py-3 md:px-6"
        showHeading
      />
    </div>
  );
}
