import { noStoreJson } from "@/lib/http";
import { verifyPayPalWebhook } from "@/lib/paypal";
import { addAuditEvent, getProject, updateProject } from "@/lib/repository";
import { startGeneration } from "@/lib/generation";
import { env } from "@/lib/config";

type PayPalEvent = {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    custom_id?: string;
    supplementary_data?: { related_ids?: { order_id?: string } };
    amount?: { value?: string; currency_code?: string };
  };
};

export async function POST(request: Request) {
  const event = (await request.json()) as PayPalEvent;
  if (!(await verifyPayPalWebhook(request, event))) {
    return noStoreJson({ verified: false }, { status: 400 });
  }
  const projectId = event.resource?.custom_id;
  if (!projectId) return noStoreJson({ received: true });
  const project = await getProject(projectId);
  if (!project) return noStoreJson({ received: true });
  await addAuditEvent(projectId, `paypal_webhook:${event.event_type ?? "unknown"}`, {
    paypalEventId: event.id
  });
  if (
    event.event_type === "PAYMENT.CAPTURE.COMPLETED" &&
    project.payment_status !== "paid"
  ) {
    if (
      event.resource?.amount?.value !== env.PAYPAL_PRICE.toFixed(2) ||
      event.resource?.amount?.currency_code !== env.PAYPAL_CURRENCY
    ) {
      await addAuditEvent(projectId, "paypal_webhook_amount_rejected", {
        value: event.resource?.amount?.value,
        currency: event.resource?.amount?.currency_code
      });
      return noStoreJson({ error: "amount mismatch" }, { status: 409 });
    }
    await updateProject(projectId, {
      payment_status: "paid",
      status: "paid",
      paypal_capture_id: event.resource?.id ?? null,
      paypal_order_id:
        project.paypal_order_id ?? event.resource?.supplementary_data?.related_ids?.order_id ?? null
    });
    await startGeneration(projectId, "full");
  }
  if (event.event_type === "PAYMENT.CAPTURE.REFUNDED") {
    await updateProject(projectId, { payment_status: "refunded" });
  }
  return noStoreJson({ received: true });
}
