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
            <p className="eyebrow">Personal song gift · made with your voice</p>
            <h1>Give them a song that sounds like you.</h1>
            <p className="one-screen-subtitle">
              Type one memory, record 20 seconds of your voice, get a private original song to download or share.
            </p>
            <div className="hero-actions">
              <button className="button" onClick={() => setStudioOpen(true)}>Start with a free preview →</button>
              <span className="micro-note">$9.99 to unlock the full song</span>
            </div>
            <div className="proof-grid" aria-label="Product promises">
              <span><b>15 sec</b> free preview</span>
              <span><b>No singing</b> just read + hum</span>
              <span><b>Private</b> source voice expires</span>
            </div>
          </div>

          <div className="instant-card" aria-label="Create a VoiceGift preview">
            <div className="instant-card-top">
              <div>
                <p className="kicker">Create in one flow</p>
                <h2>Your first preview starts here</h2>
              </div>
              <div className="price-badge">$9.99</div>
            </div>

            <div className="preview-form">
              <label>
                Their name
                <span>Emma</span>
              </label>
              <label>
                Occasion
                <span>🎂 Birthday</span>
              </label>
              <label className="wide">
                Memory
                <span>Airport tacos, missed flights, and the laugh you still remember.</span>
              </label>
            </div>

            <div className="mini-player compact-player">
              <button className="round-play" aria-label="Play demo preview">▶</button>
              <div className="track-meta">
                <strong>Emma’s Birthday Song</strong>
                <span className="wave" />
              </div>
              <small>0:15</small>
            </div>

            <button className="button button-full" onClick={() => setStudioOpen(true)}>Create my preview →</button>
            <p className="card-footnote">Original music only · voice verification required · no subscription</p>
          </div>
        </section>
      </main>
      <SongStudio open={studioOpen} onClose={() => setStudioOpen(false)} turnstileSiteKey={turnstileSiteKey} />
    </>
  );
}
