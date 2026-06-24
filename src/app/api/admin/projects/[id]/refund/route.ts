import { getAdminUser } from "@/lib/auth";
import { apiError, noStoreJson } from "@/lib/http";
import { refundPayPalCapture } from "@/lib/paypal";
import { addAuditEvent, getProject, updateProject } from "@/lib/repository";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return apiError("Unauthorized.", 401, "UNAUTHORIZED");
  const { id } = await context.params;
  const project = await getProject(id);
  if (!project) return apiError("Project not found.", 404, "NOT_FOUND");
  if (project.payment_status === "refunded") return noStoreJson({ refunded: true, idempotent: true });
  if (project.payment_status !== "paid" || !project.paypal_capture_id) {
    return apiError("There is no captured payment to refund.", 409, "NOT_REFUNDABLE");
  }
  const refund = await refundPayPalCapture(project.paypal_capture_id, id);
  await updateProject(id, { payment_status: "refunded" });
  await addAuditEvent(id, "paypal_refund_created", {
    refundId: refund.id,
    admin: admin.email
  });
  return noStoreJson({ refunded: true, refundId: refund.id });
}
