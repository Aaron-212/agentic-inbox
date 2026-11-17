// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { m } from "shared/paraglide/messages.js";

import { useKumoToastManager } from "@cloudflare/kumo";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildQuotedReplyBlock,
  escapeHtml,
  formatComposeDate,
  getSignatureBlock,
  htmlToPlainText,
  splitEmailList,
  stripHtml,
  toEmailListValue,
} from "~/lib/utils";
import { useDeleteEmail, useForwardEmail, useReplyToEmail, useSaveDraft, useSendEmail } from "~/queries/emails";
import { useMailbox } from "~/queries/mailboxes";
import { ApiError } from "~/services/api";
import type { ComposeOptions } from "~/hooks/useUIStore";
import { useConfirmation } from "~/hooks/useConfirmation";
import { useComposeStore, type ComposeFields, type ComposeSession } from "./useComposeStore";

function appendUniqueAddress(addresses: string[], seen: Set<string>, address: string, exclude?: string) {
  const trimmed = address.trim();
  if (!trimmed) return;

  const normalized = trimmed.toLowerCase();
  if (normalized === exclude || seen.has(normalized)) return;

  seen.add(normalized);
  addresses.push(trimmed);
}

const EMPTY_FIELDS: ComposeFields = {
  to: "",
  cc: "",
  bcc: "",
  showCcBcc: false,
  subject: "",
  body: "",
};

function getPrefixedSubject(subject: string, prefix: "Re" | "Fwd") {
  const expectedPrefix = `${prefix}: `;
  return subject.startsWith(expectedPrefix) ? subject : `${expectedPrefix}${subject}`;
}

function buildForwardBody(original: NonNullable<ComposeOptions["originalEmail"]>, sigBlock: string) {
  const safeSender = escapeHtml(original.sender);
  const safeSubject = escapeHtml(original.subject);
  const safeBody = escapeHtml(stripHtml(original.body || "")).replace(/\n/g, "<br>");

  return `<p><br></p>${sigBlock ? `${sigBlock}<br>` : ""}<div style="border: 1px solid #ddd; padding: 1em; background-color: #f9f9f9; margin: 1em 0;"><strong>Forwarded message:</strong><br><strong>From:</strong> ${safeSender}<br><strong>Date:</strong> ${formatComposeDate(original.date)}<br><strong>Subject:</strong> ${safeSubject}<br><br>${safeBody}</div>`;
}

function buildReplyAllFields(original: NonNullable<ComposeOptions["originalEmail"]>, selfAddress?: string) {
  const toRecipients: string[] = [];
  const toSeen = new Set<string>();
  appendUniqueAddress(toRecipients, toSeen, original.sender, selfAddress);

  for (const recipient of splitEmailList(original.recipient)) {
    appendUniqueAddress(toRecipients, toSeen, recipient, selfAddress);
  }

  const ccRecipients: string[] = [];
  const ccSeen = new Set<string>();
  for (const recipient of splitEmailList(original.cc)) {
    const normalized = recipient.toLowerCase();
    if (normalized === selfAddress || toSeen.has(normalized) || ccSeen.has(normalized)) {
      continue;
    }
    ccSeen.add(normalized);
    ccRecipients.push(recipient);
  }

  return {
    to: toRecipients.join(", "),
    cc: ccRecipients.join(", "),
    showCcBcc: ccRecipients.length > 0,
  };
}

