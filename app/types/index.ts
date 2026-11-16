// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import type { AIFeatureSettings } from "shared/ai-features";
import type { AIModelSettings } from "shared/ai-model";

export interface SignatureSettings {
  enabled: boolean;
  text: string;
  html?: string;
}

export interface MailboxSettings extends AIFeatureSettings, AIModelSettings {
  fromName?: string;
  forwarding?: { enabled: boolean; email: string };
  signature?: SignatureSettings;
  autoReply?: { enabled: boolean; subject: string; message: string };
  agentSystemPrompt?: string;
}

export interface Mailbox {
  id: string;
  email: string;
  name: string;
  settings?: MailboxSettings;
}

export interface Email {
  id: string;
  thread_id?: string | null;
  folder_id?: string | null;
  subject: string;
  sender: string;
  recipient: string;
  cc?: string;
  bcc?: string;
  date: string;
  read: boolean;
  starred: boolean;
  body?: string | null;
  in_reply_to?: string | null;
  compose_mode?: "new" | "reply" | "reply-all" | "forward" | null;
  email_references?: string | null;
  message_id?: string | null;
  raw_headers?: string | null;
  attachments?: Attachment[];
  snippet?: string | null;
  // Thread aggregate fields (only present in threaded list view)
  thread_count?: number;
  thread_unread_count?: number;
  participants?: string;
  needs_reply?: boolean;
  has_draft?: boolean;
}

export interface Attachment {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  content_id?: string;
  disposition?: string;
}

export interface Folder {
  id: string;
  name: string;
  unreadCount: number;
}
