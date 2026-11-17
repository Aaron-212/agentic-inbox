export type SendStatus = "sending" | "accepted" | "failed" | "unknown";

export type DeliveryStatus = "queued" | "delivered" | "deferred" | "bounced" | "failed" | "rejected" | "complained";

export interface RecipientDelivery {
  recipient: string;
  status: DeliveryStatus;
  reason: string | null;
  smtp_code: string | null;
  updated_at: number;
}

export interface EmailDelivery {
  send_status?: SendStatus | null;
  provider_message_id?: string | null;
  send_error_code?: string | null;
  send_error?: string | null;
  deliveries?: RecipientDelivery[];
}

export type SendOutcome =
  | { status: "accepted"; messageId: string }
  | { status: "failed" | "unknown"; code: string | null; error: string };

export function isDeliveryPending(email: EmailDelivery) {
  return (
    email.send_status === "sending" ||
    (email.send_status === "accepted" &&
      (!email.deliveries?.length ||
        email.deliveries.some(({ status }) => status === "queued" || status === "deferred")))
  );
}