function buildInitialComposeFields(
  composeOptions: ComposeOptions,
  mailboxEmail: string | undefined,
  sigBlock: string,
): ComposeFields {
  const { draftEmail: draft, originalEmail: original, mode } = composeOptions;

  if (draft) {
    return {
      to: draft.recipient || "",
      cc: draft.cc || "",
      bcc: draft.bcc || "",
      showCcBcc: Boolean(draft.cc || draft.bcc),
      subject: draft.subject || "",
      body: draft.body || "",
    };
  }

  if (!original) {
    return {
      ...EMPTY_FIELDS,
      body: sigBlock ? `<p><br></p>${sigBlock}` : "",
    };
  }

  if (mode === "reply") {
    return {
      ...EMPTY_FIELDS,
      to: original.sender,
      subject: getPrefixedSubject(original.subject, "Re"),
      body: `<p><br></p>${sigBlock ? `${sigBlock}<br>` : ""}${buildQuotedReplyBlock(original.date, original.sender, original.body || "")}`,
    };
  }

  if (mode === "reply-all") {
    const recipients = buildReplyAllFields(original, mailboxEmail?.toLowerCase());
    return {
      ...EMPTY_FIELDS,
      ...recipients,
      subject: getPrefixedSubject(original.subject, "Re"),
      body: `<p><br></p>${sigBlock ? `${sigBlock}<br>` : ""}${buildQuotedReplyBlock(original.date, original.sender, original.body || "")}`,
    };
  }

  if (mode === "forward") {
    return {
      ...EMPTY_FIELDS,
      subject: getPrefixedSubject(original.subject, "Fwd"),
      body: buildForwardBody(original, sigBlock),
    };
  }

  return {
    ...EMPTY_FIELDS,
    body: sigBlock ? `<p><br></p>${sigBlock}` : "",
  };
}

// Keep requests serialized even if the mailbox layout unmounts during navigation.
const pendingSaves = new Map<string, Promise<boolean>>();
const activeOperations = new Set<string>();

