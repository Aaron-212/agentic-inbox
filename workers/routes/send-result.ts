import type { Context } from "hono";
import type { SendOutcome } from "shared/delivery";
import type { MailboxContext } from "../lib/mailbox";
import { submissionErrorMessage } from "../email-sender";

export function sendResult(c: Context<MailboxContext>, id: string, outcome: SendOutcome) {
  if (outcome.status === "accepted") {
    return c.json({ id, status: outcome.status, providerMessageId: outcome.messageId }, 202);
  }
  return c.json({ id, status: outcome.status, code: outcome.code, error: submissionErrorMessage(outcome) }, 502);
}
