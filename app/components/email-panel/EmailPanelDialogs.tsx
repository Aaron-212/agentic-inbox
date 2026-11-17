// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { m } from "shared/paraglide/messages.js";

import { Button, Dialog, Table } from "@cloudflare/kumo";
import { downloadFile } from "~/lib/utils";
import type { Email } from "~/types";

interface PreviewImage {
  url: string;
  filename: string;
}

interface EmailPanelDialogsProps {
  sourceViewEmail: Email | null;
  previewImage: PreviewImage | null;
  onCloseSource: () => void;
  onClosePreview: () => void;
}

function getSourceHeaders(msg: Email): { key: string; value: string }[] {
  if (msg.raw_headers) {
    try {
      const parsed = JSON.parse(msg.raw_headers);
      if (Array.isArray(parsed)) {
        return parsed.map((header) => ({
          key: header.key || header.name || "",
          value: String(header.value || ""),
        }));
      }
      if (typeof parsed === "object" && parsed !== null) {
        return Object.entries(parsed).map(([key, value]) => ({
          key,
          value: String(value),
        }));
      }
    } catch {
      // Fall through to field-based headers.
    }
  }

  const headers: { key: string; value: string }[] = [];
  if (msg.sender) headers.push({ key: "From", value: msg.sender });
  if (msg.recipient) headers.push({ key: "To", value: msg.recipient });
  if (msg.cc) headers.push({ key: "Cc", value: msg.cc });
  if (msg.bcc) headers.push({ key: "Bcc", value: msg.bcc });
  if (msg.subject) headers.push({ key: "Subject", value: msg.subject });
  if (msg.date) headers.push({ key: "Date", value: msg.date });
  if (msg.message_id) headers.push({ key: "Message-ID", value: msg.message_id });
  if (msg.in_reply_to) headers.push({ key: "In-Reply-To", value: msg.in_reply_to });
  if (msg.email_references) {
    headers.push({ key: "References", value: msg.email_references });
  }
  if (msg.thread_id) headers.push({ key: "X-Thread-ID", value: msg.thread_id });
  return headers;
}

export default function EmailPanelDialogs({
  sourceViewEmail,
  previewImage,
  onCloseSource,
  onClosePreview,
}: EmailPanelDialogsProps) {
  const sourceHeaders = sourceViewEmail ? getSourceHeaders(sourceViewEmail) : [];

  return (
    <>
      <Dialog.Root
        open={sourceViewEmail !== null}
        onOpenChange={(open) => {
          if (!open) onCloseSource();
        }}
      >
        <Dialog size="xl" className="flex flex-col overflow-hidden">
          <div className="border-kumo-line shrink-0 border-b px-5 py-4 sm:px-6">
            <Dialog.Title className="text-base font-semibold">{m.source_headers()}</Dialog.Title>
            <Dialog.Description className="text-kumo-subtle mt-1 text-sm wrap-anywhere">
              {sourceViewEmail?.subject || m.no_subject()}
            </Dialog.Description>
          </div>
          {sourceViewEmail && (
            <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6">
              {sourceHeaders.length > 0 && (
                <div className="border-kumo-line overflow-hidden rounded-lg border">
                  <Table
                    layout="fixed"
                    className="text-sm [&_th]:border-0 [&_th]:bg-transparent [&_th]:text-sm [&_th]:font-medium"
                  >
                    <caption className="sr-only">{m.source_headers()}</caption>
                    <colgroup>
                      <col className="w-1/3 sm:w-1/4" />
                      <col />
                    </colgroup>
                    <Table.Body>
                      {sourceHeaders.map((header, idx) => (
                        <Table.Row key={`${header.key}-${idx}`}>
                          <Table.Head {...{ scope: "row" }} className="text-kumo-subtle wrap-anywhere">
                            {header.key}
                          </Table.Head>
                          <Table.Cell className="font-mono leading-6 wrap-anywhere whitespace-pre-wrap">
                            {header.value}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                </div>
              )}
              {sourceHeaders.length === 0 && (
                <p className="text-kumo-subtle py-8 text-center text-sm">{m.no_headers()}</p>
              )}
            </div>
          )}
          <div className="border-kumo-line flex shrink-0 justify-end border-t px-5 py-3 sm:px-6">
            <Dialog.Close
              render={
                <Button variant="secondary" size="sm">
                  {m.close()}
                </Button>
              }
            />
          </div>
        </Dialog>
      </Dialog.Root>

      <Dialog.Root
        open={previewImage !== null}
        onOpenChange={(open) => {
          if (!open) onClosePreview();
        }}
      >
        <Dialog size="lg">
          <Dialog.Title>{previewImage?.filename}</Dialog.Title>
          {previewImage && (
            <div className="bg-kumo-tint/30 mt-4 flex min-h-[200px] flex-col items-center justify-center rounded-lg p-4">
              <img
                src={previewImage.url}
                alt={previewImage.filename}
                className="max-h-[70vh] max-w-full rounded object-contain shadow-sm"
              />
            </div>
          )}
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (previewImage) {
                  downloadFile(previewImage.url, previewImage.filename);
                }
              }}
            >
              {m.download_original()}
            </Button>
            <Dialog.Close
              render={
                <Button variant="primary" size="sm">
                  {m.close()}
                </Button>
              }
            />
          </div>
        </Dialog>
      </Dialog.Root>
    </>
  );
}
