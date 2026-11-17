import type { DeliveryStatus as RecipientStatus } from "shared/delivery";
import type { Email } from "~/types";

const labels: Record<RecipientStatus, string> = {
  queued: "Queued for delivery",
  delivered: "Accepted by recipient mail server",
  deferred: "Delayed; Cloudflare is retrying",
  bounced: "Bounced",
  failed: "Delivery failed",
  rejected: "Rejected",
  complained: "Marked as spam",
};

export default function DeliveryStatus({ email }: { email: Email }) {
  if (!email.send_status) return null;
  if (email.send_status !== "accepted") {
    return (
      <p className="text-kumo-subtle mt-2 text-xs break-words" role="status">
        {email.send_status === "sending"
          ? "Sending…"
          : email.send_status === "failed"
            ? "Sending failed."
            : "Send status unknown. Check Cloudflare's Activity log before retrying."}
        {email.send_error && ` ${email.send_error_code ? `${email.send_error_code}: ` : ""}${email.send_error}`}
      </p>
    );
  }

  const deliveries = email.deliveries ?? [];
  const failed = deliveries.filter(({ status }) => ["bounced", "failed", "rejected"].includes(status)).length;
  const delivered = deliveries.filter(({ status }) => status === "delivered").length;
  const complained = deliveries.some(({ status }) => status === "complained");
  const deferred = deliveries.some(({ status }) => status === "deferred");
  const summary = failed
    ? `Delivery failed for ${failed} of ${deliveries.length} recipients`
    : complained
      ? "Marked as spam"
      : delivered && delivered === deliveries.length
        ? "Accepted by recipient mail server"
        : deferred
          ? "Delivery delayed; Cloudflare is retrying"
          : "Queued for delivery";

  return (
    <details className="text-kumo-subtle mt-2 text-xs wrap-break-word">
      <summary className="cursor-pointer">
        <span role="status">{summary}</span>
      </summary>
      <ul className="mt-2 space-y-1" role="list">
        {deliveries.map((delivery) => (
          <li key={delivery.recipient}>
            {delivery.recipient}: {labels[delivery.status]}
            {delivery.reason && ` — ${delivery.reason}`}
            {delivery.smtp_code && ` (${delivery.smtp_code})`}
          </li>
        ))}
      </ul>
      <p className="mt-2">Message ID: {email.provider_message_id}</p>
    </details>
  );
}
