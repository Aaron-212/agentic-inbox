// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

/**
 * Shared attachment storage logic.
 * Eliminates the triplicated atob → Uint8Array → R2.put pattern.
 */
import type { Env } from "../types";

export interface StoredAttachment {
  id: string;
  email_id: string;
  filename: string;
  mimetype: string;
  size: number;
  content_id: string | null;
  disposition: string;
}

/**
 * Store base64-encoded attachments to R2 and return metadata for the DO.
 */
export async function storeAttachments(
  bucket: Env["BUCKET"],
  emailId: string,
  attachments?: {
    content: string;
    filename: string;
    type: string;
    disposition: string;
    contentId?: string;
  }[],
): Promise<StoredAttachment[]> {
  if (!attachments?.length) return [];

  const results: StoredAttachment[] = [];
  for (const att of attachments) {
    const attachmentId = crypto.randomUUID();
    // Sanitize filename to prevent path traversal in R2 keys
    // oxlint-disable-next-line no-control-regex -- Strip control characters from attachment filenames.
    const safeFilename = (att.filename || "untitled").replace(/[/\\:*?"<>|\x00-\x1f]/g, "_");
    const key = `attachments/${emailId}/${attachmentId}/${safeFilename}`;
    const binaryStr = atob(att.content);
    const bytes = Uint8Array.from(binaryStr, (c) => c.charCodeAt(0));
    await bucket.put(key, bytes);
    results.push({
      id: attachmentId,
      email_id: emailId,
      filename: safeFilename,
      mimetype: att.type,
      size: bytes.byteLength,
      content_id: att.contentId || null,
      disposition: att.disposition,
    });
  }
  return results;
}
