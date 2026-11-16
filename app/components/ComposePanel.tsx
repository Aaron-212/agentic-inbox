// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { Banner, Button, Input } from "@cloudflare/kumo";
import { ArrowsInSimpleIcon, ArrowsOutSimpleIcon, MinusIcon, PaperPlaneTiltIcon, XIcon } from "@phosphor-icons/react";
import { type ComponentPropsWithoutRef, useEffect, useId, useRef } from "react";
import { Resizable } from "re-resizable";
import { useNavigate } from "react-router";
import { useComposeForm } from "~/hooks/useComposeForm";
import { useComposeStore, type ComposeSession } from "~/hooks/useComposeStore";
import RichTextEditor from "./RichTextEditor";
import ComposeResizeMenu from "./ComposeResizeMenu";
import { useComposeResize } from "~/hooks/useComposeResize";

export default function ComposePanel({ session, hasMinimized }: { session: ComposeSession; hasMinimized: boolean }) {
  const form = useComposeForm(session);
  const dialog = useRef<Resizable>(null);
  const resize = useComposeResize(dialog, hasMinimized, session.expanded);
  const lastField = useRef<HTMLElement | null>(null);
  const id = useId();
  const navigate = useNavigate();
  const recoveryUnavailable = useComposeStore((state) => state.recoveryUnavailable);
  const updateSession = useComposeStore((state) => state.updateSession);

  const fieldsReady = session.fields !== null;

  useEffect(() => {
    const element = dialog.current?.resizable;
    if (!(element instanceof HTMLDialogElement)) return;
    if (session.minimized) {
      element.close();
      return;
    }
    // Keep the inbox interactive and the composer inside the mail workspace.
    if (!element.open) element.show();
    if (!fieldsReady) return;
    const frame = requestAnimationFrame(() => {
      (lastField.current ?? element.querySelector<HTMLInputElement>("input"))?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [session.minimized, fieldsReady]);

  const minimize = () => updateSession(session.id, { minimized: true });
  const originalId = session.options.originalEmail?.id || session.options.draftEmail?.in_reply_to;
  const saveStatus = form.saveFailed
    ? "Couldn’t save"
    : form.isSavingDraft
      ? "Saving…"
      : session.revision !== session.savedRevision
        ? "Unsaved changes"
        : session.hasSavedDraft
          ? "Saved to Drafts"
          : "";

  const dialogProps = {
    "aria-labelledby": `${id}-title`,
    onFocusCapture: (event) => {
      if (event.target.matches("input, [contenteditable]")) lastField.current = event.target;
    },
    onKeyDown: (event) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        minimize();
      }
    },
  } satisfies ComponentPropsWithoutRef<"dialog">;

  return (
    <Resizable
      as="dialog"
      ref={dialog}
      {...dialogProps}
      {...resize.resizableProps}
      handleWrapperClass="compose-resize-handles"
      className={`pointer-events-auto m-0 max-h-none max-w-none border border-kumo-line bg-kumo-base p-0 text-kumo-default shadow-2xl open:flex open:flex-col ${session.expanded ? "" : "@3xl:rounded-t-lg"}`}
    >
      <span className="sr-only" role="status">
        {resize.announcement}
      </span>
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-kumo-line px-4">
        <h2 id={`${id}-title`} className="min-w-0 truncate text-sm font-semibold">
          {form.subject || form.formTitle}
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          {!session.expanded && <ComposeResizeMenu resize={resize} />}
          <Button
            type="button"
            variant="ghost"
            shape="square"
            size="sm"
            icon={<MinusIcon size={18} />}
            onClick={minimize}
            aria-label="Minimize composer"
          />
          <Button
            type="button"
            variant="ghost"
            shape="square"
            size="sm"
            icon={session.expanded ? <ArrowsInSimpleIcon size={18} /> : <ArrowsOutSimpleIcon size={18} />}
            onClick={() => updateSession(session.id, { expanded: !session.expanded })}
            aria-label={session.expanded ? "Restore composer size" : "Expand composer"}
            aria-pressed={session.expanded}
            className="hidden @3xl:inline-flex"
          />
          <Button
            type="button"
            variant="ghost"
            shape="square"
            size="sm"
            icon={<XIcon size={18} />}
            onClick={() => void form.closeCompose()}
            disabled={form.isSending || form.isSavingDraft}
            aria-label="Save draft and close"
          />
        </div>
      </div>
      <form onSubmit={form.handleSend} className="flex min-h-0 flex-1 flex-col">
        <fieldset
          disabled={form.isSending || !session.fields}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto border-0 p-4"
        >
          <div className="space-y-3">
            {form.error && <Banner variant="error" description={form.error} />}
            {recoveryUnavailable && (
              <Banner
                variant="alert"
                description="Local recovery is unavailable. Keep this tab open until your draft is saved."
              />
            )}
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-kumo-subtle">From: {form.mailbox?.email || session.mailboxId}</span>
              {originalId && (
                <button
                  type="button"
                  className="shrink-0 text-kumo-link hover:underline"
                  onClick={() => {
                    navigate(`/mailbox/${session.mailboxId}/emails/inbox?email=${encodeURIComponent(originalId)}`);
                    minimize();
                  }}
                >
                  View original
                </button>
              )}
            </div>
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  id={`${id}-to`}
                  label="To"
                  type="text"
                  placeholder="recipient@example.com"
                  size="sm"
                  value={form.to}
                  onChange={(event) => form.updateFields({ to: event.target.value })}
                  required
                  autoFocus
                />
              </div>
              {!form.showCcBcc && (
                <Button type="button" variant="ghost" size="sm" onClick={() => form.updateFields({ showCcBcc: true })}>
                  CC / BCC
                </Button>
              )}
            </div>
            {form.showCcBcc && (
              <>
                <Input
                  id={`${id}-cc`}
                  label="CC"
                  size="sm"
                  value={form.cc}
                  onChange={(event) => form.updateFields({ cc: event.target.value })}
                />
                <Input
                  id={`${id}-bcc`}
                  label="BCC"
                  size="sm"
                  value={form.bcc}
                  onChange={(event) => form.updateFields({ bcc: event.target.value })}
                />
              </>
            )}
            <Input
              id={`${id}-subject`}
              label="Subject"
              size="sm"
              value={form.subject}
              onChange={(event) => form.updateFields({ subject: event.target.value })}
              required
            />
          </div>
          <div className="mt-4 min-h-64 flex-1">
            <RichTextEditor
              value={form.body}
              onChange={(body) => form.updateFields({ body })}
              disabled={form.isSending || !session.fields}
            />
          </div>
        </fieldset>
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-kumo-line px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void form.discard()}
            disabled={form.isSending || form.isSavingDraft}
          >
            Discard
          </Button>
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-xs text-kumo-subtle" role="status">
              {saveStatus}
            </span>
            {form.saveFailed && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void form.handleSaveDraft()}
                disabled={form.isSending}
              >
                Retry
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={form.isSending}
              disabled={form.isSending || !session.fields || !form.mailbox}
              icon={<PaperPlaneTiltIcon size={14} />}
            >
              Send
            </Button>
          </div>
        </div>
      </form>
    </Resizable>
  );
}
