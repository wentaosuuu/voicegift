"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    paypal?: {
      Buttons: (options: Record<string, unknown>) => { render: (element: HTMLElement) => Promise<void>; close?: () => void };
    };
  }
}

export function PayPalCheckout({
  clientId,
  projectId,
  token,
  onCompleted,
  mockMode = false
}: {
  clientId?: string;
  projectId: string;
  token: string;
  onCompleted: () => void;
  mockMode?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const renderedRef = useRef(false);

  useEffect(() => {
    if (!clientId || !containerRef.current || renderedRef.current) return;
    const renderButtons = async () => {
      if (!window.paypal || !containerRef.current || renderedRef.current) return;
      renderedRef.current = true;
      const buttons = window.paypal.Buttons({
        style: { layout: "vertical", shape: "pill", label: "paypal" },
        createOrder: async () => {
          const response = await fetch("/api/paypal/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-project-token": token },
            body: JSON.stringify({ projectId })
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error?.message ?? "Could not create payment");
          return data.id;
        },
        onApprove: async (data: { orderID: string }) => {
          const response = await fetch("/api/paypal/capture-order", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-project-token": token },
            body: JSON.stringify({ projectId, orderId: data.orderID })
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error?.message ?? "Could not confirm payment");
          onCompleted();
        },
        onError: (cause: Error) => setError(cause.message || "PayPal checkout failed")
      });
      await buttons.render(containerRef.current);
    };
    const existing = document.getElementById("paypal-sdk");
    if (existing) {
      if (window.paypal) void renderButtons();
      else existing.addEventListener("load", () => void renderButtons(), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = "paypal-sdk";
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture`;
    script.async = true;
    script.addEventListener("load", () => void renderButtons(), { once: true });
    script.addEventListener("error", () => setError("PayPal could not be loaded."));
    document.head.appendChild(script);
  }, [clientId, onCompleted, projectId, token]);

  const runMockCheckout = async () => {
    const create = await fetch("/api/paypal/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-project-token": token },
      body: JSON.stringify({ projectId })
    });
    const order = await create.json();
    const capture = await fetch("/api/paypal/capture-order", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-project-token": token },
      body: JSON.stringify({ projectId, orderId: order.id })
    });
    if (capture.ok) onCompleted();
    else setError((await capture.json()).error?.message ?? "Demo checkout failed");
  };

  if (mockMode) {
    return <button className="button button-full" onClick={runMockCheckout}>Complete demo payment →</button>;
  }
  if (!clientId) {
    return <p className="error-box">PayPal is not configured yet. Add the client ID to enable checkout.</p>;
  }
  return <>{error ? <div className="error-box">{error}</div> : null}<div ref={containerRef} /></>;
}
