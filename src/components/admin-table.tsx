"use client";

import { useState } from "react";
import type { Project } from "@/types/domain";

export function AdminTable({ projects }: { projects: Project[] }) {
  const [message, setMessage] = useState("");
  const retry = async (id: string) => {
    const response = await fetch(`/api/admin/projects/${id}/retry`, { method: "POST" });
    const data = await response.json();
    setMessage(response.ok ? `Retry started for ${id}.` : data.error?.message ?? "Retry failed.");
    if (response.ok) window.setTimeout(() => window.location.reload(), 600);
  };
  const refund = async (id: string) => {
    if (!window.confirm("Issue a full PayPal refund for this project?")) return;
    const response = await fetch(`/api/admin/projects/${id}/refund`, { method: "POST" });
    const data = await response.json();
    setMessage(response.ok ? `Refund completed for ${id}.` : data.error?.message ?? "Refund failed.");
    if (response.ok) window.setTimeout(() => window.location.reload(), 600);
  };
  return (
    <>
      {message ? <p>{message}</p> : null}
      <table className="admin-table">
        <thead><tr><th>Created</th><th>Recipient</th><th>Status</th><th>Payment</th><th>Email</th><th>Order</th><th>Action</th></tr></thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id}>
              <td>{new Date(project.created_at).toLocaleString()}</td>
              <td>{project.recipient_name}</td>
              <td>{project.status}</td>
              <td>{project.payment_status}</td>
              <td>{project.customer_email}</td>
              <td>{project.paypal_order_id ?? "—"}</td>
              <td>
                {project.status === "failed" ? <button className="button-dark" onClick={() => retry(project.id)}>Retry</button> : null}
                {project.payment_status === "paid" ? <button className="danger-button" onClick={() => refund(project.id)}>Refund</button> : null}
                {project.status !== "failed" && project.payment_status !== "paid" ? "—" : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
