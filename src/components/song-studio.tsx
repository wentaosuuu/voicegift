"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TurnstileWidget } from "@/components/turnstile-widget";
import type { MusicStyle, Occasion } from "@/types/domain";

const styles: Array<{ value: MusicStyle; label: string; note: string; icon: string }> = [
  { value: "warm_pop", label: "Warm pop", note: "Bright & heartfelt", icon: "☀" },
  { value: "acoustic", label: "Acoustic", note: "Intimate & honest", icon: "♩" },
  { value: "playful_rap", label: "Playful rap", note: "Funny & energetic", icon: "★" },
  { value: "dreamy", label: "Dreamy", note: "Soft & cinematic", icon: "☾" }
];

function normalizedContentType(file: File) {
  const type = file.type.split(";")[0];
  if (["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/webm", "audio/ogg"].includes(type)) {
    return type;
  }
  return "audio/webm";
}

export function SongStudio({
  open,
  onClose,
  presentation = "modal",
  turnstileSiteKey
}: {
  open: boolean;
  onClose: () => void;
  presentation?: "modal" | "inline";
  turnstileSiteKey?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [recipientName, setRecipientName] = useState("");
  const [occasion, setOccasion] = useState<Occasion>("birthday");
  const [memory, setMemory] = useState("");
  const [message, setMessage] = useState("");
  const [musicStyle, setMusicStyle] = useState<MusicStyle>("warm_pop");
  const [email, setEmail] = useState("");
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [challenge, setChallenge] = useState<{ phrase: string; token: string } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeProject, setActiveProject] = useState<{
    projectId: string;
    accessToken: string;
    projectUrl: string;
  } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const receiveTurnstileToken = useCallback((token: string) => setTurnstileToken(token), []);

  useEffect(() => {
    if (open && step === 3 && !challenge) {
      fetch("/api/voice-challenge", { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error("Could not load verification phrase");
          return response.json();
        })
        .then(setChallenge)
        .catch((cause: Error) => setError(cause.message));
    }
  }, [challenge, open, step]);

  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!open) {
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    }
  }, [open]);

  if (!open) return null;

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setVoiceFile(new File([blob], "voice-verification.webm", { type: "audio/webm" }));
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
      });
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone access was not available. You can upload a recording instead.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
  };

  const createPreview = async () => {
    if (!voiceFile || !challenge || !consent) return;
    setBusy(true);
    setError("");
    try {
      let created = activeProject;
      const createProject = async () => {
        const createResponse = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientName,
            occasion,
            memory,
            message,
            musicStyle,
            customerEmail: email,
            consent: true,
            turnstileToken
          })
        });
        const createdData = await createResponse.json();
        if (!createResponse.ok) throw new Error(createdData.error?.message ?? "Could not create the project");
        setActiveProject(createdData);
        return createdData as { projectId: string; accessToken: string; projectUrl: string };
      };
      if (!created) created = await createProject();
      if (!created) throw new Error("Could not initialize the project");
      const headers = { "Content-Type": "application/json", "x-project-token": created.accessToken };
      let uploadResponse = await fetch(`/api/projects/${created.projectId}/upload`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          fileName: voiceFile.name,
          contentType: normalizedContentType(voiceFile),
          size: voiceFile.size
        })
      });
      if (uploadResponse.status === 401 && activeProject) {
        setActiveProject(null);
        created = await createProject();
        uploadResponse = await fetch(`/api/projects/${created.projectId}/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-project-token": created.accessToken },
          body: JSON.stringify({
            fileName: voiceFile.name,
            contentType: normalizedContentType(voiceFile),
            size: voiceFile.size
          })
        });
      }
      const upload = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(upload.error?.message ?? "Could not prepare upload");
      const projectHeaders = { "Content-Type": "application/json", "x-project-token": created.accessToken };

      if (upload.mock) {
        const result = await fetch(upload.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": normalizedContentType(voiceFile) },
          body: voiceFile
        });
        if (!result.ok) throw new Error("Voice upload failed");
      } else {
        const supabase = createClient(upload.supabaseUrl, upload.supabaseKey);
        const { error: uploadError } = await supabase.storage
          .from(upload.bucket)
          .uploadToSignedUrl(upload.path, upload.token, voiceFile, {
            contentType: normalizedContentType(voiceFile)
          });
        if (uploadError) throw uploadError;
      }

      const verifiedResponse = await fetch(`/api/projects/${created.projectId}/voice-complete`, {
        method: "POST",
        headers: projectHeaders,
        body: JSON.stringify({ path: upload.path, challengeToken: challenge.token })
      });
      const verified = await verifiedResponse.json();
      if (!verifiedResponse.ok) throw new Error(verified.error?.message ?? "Voice verification failed");

      const previewResponse = await fetch(`/api/projects/${created.projectId}/start-preview`, {
        method: "POST",
        headers: projectHeaders
      });
      const preview = await previewResponse.json();
      if (!previewResponse.ok) throw new Error(preview.error?.message ?? "Preview generation failed");
      router.push(created.projectUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
      setBusy(false);
    }
  };

  const nextFromDetails = () => {
    if (!recipientName.trim() || memory.trim().length < 10 || !email.includes("@")) {
      setError("Add their name, a real memory, and your email to continue.");
      return;
    }
    setError("");
    setStep(2);
  };

  const studioContent = (
      <section className={`studio ${presentation === "inline" ? "studio-inline" : ""}`}>
        <button className="close-button" onClick={onClose} aria-label="Close">×</button>
        <div className="progress" aria-label={`Step ${step} of 4`}>
          {[1, 2, 3, 4].map((item) => <i className={item <= step ? "active" : ""} key={item} />)}
        </div>
        {busy ? (
          <div className="loading-view">
            <div className="loading-orb">♫</div>
            <p className="kicker">Creating your private preview</p>
            <h2>Turning your story into a song…</h2>
            <p className="studio-intro">Writing the chorus, shaping the melody, and matching your verified voice.</p>
          </div>
        ) : null}

        {!busy && step === 1 ? (
          <>
            <p className="kicker">Step 1 of 4</p>
            <h2>Who is this song for?</h2>
            <p className="studio-intro">Real details make the song feel like only you could have made it.</p>
            <label className="field">Their first name
              <input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} maxLength={60} placeholder="e.g. Emma" />
            </label>
            <div className="choice-grid">
              {([
                ["birthday", "🎂 Birthday"],
                ["anniversary", "♥ Anniversary"],
                ["friendship", "☀ Friendship"],
                ["just_because", "🎉 Just because"]
              ] as Array<[Occasion, string]>).map(([value, label]) => (
                <button className={`choice ${occasion === value ? "selected" : ""}`} onClick={() => setOccasion(value)} key={value}>{label}</button>
              ))}
            </div>
            <label className="field">One memory or inside joke
              <textarea value={memory} onChange={(event) => setMemory(event.target.value)} maxLength={1500} placeholder="We missed our flight to Lisbon because we were eating airport tacos…" />
            </label>
            <label className="field">What do you want them to feel? <span style={{ opacity: .45 }}>(optional)</span>
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} placeholder="I want them to know I’ll always show up for them." />
            </label>
            <label className="field">Where should we send the private link?
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            </label>
            {error ? <div className="error-box">{error}</div> : null}
            <button className="button button-full" onClick={nextFromDetails}>Choose the sound →</button>
          </>
        ) : null}

        {!busy && step === 2 ? (
          <>
            <p className="kicker">Step 2 of 4</p>
            <h2>How should it feel?</h2>
            <p className="studio-intro">Pick a starting point. One style revision is included after the preview.</p>
            <div className="choice-grid">
              {styles.map((item) => (
                <button className={`choice ${musicStyle === item.value ? "selected" : ""}`} onClick={() => setMusicStyle(item.value)} key={item.value}>
                  <span style={{ fontSize: 25 }}>{item.icon}</span><b>{item.label}</b><small>{item.note}</small>
                </button>
              ))}
            </div>
            <div className="studio-nav">
              <button className="text-button" onClick={() => setStep(1)}>← Back</button>
              <button className="button" onClick={() => setStep(3)}>Add your voice →</button>
            </div>
          </>
        ) : null}

        {!busy && step === 3 ? (
          <>
            <p className="kicker">Step 3 of 4</p>
            <h2>Let us hear you.</h2>
            <p className="studio-intro">Read the phrase naturally, then hum a few comfortable notes.</p>
            <div className="voice-challenge">
              <b>🔒 Your verification phrase</b><br />
              “{challenge?.phrase ?? "Preparing a private phrase…"}”
            </div>
            <button className={`record-panel ${recording ? "recording" : ""}`} onClick={recording ? stopRecording : startRecording} disabled={!challenge}>
              <span className="record-dot" /><b>{recording ? "Stop and use recording" : voiceFile ? "Record again" : "Start recording"}</b>
              <small>{voiceFile ? `${voiceFile.name} · ready` : "Aim for 20–30 seconds"}</small>
            </button>
            <label className="upload-box">
              <input type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/webm,audio/ogg" onChange={(event) => setVoiceFile(event.target.files?.[0] ?? null)} />
              <b>Or upload the same phrase and a short hum</b>
              <small>MP3, M4A, WAV, WebM or OGG · up to 20MB</small>
            </label>
            <label className="consent-row">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              <span>I confirm this is my voice, I am at least 18, and I consent to creating this private original song under the Voice Consent Terms.</span>
            </label>
            <TurnstileWidget siteKey={turnstileSiteKey} onToken={receiveTurnstileToken} />
            {error ? <div className="error-box">{error}</div> : null}
            <div className="studio-nav">
              <button className="text-button" onClick={() => setStep(2)}>← Back</button>
              <button className="button" disabled={!voiceFile || !consent || !challenge} onClick={createPreview}>Create free preview →</button>
            </div>
          </>
        ) : null}
      </section>
  );

  if (presentation === "inline") {
    return (
      <div className="inline-studio-shell" aria-label="Create a VoiceGift song">
        {studioContent}
      </div>
    );
  }

  return (
    <div className="modal-shell" role="dialog" aria-modal="true" aria-label="Create a VoiceGift song">
      {studioContent}
    </div>
  );
}
