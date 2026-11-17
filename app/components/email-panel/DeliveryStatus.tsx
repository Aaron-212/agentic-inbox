import { m } from "shared/paraglide/messages.js";
import type { DeliveryStatus as RecipientStatus } from "shared/delivery";
import type { Email } from "~/types";

const getLabels = (): Record<RecipientStatus, string> => ({
  queued: m.queued(),
  delivered: m.delivered(),
  deferred: m.deferred(),
  bounced: m.bounced(),
  failed: m.delivery_failed(),
  rejected: m.rejected(),
  complained: m.complained(),
});

export default function DeliveryStatus({ email }: { email: Email }) {
  if (!email.send_status) return null;
  if (email.send_status !== "accepted") {
    return (
      <p className="text-kumo-subtle mt-2 text-xs wrap-break-word" role="status">
        {email.send_status === "sending"
          ? m.sending_status()
          : email.send_status === "failed"
            ? m.sending_failed()
            : m.send_status_unknown()}
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
    ? m.delivery_failed_count({ failed, count: deliveries.length })
    : complained
      ? m.complained()
      : delivered && delivered === deliveries.length
        ? m.delivered()
        : deferred
          ? m.delivery_delayed()
          : m.queued();

  return (
    <details className="text-kumo-subtle mt-2 text-xs wrap-break-word">
      <summary className="cursor-pointer">
        <span role="status">{summary}</span>
      </summary>
      <ul className="mt-2 space-y-1" role="list">
        {deliveries.map((delivery) => (
          <li key={delivery.recipient}>
            {delivery.recipient}: {getLabels()[delivery.status]}
            {delivery.reason && ` — ${delivery.reason}`}
            {delivery.smtp_code && ` (${delivery.smtp_code})`}
          </li>
        ))}
      </ul>
      <p className="mt-2">{m.message_id({ id: email.provider_message_id || "" })}</p>
    </details>
  );
}
