"use client";

import { useState } from "react";
import { BrandHeader } from "@/components/brand-header";
import { SongStudio } from "@/components/song-studio";

export function LandingPage({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const [studioOpen, setStudioOpen] = useState(false);
  return (
    <>
      <BrandHeader onCreate={() => setStudioOpen(true)} />
      <main>
        <section className="one-screen">
          <div className="one-screen-copy">
            <p className="eyebrow">AI song gift · free preview first</p>
            <h1>Create a song gift with your own voice.</h1>
            <p className="one-screen-subtitle">
              Add a memory, record 20 seconds, and hear a private preview before paying.
            </p>
          </div>

          <div className="central-action-card" aria-label="Start creating a song gift">
            <div className="quick-steps" aria-label="How VoiceGift works">
              <span><b>1</b><strong>Add their name + memory</strong><small>A birthday, apology, anniversary, or inside joke.</small></span>
              <span><b>2</b><strong>Record 20 seconds</strong><small>No singing. Just read a phrase and hum.</small></span>
              <span><b>3</b><strong>Preview before paying</strong><small>Unlock only if the idea feels right.</small></span>
            </div>
            <button className="button primary-cta" onClick={() => setStudioOpen(true)}>Create a free preview →</button>
            <p>Free preview first · no singing needed · $9.99 only if you unlock the full MP3 + share page.</p>
          </div>
        </section>
      </main>
      <SongStudio open={studioOpen} onClose={() => setStudioOpen(false)} turnstileSiteKey={turnstileSiteKey} />
    </>
  );
}
