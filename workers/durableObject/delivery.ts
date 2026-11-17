import type { RecipientDelivery, SendOutcome } from "shared/delivery";
import { sendEmail, type SendEmailParams } from "../email-sender";
import type { DeliveryEvent } from "../delivery-events";

/** Stores provider outcomes independently so events can arrive before send() returns. */
export class DeliveryStore {
  constructor(
    private storage: DurableObjectStorage,
    private binding: SendEmail,
  ) {}

  async send(id: string, params: SendEmailParams): Promise<SendOutcome> {
    const sql = this.storage.sql;
    const email = sql
      .exec<{ send_status: string | null }>("SELECT send_status FROM emails WHERE id = ?", id)
      .toArray()[0];
    if (!email || email.send_status !== "sending") throw new Error("Email is not awaiting submission");
    // Prevent a second RPC from submitting this same record while send() yields.
    sql.exec("UPDATE emails SET send_status = 'unknown' WHERE id = ?", id);

    let result: { messageId: string };
    try {
      result = await sendEmail(this.binding, params);
    } catch (error) {
      const code = error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : null;
      const detail = error instanceof Error ? error.message : "Email submission failed";
      // An unclassified failure may have happened after provider acceptance. Do not promise a safe retry.
      const status = code ? "failed" : "unknown";
      sql.exec(
        "UPDATE emails SET send_status = ?, send_error_code = ?, send_error = ? WHERE id = ?",
        status,
        code,
        detail,
        id,
      );
      console.error("Email submission failed", { emailId: id, code, error: detail });
      return { status, code, error: detail };
    }

    this.storage.transactionSync(() => {
      sql.exec(
        "UPDATE emails SET send_status = 'accepted', provider_message_id = ? WHERE id = ?",
        result.messageId,
        id,
      );
      for (const recipient of new Set(
        [params.to, params.cc, params.bcc].flatMap((value) =>
          value ? (Array.isArray(value) ? value : [value]).map((address) => address.toLowerCase()) : [],
        ),
      )) {
        sql.exec(
          `INSERT INTO email_deliveries (provider_message_id, recipient, status, updated_at, terminal, received_at)
          VALUES (?, ?, 'queued', 0, 0, ?) ON CONFLICT DO NOTHING`,
          result.messageId,
          recipient,
          Date.now(),
        );
      }
    });
    return { status: "accepted", messageId: result.messageId };
  }

  record(event: DeliveryEvent) {
    const { payload } = event;
    const reason =
      payload.bounce?.reason ??
      payload.failure?.reason ??
      payload.rejection?.detail ??
      payload.rejection?.reason ??
      payload.complaint?.type ??
      payload.delivery.smtpResponse ??
      null;
    this.storage.sql.exec(
      `
      INSERT INTO email_deliveries
        (provider_message_id, recipient, status, reason, smtp_code, updated_at, terminal, received_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(provider_message_id, recipient) DO UPDATE SET
        status = excluded.status, reason = excluded.reason, smtp_code = excluded.smtp_code,
        updated_at = excluded.updated_at, terminal = excluded.terminal, received_at = excluded.received_at
      WHERE excluded.terminal > email_deliveries.terminal OR
        (excluded.terminal = email_deliveries.terminal AND excluded.updated_at > email_deliveries.updated_at)
    `,
      payload.messageId,
      payload.recipient.toLowerCase(),
      payload.delivery.status,
      reason,
      payload.delivery.smtpStatusCode ?? null,
      Date.parse(event.metadata.eventTimestamp),
      Number(payload.terminal),
      Date.now(),
    );
  }

  get(providerId: string | null): RecipientDelivery[] {
    if (!providerId) return [];
    return this.storage.sql
      .exec<RecipientDelivery & Record<string, SqlStorageValue>>(
        "SELECT recipient, status, reason, smtp_code, updated_at FROM email_deliveries WHERE provider_message_id = ? ORDER BY recipient",
        providerId,
      )
      .toArray();
  }

  getForThread(threadId: string) {
    const rows = this.storage.sql
      .exec<RecipientDelivery & { provider_message_id: string } & Record<string, SqlStorageValue>>(
        `
      SELECT d.provider_message_id, d.recipient, d.status, d.reason, d.smtp_code, d.updated_at
      FROM email_deliveries d JOIN emails e ON e.provider_message_id = d.provider_message_id
      WHERE e.thread_id = ? ORDER BY d.recipient`,
        threadId,
      )
      .toArray();
    const deliveries = new Map<string, RecipientDelivery[]>();
    for (const { provider_message_id, ...delivery } of rows) {
      const list = deliveries.get(provider_message_id) ?? [];
      list.push(delivery);
      deliveries.set(provider_message_id, list);
    }
    return deliveries;
  }

  cleanup(now: number) {
    this.storage.sql.exec(
      `DELETE FROM email_deliveries WHERE received_at < ?
      AND NOT EXISTS (SELECT 1 FROM emails WHERE emails.provider_message_id = email_deliveries.provider_message_id)`,
      now - 30 * 24 * 60 * 60 * 1000,
    );
  }
}
