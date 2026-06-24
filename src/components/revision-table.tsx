"use client";

import { useState } from "react";

type Revision = Record<string, unknown>;

export function RevisionTable({ revisions }: { revisions: Revision[] }) {
  const [message, setMessage] = useState("");
  const updateStatus = async (id: string, status: string) => {
    const response = await fetch(`/api/admin/revisions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const data = await response.json();
    setMessage(response.ok ? "Revision status updated." : data.error?.message ?? "Update failed.");
    if (response.ok) window.setTimeout(() => window.location.reload(), 500);
  };
  return (
    <>
      {message ? <p>{message}</p> : null}
      <table className="admin-table">
        <thead><tr><th>Created</th><th>Project</th><th>Status</th><th>Request</th><th>Action</th></tr></thead>
        <tbody>
          {revisions.map((revision) => (
            <tr key={String(revision.id)}>
              <td>{new Date(String(revision.created_at)).toLocaleString()}</td>
              <td>{String(revision.project_id)}</td>
              <td>{String(revision.status)}</td>
              <td>{String(revision.request_text)}</td>
              <td>
                <select value={String(revision.status)} onChange={(event) => updateStatus(String(revision.id), event.target.value)}>
                  <option value="requested">Requested</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
