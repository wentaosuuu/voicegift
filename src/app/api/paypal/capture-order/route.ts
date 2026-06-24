import { after } from "next/server";
import { startGeneration } from "@/lib/generation";
import { apiError, noStoreJson } from "@/lib/http";
import { capturePayPalOrder, getCaptureId, validateCapture } from "@/lib/paypal";
import { authorizeProject } from "@/lib/project-access";
import { addAuditEvent, updateProject } from "@/lib/repository";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { projectId?: string; orderId?: string };
    if (!body.projectId || !body.orderId) return apiError("Order details are required.", 422, "VALIDATION_ERROR");
    const auth = await authorizeProject(request, body.projectId);
    if (!auth) return apiError("Unauthorized.", 401, "UNAUTHORIZED");
    if (auth.project.paypal_order_id !== body.orderId) {
      return apiError("Order does not match the project.", 409, "ORDER_MISMATCH");
    }
    if (auth.project.payment_status === "paid") {
      return noStoreJson({ completed: true, idempotent: true });
    }
    const capture = await capturePayPalOrder(body.orderId, body.projectId);
    validateCapture(capture, body.projectId);
    const captureId = getCaptureId(capture, body.projectId);
    if (!captureId) throw new Error("PayPal capture id was missing");
    await updateProject(body.projectId, {
      status: "paid",
      payment_status: "paid",
      paypal_capture_id: captureId
    });
    await addAuditEvent(body.projectId, "paypal_payment_captured", { paypalOrderId: body.orderId });
    after(async () => {
      try {
        await startGeneration(body.projectId!, "full");
      } catch (error) {
        console.error("background full generation failed", error);
      }
    });
    return noStoreJson({ completed: true });
  } catch (error) {
    console.error("paypal capture failed", error);
    return apiError("Payment could not be confirmed.", 500, "PAYPAL_CAPTURE_FAILED");
  }
}
