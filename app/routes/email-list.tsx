// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { Button, Pagination, Tooltip, useKumoToastManager } from "@cloudflare/kumo";
import {
  ArchiveIcon,
  ArrowBendUpLeftIcon,
  ArrowsClockwiseIcon,
  EnvelopeOpenIcon,
  EnvelopeSimpleIcon,
  FileIcon,
  ListStarIcon,
  PaperPlaneTiltIcon,
  PencilSimpleIcon,
  StarIcon,
  ShieldWarningIcon,
  TrashIcon,
  TrayIcon,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router";
import { Folders, getEmailDeleteLabel, getEmailDeleteConfirmation } from "shared/folders";
import { formatListDate } from "shared/dates";
import MailboxSplitView from "~/components/MailboxSplitView";
import { getSnippetText } from "~/lib/utils";
import { useDeleteEmail, useEmails, useMarkThreadRead, useUpdateEmail } from "~/queries/emails";
import { useFolders } from "~/queries/folders";
import { queryKeys } from "~/queries/keys";
import { useConfirmation } from "~/hooks/useConfirmation";
import { useComposeStore } from "~/hooks/useComposeStore";
import { useUIStore } from "~/hooks/useUIStore";
import type { Email } from "~/types";

const PAGE_SIZE = 25;

const FOLDER_EMPTY_STATES: Record<
  string,
  {
    icon: React.ReactNode;
    title: string;
    description: string;
    showCompose?: boolean;
  }
> = {
  [Folders.INBOX]: {
    icon: <TrayIcon size={48} weight="thin" className="text-kumo-subtle" />,
    title: "Your inbox is empty",
    description: "New emails will appear here when they arrive. Send an email to get the conversation started.",
    showCompose: true,
  },
  [Folders.SENT]: {
    icon: <PaperPlaneTiltIcon size={48} weight="thin" className="text-kumo-subtle" />,
    title: "No sent emails",
    description: "Emails you send will show up here.",
    showCompose: true,
  },
  [Folders.DRAFT]: {
    icon: <FileIcon size={48} weight="thin" className="text-kumo-subtle" />,
    title: "No drafts",
    description: "Emails you're still working on will be saved here.",
    showCompose: true,
  },
  [Folders.ARCHIVE]: {
    icon: <ArchiveIcon size={48} weight="thin" className="text-kumo-subtle" />,
    title: "Archive is empty",
    description: "Move emails here to keep your inbox clean without deleting them.",
  },
  [Folders.SPAM]: {
    icon: <ShieldWarningIcon size={48} weight="thin" className="text-kumo-subtle" />,
    title: "No spam",
    description: "Spam is automatically deleted during daily cleanup after at least 7 days.",
  },
  [Folders.TRASH]: {
    icon: <TrashIcon size={48} weight="thin" className="text-kumo-subtle" />,
    title: "Trash is empty",
    description:
      "Emails are automatically deleted during daily cleanup after at least one day. You can restore them before then.",
  },
};

function EmailListSkeleton() {
  return (
    <div className="animate-pulse space-y-1 p-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          <div className="bg-kumo-fill h-4 w-4 rounded" />
          <div className="bg-kumo-fill h-5 w-5 rounded" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="bg-kumo-fill h-3 w-24 rounded" />
              <div className="bg-kumo-fill h-3 w-4 rounded" />
              <div className="bg-kumo-fill h-3 flex-1 rounded" />
              <div className="bg-kumo-fill h-3 w-12 rounded" />
            </div>
            <div className="bg-kumo-fill h-2.5 w-3/4 rounded" />
            <div className="bg-kumo-fill h-2.5 w-full rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FolderEmptyState({ folder, onCompose }: { folder?: string; onCompose: () => void }) {
  const config = (folder && FOLDER_EMPTY_STATES[folder]) || {
    icon: <EnvelopeSimpleIcon size={48} weight="thin" className="text-kumo-subtle" />,
    title: "No emails",
    description: "This folder is empty.",
  };

  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-4">{config.icon}</div>
      <h3 className="text-kumo-default mb-1.5 text-base font-semibold">{config.title}</h3>
      <p className="text-kumo-subtle mb-5 max-w-xs text-sm">{config.description}</p>
      {"showCompose" in config && config.showCompose && (
        <Button variant="primary" size="sm" icon={<PencilSimpleIcon size={16} />} onClick={onCompose}>
          Compose
        </Button>
      )}
    </div>
  );
}

export default function EmailListRoute() {
  const { mailboxId, folder } = useParams<{
    mailboxId: string;
    folder: string;
  }>();
  const { selectedEmailId, selectEmail, closePanel, startCompose } = useUIStore();
  const { confirm, confirmationDialog } = useConfirmation();
  const [page, setPage] = useState(1);
  const toastManager = useKumoToastManager();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const requestedEmailId = searchParams.get("email");

  const queryClient = useQueryClient();
  const updateEmail = useUpdateEmail();
  const markThreadRead = useMarkThreadRead();
  const deleteEmail = useDeleteEmail();

  const params = useMemo(
    () => ({
      folder: folder || "",
      page: String(page),
      limit: String(PAGE_SIZE),
    }),
    [folder, page],
  );

  const { data: emailData, isFetching: isRefreshing } = useEmails(mailboxId, params, { refetchInterval: 30_000 });

  const emails = emailData?.emails ?? [];
  const totalCount = emailData?.totalCount ?? 0;

  const { data: folders = [] } = useFolders(mailboxId);

  const folderName = useMemo(() => {
    const found = folders.find((f) => f.id === folder);
    if (found) return found.name;
    return folder ? folder.charAt(0).toUpperCase() + folder.slice(1) : "Inbox";
  }, [folders, folder]);

  const isPanelOpen = selectedEmailId !== null;

  // Track folder identity to detect folder changes vs page changes
  const prevFolderRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const folderChanged = prevFolderRef.current !== `${mailboxId}/${folder}`;
    prevFolderRef.current = `${mailboxId}/${folder}`;

    if (folderChanged) {
      closePanel();
      setPage(1);
    }
  }, [mailboxId, folder, closePanel]);

  useEffect(() => {
    if (requestedEmailId) selectEmail(requestedEmailId);
  }, [requestedEmailId, location.key, mailboxId, folder, selectEmail]);

  const toggleStar = (e: React.MouseEvent, email: Email) => {
    e.preventDefault();
    e.stopPropagation();
    if (mailboxId)
      updateEmail.mutate({
        mailboxId,
        id: email.id,
        data: { starred: !email.starred },
      });
  };

  const handleDelete = async (e: React.MouseEvent, email: Email) => {
    const emailId = email.id;
    e.preventDefault();
    e.stopPropagation();
    if (mailboxId) {
      const composer = useComposeStore
        .getState()
        .sessions.find((session) => session.mailboxId === mailboxId && session.draftId === emailId);
      if (composer) {
        useComposeStore.getState().restore(composer.id);
        toastManager.add({ title: "Discard this draft from its open composer." });
        return;
      }
      const confirmed = await confirm({
        title: getEmailDeleteLabel(email.folder_id),
        description: getEmailDeleteConfirmation(email.folder_id),
        confirmLabel: getEmailDeleteLabel(email.folder_id),
      });
      if (!confirmed) return;
      deleteEmail.mutate({ mailboxId, id: emailId });
      if (selectedEmailId === emailId) closePanel();
    }
  };

  const handleRefresh = () => {
    if (mailboxId) {
      queryClient.invalidateQueries({ queryKey: ["emails", mailboxId] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.folders.list(mailboxId),
      });
    }
  };

  // Thread-aware helpers
  const hasUnread = (email: Email): boolean => {
    if (email.thread_unread_count !== undefined) {
      return email.thread_unread_count > 0;
    }
    return !email.read;
  };

  const handleRowClick = (email: Email) => {
    selectEmail(email.id);
    if (mailboxId && hasUnread(email)) {
      if (email.thread_id && email.thread_count && email.thread_count > 1) {
        markThreadRead.mutate({
          mailboxId,
          threadId: email.thread_id,
        });
      } else {
        updateEmail.mutate({
          mailboxId,
          id: email.id,
          data: { read: true },
        });
      }
    }
  };

  const formatParticipants = (email: Email): string => {
    if (email.participants) {
      const addresses = email.participants
        .split(",")
        .map((p) => p.trim())
        .filter((address, idx, arr) => address && arr.indexOf(address) === idx);
      if (addresses.length > 0) return addresses.join(", ");
    }
    return email.sender;
  };

  return (
    <MailboxSplitView selectedEmailId={selectedEmailId}>
      {confirmationDialog}
      {/* Folder header */}
      <div className="border-kumo-line flex h-12 shrink-0 items-center justify-between border-b px-4 md:px-5">
        <h1 className="text-kumo-default text-lg font-semibold">{folderName}</h1>
        <div className="flex items-center gap-1">
          {totalCount > 0 && (
            <span className="text-kumo-subtle mr-2 hidden text-sm sm:inline">
              {totalCount} conversation{totalCount !== 1 ? "s" : ""}
            </span>
          )}
          <Tooltip
            content={isRefreshing ? "Refreshing..." : "Refresh"}
            side="bottom"
            render={
              <Button
                variant="ghost"
                shape="square"
                size="sm"
                icon={<ArrowsClockwiseIcon size={18} className={isRefreshing ? "animate-spin" : ""} />}
                onClick={handleRefresh}
                disabled={isRefreshing}
                aria-label="Refresh"
              />
            }
          />
        </div>
      </div>

      {/* Email rows */}
      <div className="flex-1 overflow-y-auto">
        {isRefreshing && emails.length === 0 ? (
          <EmailListSkeleton />
        ) : emails.length > 0 ? (
          <div>
            {emails.map((email) => {
              const isSelected = selectedEmailId === email.id;
              const summary = email.ai_summary?.trim();
              const snippet = summary || getSnippetText(email.snippet);
              return (
                <div
                  key={email.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleRowClick(email)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleRowClick(email);
                    }
                  }}
                  className={`group border-kumo-line flex w-full cursor-pointer items-center gap-3 border-b px-4 py-2.5 text-left transition-colors md:px-6 md:py-3 ${
                    isPanelOpen ? "md:px-4 md:py-2.5" : ""
                  } ${isSelected ? "bg-kumo-tint" : "hover:bg-kumo-tint"}`}
                >
                  {/* Unread dot */}
                  <div className="flex w-2.5 shrink-0 justify-center">
                    {hasUnread(email) && <div className="bg-kumo-brand h-2 w-2 rounded-full" />}
                  </div>

                  {/* Star */}
                  <button
                    type="button"
                    className="shrink-0 cursor-pointer border-0 bg-transparent p-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStar(e, email);
                    }}
                  >
                    <StarIcon
                      size={16}
                      weight={email.starred ? "fill" : "regular"}
                      className={email.starred ? "text-kumo-warning" : "text-kumo-subtle hover:text-kumo-warning"}
                    />
                  </button>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`min-w-0 flex-1 truncate text-sm ${hasUnread(email) ? "text-kumo-default font-semibold" : "text-kumo-subtle"}`}
                      >
                        {formatParticipants(email)}
                      </span>
                      {(email.thread_count ?? 1) > 1 && (
                        <span className="text-kumo-subtle bg-kumo-fill shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium">
                          {email.thread_count}
                        </span>
                      )}
                      {email.has_draft && <span className="text-kumo-danger shrink-0 text-xs font-medium">Draft</span>}
                      {email.needs_reply && !email.has_draft && (
                        <Tooltip
                          content="Needs reply"
                          render={
                            <span className="text-kumo-warning shrink-0">
                              <ArrowBendUpLeftIcon size={14} weight="bold" />
                            </span>
                          }
                        />
                      )}
                      <span className="text-kumo-subtle ml-auto shrink-0 text-sm">{formatListDate(email.date)}</span>
                    </div>
                    <div className="mt-0.5 truncate text-sm">
                      <span className={hasUnread(email) ? "text-kumo-default font-medium" : "text-kumo-subtle"}>
                        {email.subject}
                      </span>
                    </div>
                    {snippet && (
                      <div className="text-kumo-subtle mt-0.5 flex items-center gap-1 text-sm">
                        {summary && (
                          <span role="img" aria-label="AI summary" className="text-kumo-default shrink-0">
                            <ListStarIcon size={14} aria-hidden="true" />
                          </span>
                        )}
                        <span className="min-w-0 truncate">{snippet}</span>
                      </div>
                    )}
                  </div>

                  {/* Hover actions */}
                  <div className="hidden shrink-0 items-center group-hover:flex">
                    <Tooltip
                      content={email.read ? "Mark unread" : "Mark read"}
                      render={
                        <Button
                          variant="ghost"
                          shape="square"
                          size="sm"
                          icon={email.read ? <EnvelopeSimpleIcon size={14} /> : <EnvelopeOpenIcon size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (mailboxId)
                              updateEmail.mutate({
                                mailboxId,
                                id: email.id,
                                data: { read: !email.read },
                              });
                          }}
                          aria-label={email.read ? "Mark unread" : "Mark read"}
                        />
                      }
                    />
                    <Tooltip
                      content={getEmailDeleteLabel(email.folder_id)}
                      render={
                        <Button
                          variant="ghost"
                          shape="square"
                          size="sm"
                          icon={<TrashIcon size={14} />}
                          onClick={(e) => handleDelete(e, email)}
                          aria-label={getEmailDeleteLabel(email.folder_id)}
                        />
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <FolderEmptyState folder={folder} onCompose={() => startCompose(mailboxId)} />
        )}
      </div>

      {/* Pagination */}
      {totalCount > PAGE_SIZE && (
        <div className="border-kumo-line flex shrink-0 justify-center border-t py-3">
          <Pagination page={page} setPage={setPage} perPage={PAGE_SIZE} totalCount={totalCount}>
            <div className="grow" aria-live="polite" aria-atomic="true">
              <Pagination.Info />
            </div>
            <Pagination.Controls />
          </Pagination>
        </div>
      )}
    </MailboxSplitView>
  );
}
