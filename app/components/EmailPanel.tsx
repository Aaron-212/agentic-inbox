// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { m } from "shared/paraglide/messages.js";

import { getAIFeatures } from "shared/ai-features";
import { useKumoToastManager } from "@cloudflare/kumo";
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { Folders, getEmailDeleteLabel, getEmailDeleteConfirmation } from "shared/folders";
import EmailPanelDialogs from "~/components/email-panel/EmailPanelDialogs";
import EmailPanelHeader from "~/components/email-panel/EmailPanelHeader";
import EmailPanelToolbar from "~/components/email-panel/EmailPanelToolbar";
import SingleMessageView from "~/components/email-panel/SingleMessageView";
import ThreadMessage from "~/components/email-panel/ThreadMessage";
import { splitEmailList, toEmailListValue } from "~/lib/utils";
import api, { ApiError } from "~/services/api";
import {
  useDeleteEmail,
  useEmail,
  useGenerateAIReply,
  useForwardEmail,
  useMoveEmail,
  useReplyToEmail,
  useSendEmail,
  useThreadReplies,
  useUpdateEmail,
} from "~/queries/emails";
import { useFolders } from "~/queries/folders";
import { useMailbox } from "~/queries/mailboxes";
import { useConfirmation } from "~/hooks/useConfirmation";
import { useComposeStore } from "~/hooks/useComposeStore";
import { useUIStore } from "~/hooks/useUIStore";
import type { Email, Folder, Mailbox } from "~/types";

function EmailPanelSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-5">
      <div className="bg-kumo-fill h-5 w-2/3 rounded" />
      <div className="flex items-center gap-3">
        <div className="bg-kumo-fill size-10  rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="bg-kumo-fill h-3 w-40 rounded" />
          <div className="bg-kumo-fill h-2.5 w-24 rounded" />
        </div>
      </div>
      <div className="space-y-2 pt-4">
        <div className="bg-kumo-fill h-2.5 w-full rounded" />
        <div className="bg-kumo-fill h-2.5 w-5/6 rounded" />
        <div className="bg-kumo-fill h-2.5 w-4/6 rounded" />
        <div className="bg-kumo-fill h-2.5 w-3/4 rounded" />
      </div>
    </div>
  );
}

