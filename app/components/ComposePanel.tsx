// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { Banner, Button, Input } from "@cloudflare/kumo";
import { ArrowsInSimpleIcon, ArrowsOutSimpleIcon, MinusIcon, PaperPlaneTiltIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useId, useRef } from "react";
import { Rnd } from "react-rnd";
import { useNavigate } from "react-router";
import { useComposeForm } from "~/hooks/useComposeForm";
import { useComposeStore, type ComposeSession } from "~/hooks/useComposeStore";
import RichTextEditor from "./RichTextEditor";
import ComposeWindowMenu from "./ComposeWindowMenu";
import { useComposeWindow } from "~/hooks/useComposeWindow";

export default function ComposePanel({ session }: { session: ComposeSession }) {
  const form = useComposeForm(session);
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<Rnd>(null);
  const windowState = useComposeWindow(panel, session.expanded);
  const lastField = useRef<HTMLElement | null>(null);
  const id = useId();
  const navigate = useNavigate();
  const recoveryUnavailable = useComposeStore((state) => state.recoveryUnavailable);
  const updateSession = useComposeStore((state) => state.updateSession);

  const fieldsReady = session.fields !== null;

  useEffect(() => {
    const element = dialog.current;
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

  return (
    <Rnd
      ref={panel}
      {...windowState.rndProps}
      resizeHandleWrapperClass="compose-resize-handles"
      style={{ visibility: session.minimized ? "hidden" : "visible" }}
      className={`border-kumo-line bg-kumo-base pointer-events-auto border shadow-2xl ${windowState.floating ? "rounded-lg" : ""}`}
    >
      <dialog
        ref={dialog}
        aria-labelledby={`${id}-title`}
        onFocusCapture={(event) => {
          if (event.target.matches("input, [contenteditable]")) lastField.current = event.target;
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !event.defaultPrevented) {
            event.preventDefault();
            minimize();
          }
        }}
        className={`bg-kumo-base text-kumo-default absolute inset-0 m-0 h-full max-h-none w-full max-w-none border-0 p-0 open:flex open:flex-col ${windowState.floating ? "rounded-lg" : ""}`}
      >
        <span className="sr-only" role="status">
          {windowState.announcement}
        </span>
        <div
          className={`border-kumo-line flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4 ${windowState.floating ? "compose-window-titlebar cursor-grab active:cursor-grabbing" : ""}`}
        >
          <h2 id={`${id}-title`} className="min-w-0 truncate text-sm font-semibold">
            {windowState.floating ? (
              <button
                type="button"
                className="compose-window-drag-handle block w-full cursor-grab truncate text-left active:cursor-grabbing"
                onKeyDown={windowState.onMoveKeyDown}
                aria-label={`${form.subject || form.formTitle}. Use arrow keys to move the composer.`}
              >
                {form.subject || form.formTitle}
              </button>
            ) : (
              form.subject || form.formTitle
            )}
          </h2>
          <div className="flex shrink-0 items-center gap-1">
            {windowState.floating && <ComposeWindowMenu windowState={windowState} />}
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
                <span className="text-kumo-subtle truncate">From: {form.mailbox?.email || session.mailboxId}</span>
                {originalId && (
                  <button
                    type="button"
                    className="text-kumo-link shrink-0 hover:underline"
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => form.updateFields({ showCcBcc: true })}
                  >
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
          <div className="border-kumo-line flex shrink-0 items-center justify-between gap-2 border-t px-4 py-3">
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
              <span className="text-kumo-subtle truncate text-xs" role="status">
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
      </dialog>
    </Rnd>
  );
}
