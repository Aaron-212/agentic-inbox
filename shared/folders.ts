// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { m } from "./paraglide/messages.js";

/**
 * Canonical folder ID constants.
 *
 * Every part of the stack — API routes, Durable Object, MCP, agent,
 * frontend sidebar — references folder IDs. This module is the single
 * source of truth so we don't scatter magic strings everywhere.
 */

export const Folders = {
  INBOX: "inbox",
  SENT: "sent",
  DRAFT: "draft",
  ARCHIVE: "archive",
  SPAM: "spam",
  TRASH: "trash",
} as const;

export type FolderId = (typeof Folders)[keyof typeof Folders];

/**
 * System folder IDs that appear in the sidebar.
 * Order here matches the sidebar display order.
 */
export const SYSTEM_FOLDER_IDS: readonly FolderId[] = [
  Folders.INBOX,
  Folders.SENT,
  Folders.DRAFT,
  Folders.ARCHIVE,
  Folders.SPAM,
  Folders.TRASH,
];

/**
 * Human-readable display names for folder IDs.
 * Used in the sidebar, search result badges, and tool descriptions.
 */
export const FOLDER_DISPLAY_NAMES: Record<string, string> = {
  [Folders.INBOX]: "Inbox",
  [Folders.SENT]: "Sent",
  [Folders.DRAFT]: "Drafts",
  [Folders.ARCHIVE]: "Archive",
  [Folders.TRASH]: "Trash",
  [Folders.SPAM]: "Spam",
};

/** Formatted string for tool parameter descriptions (agent + MCP). */
export const FOLDER_TOOL_DESCRIPTION = "Folder to list: inbox, sent, draft, archive, spam, trash";

/** Formatted string for move-email tool descriptions. */
export const MOVE_FOLDER_TOOL_DESCRIPTION = "Target folder: inbox, sent, draft, archive, spam, trash";

const folderMessages: Record<string, () => string> = {
  [Folders.INBOX]: m.inbox,
  [Folders.SENT]: m.sent,
  [Folders.DRAFT]: m.drafts,
  [Folders.ARCHIVE]: m.archive,
  [Folders.SPAM]: m.spam,
  [Folders.TRASH]: m.trash,
};

/** Localize system folders, preserving custom names and unknown IDs. */
export function getFolderDisplayName(folderId: string, fallbackName?: string): string {
  return (
    folderMessages[folderId.toLowerCase()]?.() ?? fallbackName ?? folderId.charAt(0).toUpperCase() + folderId.slice(1)
  );
}

export function getEmailDeleteLabel(folderId: string | null | undefined): string {
  if (folderId === Folders.DRAFT) return m.discard_draft();
  return folderId === Folders.TRASH ? m.delete_permanently() : m.move_trash();
}

export function getEmailDeleteConfirmation(folderId: string | null | undefined): string {
  if (folderId === Folders.DRAFT) return m.discard_confirm();
  return folderId === Folders.TRASH ? m.permanent_delete_confirm() : m.trash_confirm();
}
