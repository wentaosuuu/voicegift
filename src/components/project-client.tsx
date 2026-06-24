"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PayPalCheckout } from "@/components/paypal-checkout";
import type { ProjectPublicView, ProjectStatus } from "@/types/domain";

const processingStatuses = new Set(["preview_queued", "preview_generating", "paid", "full_queued", "full_generating"]);

export function ProjectClient({
  initialProject,
  token,
  paypalClientId,
  mockMode
}: {
  initialProject: ProjectPublicView;
  token: string;
  paypalClientId?: string;
  mockMode: boolean;
}) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [message, setMessage] = useState("");
  const [revisionText, setRevisionText] = useState("");
  const [busy, setBusy] = useState(false);
  const isMockAudio = (url: string | null) => Boolean(url?.includes("demo-audio.svg"));

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/projects/${project.id}`, {
      headers: { "x-project-token": token },
      cache: "no-store"
    });
    if (!response.ok) return;
    setProject(await response.json());
  }, [project.id, token]);
  const handlePaymentCompleted = useCallback(() => void refresh(), [refresh]);

  useEffect(() => {
    sessionStorage.setItem(`voicegift:${project.id}`, token);
    void fetch(`/api/projects/${project.id}/session`, {
      method: "POST",
      headers: { "x-project-token": token }
    }).then(() => {
      const clean = `/project/${project.id}`;
      window.history.replaceState({}, "", clean);
    });
  }, [project.id, token]);

  useEffect(() => {
    if (!processingStatuses.has(project.status)) return;
    const timer = window.setInterval(() => void refresh(), 3500);
    return () => window.clearInterval(timer);
  }, [project.status, refresh]);

  const statusLabel = useMemo(() => {
    const labels: Partial<Record<ProjectStatus, string>> = {
        preview_queued: "Preview queued",
        preview_generating: "Creating preview",
        preview_ready: "Preview ready",
        awaiting_payment: "Awaiting payment",
        paid: "Payment confirmed",
        full_queued: "Full song queued",
        full_generating: "Creating full song",
        completed: "Song ready",
        failed: "Needs attention",
        deleted: "Deleted"
    };
    return labels[project.status] ?? project.status.replaceAll("_", " ");
  }, [project.status]);

  const toggleShare = async () => {
    setBusy(true);
    const enabled = !project.shareUrl;
    const response = await fetch(`/api/projects/${project.id}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-project-token": token },
      body: JSON.stringify({ enabled })
    });
    const data = await response.json();
    if (response.ok) {
      setProject((current) => ({ ...current, shareUrl: data.shareUrl }));
      setMessage(enabled ? "Private share link enabled." : "Share link disabled.");
    } else setMessage(data.error?.message ?? "Could not update sharing.");
    setBusy(false);
  };

  const deleteProject = async () => {
    if (!window.confirm("Delete the song, voice recording, outputs, and personal details? This cannot be undone.")) return;
    setBusy(true);
    const response = await fetch(`/api/projects/${project.id}/delete`, {
      method: "POST",
      headers: { "x-project-token": token }
    });
    if (response.ok) router.replace("/");
    else {
      setMessage("Deletion failed. Contact support with your project id.");
      setBusy(false);
    }
  };

  const requestRevision = async () => {
    setBusy(true);
    const response = await fetch(`/api/projects/${project.id}/revision`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-project-token": token },
      body: JSON.stringify({ requestText: revisionText })
    });
    const data = await response.json();
    setMessage(response.ok ? "Revision request received. We’ll email you when it is ready." : data.error?.message ?? "Revision request failed.");
    if (response.ok) setRevisionText("");
    setBusy(false);
  };

  return (
    <main className="project-page">
      <section className="project-card">
        <span className="status-pill">{statusLabel}</span>
        <h1>{project.recipientName}’s VoiceGift</h1>
        <p style={{ color: "var(--muted)" }}>Your private project page. Audio links expire and refresh automatically.</p>
        <div className="song-cover"><div><small>an original song for</small><strong>{project.recipientName}</strong><small>{project.occasion.replaceAll("_", " ")}</small></div></div>

        {processingStatuses.has(project.status) ? (
          <div className="audio-card"><b>We’re making it.</b><p style={{ color: "var(--muted)", marginBottom: 0 }}>This page updates automatically. You can safely close it—we will email you when the next version is ready.</p></div>
        ) : null}

        {project.previewUrl ? (
          <div className="audio-card">
            <h3>Free 15-second preview</h3>
            {isMockAudio(project.previewUrl) ? <div className="mock-player"><button>▶</button><i /><small>Demo mode</small></div> : <audio controls preload="metadata" src={project.previewUrl} />}
          </div>
        ) : null}

        {project.status === "preview_ready" || project.status === "awaiting_payment" ? (
          <div className="purchase-card">
            <h3>Unlock the full song · $9.99</h3>
            <p style={{ color: "var(--muted)" }}>60–90 seconds, MP3, vertical lyric video, and one revision.</p>
            <PayPalCheckout clientId={paypalClientId} projectId={project.id} token={token} mockMode={mockMode} onCompleted={handlePaymentCompleted} />
          </div>
        ) : null}

        {project.status === "completed" ? (
          <div className="download-card">
            <h3>Your full song is ready</h3>
            {project.fullAudioUrl && !isMockAudio(project.fullAudioUrl) ? <audio controls preload="metadata" src={project.fullAudioUrl} /> : <div className="mock-player"><button>▶</button><i /><small>Full song demo</small></div>}
            <div className="project-actions">
              {project.fullAudioUrl ? <a className="button" href={project.fullAudioUrl} download>Download MP3</a> : null}
              {project.videoUrl ? <a className="button-dark" href={project.videoUrl} download>Download lyric video</a> : null}
              <button className="text-button" disabled={busy} onClick={toggleShare}>{project.shareUrl ? "Disable share link" : "Create share link"}</button>
            </div>
            {project.shareUrl ? <p>Share: <a href={project.shareUrl} target="_blank" rel="noreferrer">{project.shareUrl}</a></p> : null}
          </div>
        ) : null}

        {project.status === "completed" ? (
          <div className="audio-card">
            <h3>One revision is included</h3>
            <label className="field">Tell us what to change
              <textarea value={revisionText} onChange={(event) => setRevisionText(event.target.value)} maxLength={500} placeholder="Make the chorus warmer, or replace the line about…" />
            </label>
            <button className="button-dark" disabled={busy || revisionText.trim().length < 5} onClick={requestRevision}>Request revision</button>
          </div>
        ) : null}

        {project.lyrics ? <details><summary><b>View lyrics</b></summary><pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{project.lyrics}</pre></details> : null}
        {project.status === "failed" ? <div className="error-box">{project.errorMessage ?? "Generation failed. The administrator can retry this job."}</div> : null}
        {message ? <p>{message}</p> : null}
        <div className="project-actions"><button className="danger-button" disabled={busy} onClick={deleteProject}>Delete my data</button></div>
      </section>
    </main>
  );
}
