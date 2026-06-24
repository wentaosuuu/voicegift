import Link from "next/link";

export default function VoiceSafetyPage() {
  return (
    <main className="content-page">
      <p className="kicker">Safety by design</p>
      <h1>Your voice belongs to you.</h1>
      <p>VoiceGift is built for personal expression, not impersonation. The production flow contains technical and policy controls that must remain enabled.</p>
      <h2>Random phrase and liveness verification</h2>
      <p>Every project receives a short-lived random phrase. The configured verification provider checks spoken phrase matching, audio quality, a single speaker, and liveness indicators before generation can begin.</p>
      <h2>One-project voice use</h2>
      <p>The voice recording is bound to one project and one access token. It is never exposed as a selectable public voice or reusable voice model.</p>
      <h2>Original songs only</h2>
      <p>The application does not accept a commercial song upload. Provider requests explicitly prohibit living-artist imitation and require original composition.</p>
      <h2>Private by default</h2>
      <p>Audio is stored in a private bucket and delivered using expiring signed URLs. Public sharing requires an explicit action by the project owner and can be disabled later.</p>
      <h2>Deletion and retention</h2>
      <p>Users can delete a project immediately. A daily cleanup job removes expired source files and outputs after the configured retention window.</p>
      <p><Link className="button" href="/#create">Create a private song →</Link></p>
    </main>
  );
}
