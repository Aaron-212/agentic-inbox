import { z } from "zod";
import type { Env } from "./types";

const eventStatuses = ["delivered", "deferred", "bounced", "failed", "rejected", "complained"] as const;

const DeliveryEventSchema = z
  .object({
    type: z.string(),
    source: z.object({ type: z.literal("email.sending"), domain: z.string() }),
    payload: z.object({
      eventId: z.string().min(1),
      messageId: z.string().min(1),
      sender: z.email(),
      recipient: z.email(),
      terminal: z.boolean(),
      delivery: z.object({
        status: z.enum(eventStatuses),
        smtpStatusCode: z.string().optional(),
        smtpResponse: z.string().optional(),
      }),
      bounce: z.object({ reason: z.string().optional() }).optional(),
      failure: z.object({ reason: z.string().optional() }).optional(),
      rejection: z.object({ reason: z.string().optional(), detail: z.string().optional() }).optional(),
      complaint: z.object({ type: z.string().optional() }).optional(),
    }),
    metadata: z.object({ eventTimestamp: z.iso.datetime({ offset: true }) }),
  })
  .refine(
    (event) =>
      event.type === `cf.email.sending.message.${event.payload.delivery.status}` &&
      event.payload.terminal === (event.payload.delivery.status !== "deferred"),
  );

export type DeliveryEvent = z.infer<typeof DeliveryEventSchema>;

export async function consumeDeliveryEvents(batch: MessageBatch<unknown>, env: Env) {
  for (const message of batch.messages) {
    try {
      const event = DeliveryEventSchema.parse(message.body);
      const mailboxId = event.payload.sender.toLowerCase();
      // Domain subscriptions can include mail sent by other applications. Never create a mailbox for them.
      if (await env.BUCKET.head(`mailboxes/${mailboxId}.json`)) {
        const mailbox = env.MAILBOX.get(env.MAILBOX.idFromName(mailboxId));
        await mailbox.recordDeliveryEvent(event);
      }
      message.ack();
    } catch (error) {
      console.error("Email delivery event processing failed", { queueMessageId: message.id, error });
      // Invalid events also go to the dead-letter queue for inspection rather than disappearing silently.
      message.retry({ delaySeconds: 60 });
    }
  }
}
