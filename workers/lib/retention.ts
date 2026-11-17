// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import type { Env } from "../types";

export async function cleanupMailboxes(env: Env, now: number) {
  let cursor: string | undefined;
  let failed = false;
  do {
    const page = await env.BUCKET.list({ prefix: "mailboxes/", cursor });
    for (const object of page.objects) {
      if (!object.key.endsWith(".json")) continue;
      const mailboxId = object.key.slice("mailboxes/".length, -".json".length);
      try {
        const mailbox = env.MAILBOX.get(env.MAILBOX.idFromName(mailboxId));
        let hasMore: boolean;
        do {
          ({ hasMore } = await mailbox.cleanupExpiredEmails(now));
        } while (hasMore);
      } catch (error) {
        // Continue cleaning other mailboxes; retain failed attachment deletions for the next run.
        console.error("Mailbox cleanup failed", mailboxId, error);
        failed = true;
      }
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  if (failed) throw new Error("Cleanup failed for one or more mailboxes");
}
