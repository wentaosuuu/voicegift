import { apiError, noStoreJson } from "@/lib/http";
import { createPayPalOrder } from "@/lib/paypal";
import { authorizeProject } from "@/lib/project-access";
import { addAuditEvent, updateProject } from "@/lib/repository";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { projectId?: string };
    if (!body.projectId) return apiError("Project id is required.", 422, "VALIDATION_ERROR");
    const auth = await authorizeProject(request, body.projectId);
    if (!auth) return apiError("Unauthorized.", 401, "UNAUTHORIZED");
    if (!["preview_ready", "awaiting_payment"].includes(auth.project.status)) {
      return apiError("The preview is not ready for purchase.", 409, "INVALID_STATE");
    }
    if (auth.project.payment_status === "paid") {
      return noStoreJson({ id: auth.project.paypal_order_id, alreadyPaid: true });
    }
    const order = await createPayPalOrder(body.projectId);
    await updateProject(body.projectId, {
      status: "awaiting_payment",
      payment_status: "created",
      paypal_order_id: order.id
    });
    await addAuditEvent(body.projectId, "paypal_order_created", { paypalOrderId: order.id });
    return noStoreJson({ id: order.id });
  } catch (error) {
    console.error("paypal create order failed", error);
    return apiError("Could not create the PayPal order.", 500, "PAYPAL_CREATE_FAILED");
  }
}