export function useComposeForm(session: ComposeSession) {
  const { confirm, confirmationDialog } = useConfirmation();
  const toastManager = useKumoToastManager();
  const toastRef = useRef(toastManager);
  useEffect(() => {
    toastRef.current = toastManager;
  }, [toastManager]);
  const { mailboxId, options: composeOptions } = session;
  const { data: currentMailbox } = useMailbox(mailboxId);
  const sendEmailMutation = useSendEmail();
  const { mutateAsync: saveDraft } = useSaveDraft();
  const replyMutation = useReplyToEmail();
  const forwardMutation = useForwardEmail();
  const deleteEmailMutation = useDeleteEmail();
  const [error, setError] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fields = session.fields ?? EMPTY_FIELDS;
  const { to, cc, bcc, subject, body } = fields;

  const formTitle = useMemo(() => {
    if (composeOptions.draftEmail) return m.edit_draft();
    switch (composeOptions.mode) {
      case "reply":
        return m.reply();
      case "reply-all":
        return m.reply_all();
      case "forward":
        return m.forward();
      default:
        return m.new_message_title();
    }
  }, [composeOptions]);

  useEffect(() => {
    if (session.fields || !currentMailbox) return;
    useComposeStore.getState().updateSession(session.id, {
      fields: buildInitialComposeFields(
        composeOptions,
        currentMailbox.email,
        getSignatureBlock(currentMailbox.settings),
      ),
    });
  }, [session.id, session.fields, composeOptions, currentMailbox]);

  // Serialize saves and take a fresh snapshot after each response so late responses cannot overwrite newer edits.
  const handleSaveDraft = useCallback((): Promise<boolean> => {
    const pending = pendingSaves.get(session.id);
    if (pending) return pending;
    const save = async () => {
      await Promise.resolve();
      setIsSavingDraft(true);
      setSaveFailed(false);
      setError(null);
      try {
        while (true) {
          const latest = useComposeStore.getState().sessions.find((item) => item.id === session.id);
          if (!latest?.fields || latest.revision === latest.savedRevision) return true;
          const { fields, options } = latest;
          await saveDraft({
            mailboxId: latest.mailboxId,
            draft: {
              to: fields.to,
              cc: fields.cc,
              bcc: fields.bcc,
              subject: fields.subject,
              body: fields.body,
              in_reply_to: options.originalEmail?.id || options.draftEmail?.in_reply_to || undefined,
              thread_id: options.originalEmail?.thread_id || options.draftEmail?.thread_id || undefined,
              draft_id: latest.draftId,
              compose_mode: options.mode,
            },
          });
          useComposeStore.getState().updateSession(latest.id, { savedRevision: latest.revision, hasSavedDraft: true });
        }
      } catch (err) {
        setSaveFailed(true);
        toastRef.current.add({
          title: m.draft_save_failed(),
          variant: "error",
        });
        setError(err instanceof Error ? err.message : m.draft_save_error());
        return false;
      } finally {
        pendingSaves.delete(session.id);
        setIsSavingDraft(false);
      }
    };
    const pendingSave = save();
    pendingSaves.set(session.id, pendingSave);
    return pendingSave;
  }, [session.id, saveDraft]);

  useEffect(() => {
    if (!session.fields || session.revision === session.savedRevision || isSending || saveFailed) return;
    const timeout = window.setTimeout(() => {
      if (!activeOperations.has(session.id)) void handleSaveDraft();
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [session.id, session.fields, session.revision, session.savedRevision, isSending, saveFailed, handleSaveDraft]);

  useEffect(
    () => () => {
      if (!activeOperations.has(session.id)) void handleSaveDraft();
    },
    [session.id, handleSaveDraft],
  );

  const closeCompose = async () => {
    if (activeOperations.has(session.id)) return;
    activeOperations.add(session.id);
    try {
      if (await handleSaveDraft()) useComposeStore.getState().remove(session.id);
    } finally {
      activeOperations.delete(session.id);
    }
  };

  const discard = async () => {
    if (activeOperations.has(session.id)) return;
    const meaningful = session.hasSavedDraft || session.revision > 0;
    if (
      meaningful &&
      !(await confirm({
        title: m.discard_draft(),
        description: m.discard_irreversible(),
        confirmLabel: m.discard(),
      }))
    )
      return;
    if (activeOperations.has(session.id)) return;
    activeOperations.add(session.id);
    setIsSending(true);
    try {
      await pendingSaves.get(session.id);
      const latest = useComposeStore.getState().sessions.find((item) => item.id === session.id);
      if (latest && (latest.hasSavedDraft || latest.revision > 0)) {
        try {
          await deleteEmailMutation.mutateAsync({ mailboxId, id: latest.draftId });
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 404)) throw err;
        }
      }
      useComposeStore.getState().remove(session.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : m.discard_failed());
    } finally {
      activeOperations.delete(session.id);
      setIsSending(false);
    }
  };

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    if (activeOperations.has(session.id)) return;
    setError(null);
    if (!currentMailbox) {
      setError(m.mailbox_loading());
      return;
    }
    const toRecipients = splitEmailList(to);
    if (toRecipients.length === 0) {
      setError(m.add_recipient());
      return;
    }
    const fromName = currentMailbox.settings?.fromName || currentMailbox.name;
    const emailData = {
      to: toEmailListValue(toRecipients),
      cc: toEmailListValue(splitEmailList(cc)),
      bcc: toEmailListValue(splitEmailList(bcc)),
      from:
        fromName && fromName !== currentMailbox.email
          ? { email: currentMailbox.email, name: fromName }
          : currentMailbox.email,
      subject,
      html: body,
      text: htmlToPlainText(body),
    };
    activeOperations.add(session.id);
    setIsSending(true);
    try {
      await pendingSaves.get(session.id);
      const originalId = composeOptions.originalEmail?.id || composeOptions.draftEmail?.in_reply_to;
      const mode = composeOptions.mode;
      if ((mode === "reply" || mode === "reply-all") && originalId)
        await replyMutation.mutateAsync({ mailboxId, emailId: originalId, email: emailData });
      else if (mode === "forward" && originalId)
        await forwardMutation.mutateAsync({ mailboxId, emailId: originalId, email: emailData });
      else await sendEmailMutation.mutateAsync({ mailboxId, email: emailData });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : m.send_unknown());
      activeOperations.delete(session.id);
      setIsSending(false);
      return;
    }
    // Sending succeeded: cleanup failure must never invite sending the same message again.
    const latest = useComposeStore.getState().sessions.find((item) => item.id === session.id);
    useComposeStore.getState().remove(session.id);
    toastManager.add({ title: m.email_accepted() });
    activeOperations.delete(session.id);
    if (latest && (latest.hasSavedDraft || latest.revision > 0)) {
      try {
        await deleteEmailMutation.mutateAsync({ mailboxId, id: latest.draftId });
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 404))
          toastManager.add({ title: m.cleanup_failed(), variant: "error" });
      }
    }
  };

  return {
    ...fields,
    updateFields: (changes: Partial<ComposeFields>) => useComposeStore.getState().updateFields(session.id, changes),
    mailbox: currentMailbox,
    error,
    saveFailed,
    isSavingDraft,
    isSending,
    formTitle,
    handleSaveDraft,
    handleSend,
    closeCompose,
    discard,
    confirmationDialog,
  };
}
