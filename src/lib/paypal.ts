import { env, isMockMode } from "@/lib/config";

function paypalBaseUrl() {
  return env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function getPayPalToken() {
  if (!env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal credentials are not configured");
  }
  const credentials = Buffer.from(
    `${env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`PayPal authentication failed: ${response.status}`);
  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export async function createPayPalOrder(projectId: string) {
  if (isMockMode) return { id: `MOCK-${projectId}`, status: "CREATED" };
  const token = await getPayPalToken();
  const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `voicegift-create-${projectId}`
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: projectId,
          custom_id: projectId,
          description: "VoiceGift personalized original song",
          amount: {
            currency_code: env.PAYPAL_CURRENCY,
            value: env.PAYPAL_PRICE.toFixed(2)
          }
        }
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "VoiceGift",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            return_url: `${env.NEXT_PUBLIC_SITE_URL}/payment/success`,
            cancel_url: `${env.NEXT_PUBLIC_SITE_URL}/payment/cancelled`
          }
        }
      }
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`PayPal create order failed: ${response.status} ${JSON.stringify(data)}`);
  return data as { id: string; status: string };
}

export async function capturePayPalOrder(orderId: string, projectId: string) {
  if (isMockMode) {
    return {
      id: orderId,
      status: "COMPLETED",
      purchase_units: [{ reference_id: projectId, payments: { captures: [{ status: "COMPLETED" }] } }]
    };
  }
  const token = await getPayPalToken();
  const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `voicegift-capture-${projectId}`
    },
    body: "{}",
    cache: "no-store",
    signal: AbortSignal.timeout(20000)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`PayPal capture failed: ${response.status} ${JSON.stringify(data)}`);
  return data as {
    id: string;
    status: string;
    purchase_units: Array<{
      reference_id?: string;
      custom_id?: string;
      payments?: { captures?: Array<{ status?: string; amount?: { value?: string; currency_code?: string } }> };
    }>;
  };
}

export function validateCapture(capture: Awaited<ReturnType<typeof capturePayPalOrder>>, projectId: string) {
  const unit = capture.purchase_units?.find(
    (item) => item.reference_id === projectId || item.custom_id === projectId
  );
  const payment = unit?.payments?.captures?.[0];
  if (
    capture.status !== "COMPLETED" ||
    payment?.status !== "COMPLETED" ||
    (!isMockMode &&
      (payment.amount?.value !== env.PAYPAL_PRICE.toFixed(2) ||
        payment.amount?.currency_code !== env.PAYPAL_CURRENCY))
  ) {
    throw new Error("PayPal capture validation failed");
  }
}

export function getCaptureId(capture: Awaited<ReturnType<typeof capturePayPalOrder>>, projectId: string) {
  const unit = capture.purchase_units?.find(
    (item) => item.reference_id === projectId || item.custom_id === projectId
  );
  const captureItem = unit?.payments?.captures?.[0] as { id?: string } | undefined;
  return captureItem?.id ?? (isMockMode ? `MOCK-CAPTURE-${projectId}` : null);
}

export async function refundPayPalCapture(captureId: string, projectId: string) {
  if (isMockMode) return { id: `MOCK-REFUND-${projectId}`, status: "COMPLETED" };
  const token = await getPayPalToken();
  const response = await fetch(
    `${paypalBaseUrl()}/v2/payments/captures/${encodeURIComponent(captureId)}/refund`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `voicegift-refund-${projectId}`
      },
      body: JSON.stringify({
        amount: { value: env.PAYPAL_PRICE.toFixed(2), currency_code: env.PAYPAL_CURRENCY },
        note_to_payer: "VoiceGift refund"
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000)
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(`PayPal refund failed: ${response.status} ${JSON.stringify(data)}`);
  return data as { id: string; status: string };
}

export async function verifyPayPalWebhook(request: Request, event: unknown) {
  if (isMockMode) return true;
  if (!env.PAYPAL_WEBHOOK_ID) return false;
  const token = await getPayPalToken();
  const response = await fetch(`${paypalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: request.headers.get("paypal-auth-algo"),
      cert_url: request.headers.get("paypal-cert-url"),
      transmission_id: request.headers.get("paypal-transmission-id"),
      transmission_sig: request.headers.get("paypal-transmission-sig"),
      transmission_time: request.headers.get("paypal-transmission-time"),
      webhook_id: env.PAYPAL_WEBHOOK_ID,
      webhook_event: event
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) return false;
  const data = (await response.json()) as { verification_status?: string };
  return data.verification_status === "SUCCESS";
}