export default function EmailPanel({ emailId }: { emailId: string }) {
  const { mailboxId, folder } = useParams<{ mailboxId: string; folder: string }>();
  const { data: email } = useEmail(mailboxId, emailId) as { data?: Email };
  const { data: threadRepliesRaw } = useThreadReplies(mailboxId, email?.thread_id) as {
    data?: Email[];
  };
  const updateEmail = useUpdateEmail();
  const deleteEmailMut = useDeleteEmail();
  const moveEmailMut = useMoveEmail();
  const sendEmailMut = useSendEmail();
  const replyMut = useReplyToEmail();
  const forwardMut = useForwardEmail();
  const generateAIReply = useGenerateAIReply();
  const { data: folders = [] } = useFolders(mailboxId) as { data?: Folder[] };
  const { data: currentMailbox } = useMailbox(mailboxId) as {
    data?: Mailbox;
  };
  const { closePanel, startCompose } = useUIStore();
  const { confirm, confirmationDialog } = useConfirmation();
  const toastManager = useKumoToastManager();
  const [isSending, setIsSending] = useState(false);
  const [sourceViewEmail, setSourceViewEmail] = useState<Email | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<{ url: string; filename: string } | null>(null);
  const aiRepliesEnabled = !!currentMailbox && getAIFeatures(currentMailbox.settings).replies;
  const isDraftFolder = folder === Folders.DRAFT;

  const threadReplies = useMemo(() => {
    if (!threadRepliesRaw || !email) return [];
    return threadRepliesRaw.filter((e) => e.id !== email.id);
  }, [threadRepliesRaw, email]);

  const allMessages = useMemo(() => {
    if (!email) return [];
    return [email, ...threadReplies].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [email, threadReplies]);

  // Reset expanded state only when the selected email changes, not on every refetch.
  // Using allMessages as a dependency would reset user expand/collapse state on background refetches.
  const currentEmailId = email?.id;
  const [previousEmailId, setPreviousEmailId] = useState<string | undefined>();
  if (currentEmailId !== previousEmailId) {
    setPreviousEmailId(currentEmailId);
    setExpandedMessages(new Set(allMessages.length > 1 ? [allMessages[0].id] : []));
  }

  const toggleExpand = (msgId: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const draftMessageIds = useMemo(() => {
    const ids = new Set<string>();
    for (const msg of allMessages) {
      if (msg.folder_id === Folders.DRAFT) ids.add(msg.id);
      else if (isDraftFolder && msg.id === emailId) ids.add(msg.id);
    }
    return ids;
  }, [allMessages, isDraftFolder, emailId]);

  const lastReceivedMessage = useMemo(() => {
    const ce = currentMailbox?.email;
    const received = allMessages.filter((msg) => !draftMessageIds.has(msg.id) && msg.sender !== ce);
    if (received.length > 0) return received[0];
    const nonDrafts = allMessages.filter((msg) => !draftMessageIds.has(msg.id));
    return nonDrafts.length > 0 ? nonDrafts[0] : email;
  }, [allMessages, draftMessageIds, currentMailbox?.email, email]);

  const moveToFolders = useMemo(() => {
    const cur = folder || email?.folder_id;
    return folders.filter((f) => f.id !== cur);
  }, [folders, folder, email?.folder_id]);

  if (!email) return <EmailPanelSkeleton />;

  const toggleStar = () => {
    if (mailboxId) updateEmail.mutate({ mailboxId, id: email.id, data: { starred: !email.starred } });
  };
  const handleMove = (folderId: string) => {
    if (mailboxId) {
      const composer = useComposeStore
        .getState()
        .sessions.find((session) => session.mailboxId === mailboxId && session.draftId === email.id);
      if (composer) {
        useComposeStore.getState().restore(composer.id);
        toastManager.add({ title: m.close_before_move() });
        return;
      }
      moveEmailMut.mutate({ mailboxId, id: email.id, folderId });
      closePanel();
    }
  };
  const handleDelete = async () => {
    if (mailboxId) {
      const composer = useComposeStore
        .getState()
        .sessions.find((session) => session.mailboxId === mailboxId && session.draftId === email.id);
      if (composer) {
        useComposeStore.getState().restore(composer.id);
        toastManager.add({ title: m.discard_in_composer() });
        return;
      }
      if (
        !(await confirm({
          title: getEmailDeleteLabel(email.folder_id),
          description: getEmailDeleteConfirmation(email.folder_id),
          confirmLabel: getEmailDeleteLabel(email.folder_id),
        }))
      )
        return;
      deleteEmailMut.mutate({ mailboxId, id: email.id });
      closePanel();
    }
  };

  const handleEditDraft = (draftMsg?: Email) => {
    const target = draftMsg || email;
    if (target.in_reply_to) {
      startCompose(mailboxId, {
        mode: target.compose_mode || "reply",
        originalEmail: allMessages.find((msg) => msg.id === target.in_reply_to),
        draftEmail: target,
      });
    } else {
      startCompose(mailboxId, { mode: target.compose_mode || "new", originalEmail: undefined, draftEmail: target });
    }
  };

  const handleDeleteDraft = async (draftMsg?: Email) => {
    const target = draftMsg || email;
    if (!mailboxId) return;
    if (
      useComposeStore
        .getState()
        .sessions.some((session) => session.mailboxId === mailboxId && session.draftId === target.id)
    ) {
      handleEditDraft(target);
      toastManager.add({ title: m.discard_in_composer() });
      return;
    }
    if (
      !(await confirm({
        title: m.discard_draft(),
        description: m.discard_confirm(),
        confirmLabel: m.discard(),
      }))
    )
      return;
    deleteEmailMut.mutate({ mailboxId, id: target.id });
    toastManager.add({ title: m.draft_discarded() });
    if (target.id === emailId) closePanel();
  };

  const handleSendDraft = async (draftMsg?: Email) => {
    let target = draftMsg || email;
    if (!mailboxId || !currentMailbox) return;
    if (
      useComposeStore
        .getState()
        .sessions.some((session) => session.mailboxId === mailboxId && session.draftId === target.id)
    ) {
      handleEditDraft(target);
      toastManager.add({ title: m.send_in_composer() });
      return;
    }
    setIsSending(true);
    let accepted = false;
    try {
      if (!target.recipient || !target.subject) {
        try {
          const fresh = (await api.getEmail(mailboxId, target.id)) as Email;
          if (fresh) target = fresh;
        } catch {}
      }
      if (!target.recipient) {
        toastManager.add({ title: m.no_recipient(), variant: "error" });
        return;
      }
      const toRecipients = splitEmailList(target.recipient);
      if (toRecipients.length === 0) {
        toastManager.add({ title: m.invalid_recipient(), variant: "error" });
        return;
      }
      const fromName = currentMailbox.settings?.fromName || currentMailbox.name;
      const from =
        fromName && fromName !== currentMailbox.email
          ? { email: currentMailbox.email, name: fromName }
          : currentMailbox.email;
      const emailData = {
        to: toEmailListValue(toRecipients),
        cc: toEmailListValue(splitEmailList(target.cc)),
        bcc: toEmailListValue(splitEmailList(target.bcc)),
        from,
        subject: target.subject || m.no_subject_lower(),
        html: target.body || "",
        text: target.body ? target.body.replace(/<[^>]*>/g, "").trim() : "",
      };
      if (target.in_reply_to && target.compose_mode === "forward")
        await forwardMut.mutateAsync({ mailboxId, emailId: target.in_reply_to, email: emailData });
      else if (target.in_reply_to)
        await replyMut.mutateAsync({ mailboxId, emailId: target.in_reply_to, email: emailData });
      else await sendEmailMut.mutateAsync({ mailboxId, email: emailData });
      accepted = true;
      await deleteEmailMut.mutateAsync({ mailboxId, id: target.id });
      toastManager.add({ title: m.email_accepted() });
      if (isDraftFolder) closePanel();
    } catch (err) {
      const message = accepted ? m.accepted_cleanup_failed() : err instanceof ApiError ? err.message : m.send_unknown();
      toastManager.add({ title: message, variant: "error" });
    } finally {
      setIsSending(false);
    }
  };

  const handleDraftAIReply = async () => {
    if (!aiRepliesEnabled || !mailboxId || !lastReceivedMessage || generateAIReply.isPending) return;
    const originalEmail = lastReceivedMessage;
    try {
      const draftEmail = await generateAIReply.mutateAsync({ mailboxId, emailId: originalEmail.id });
      const current = useUIStore.getState();
      if (current.selectedEmailId === emailId && !useComposeStore.getState().sessions.length) {
        startCompose(mailboxId, { mode: "reply", originalEmail, draftEmail });
      } else {
        toastManager.add({ title: m.ai_reply_saved() });
      }
    } catch (error) {
      toastManager.add({
        title: error instanceof Error ? error.message : m.ai_reply_failed(),
        variant: "error",
      });
    }
  };

  const hasThread = allMessages.length > 1;

  return (
    <div className="flex h-full flex-col">
      {confirmationDialog}
      <EmailPanelToolbar
        email={email}
        mailboxId={mailboxId}
        isDraftFolder={isDraftFolder}
        isSending={isSending}
        moveToFolders={moveToFolders}
        onBack={closePanel}
        onSendDraft={() => handleSendDraft()}
        onEditDraft={() => handleEditDraft()}
        aiRepliesEnabled={aiRepliesEnabled}
        onDraftAIReply={handleDraftAIReply}
        isGeneratingAIReply={generateAIReply.isPending}
        onReply={() => startCompose(mailboxId, { mode: "reply", originalEmail: lastReceivedMessage })}
        onReplyAll={() =>
          startCompose(mailboxId, {
            mode: "reply-all",
            originalEmail: lastReceivedMessage,
          })
        }
        onForward={() => startCompose(mailboxId, { mode: "forward", originalEmail: email })}
        onToggleStar={toggleStar}
        onToggleRead={() => {
          if (mailboxId) {
            updateEmail.mutate({
              mailboxId,
              id: email.id,
              data: { read: !email.read },
            });
          }
        }}
        onMove={handleMove}
        onViewSource={() => setSourceViewEmail(email)}
        onDelete={handleDelete}
      />

      <EmailPanelHeader subject={email.subject} messageCount={allMessages.length} showThreadCount={hasThread} />

      <div className="flex-1 overflow-y-auto">
        {hasThread ? (
          allMessages.map((msg, idx) => {
            const isDraft = draftMessageIds.has(msg.id);
            return (
              <ThreadMessage
                key={msg.id}
                email={msg}
                mailboxId={mailboxId}
                mailboxEmail={currentMailbox?.email}
                isLast={idx === allMessages.length - 1}
                isDraft={isDraft}
                isSending={isDraft ? isSending : false}
                isExpanded={expandedMessages.has(msg.id)}
                onToggleExpand={() => toggleExpand(msg.id)}
                onSendDraft={isDraft ? () => handleSendDraft(msg) : undefined}
                onEditDraft={isDraft ? () => handleEditDraft(msg) : undefined}
                onDeleteDraft={isDraft ? () => handleDeleteDraft(msg) : undefined}
                onViewSource={() => setSourceViewEmail(msg)}
                onPreviewImage={(url, filename) => setPreviewImage({ url, filename })}
              />
            );
          })
        ) : (
          <SingleMessageView
            email={email}
            mailboxId={mailboxId}
            onPreviewImage={(url, filename) => setPreviewImage({ url, filename })}
          />
        )}
      </div>

      <EmailPanelDialogs
        sourceViewEmail={sourceViewEmail}
        previewImage={previewImage}
        onCloseSource={() => setSourceViewEmail(null)}
        onClosePreview={() => setPreviewImage(null)}
      />
    </div>
  );
}
