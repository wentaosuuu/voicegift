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
            <p className="eyebrow">AI song gift · made from your own voice</p>
            <h1>Turn your voice into a personal song gift.</h1>
            <p className="one-screen-subtitle">
              Write who it is for, record a short voice sample, and get a private original song preview you can unlock, download, or share.
            </p>

            <div className="central-action-card" aria-label="Start creating a song gift">
              <button className="button primary-cta" onClick={() => setStudioOpen(true)}>Create a free preview →</button>
              <div className="quick-steps">
                <span><b>1</b> Add their name + memory</span>
                <span><b>2</b> Record 20 seconds</span>
                <span><b>3</b> Preview before paying</span>
              </div>
              <p>$9.99 only if you want the full MP3 + share page.</p>
            </div>
          </div>

          <div className="instant-card" aria-label="Create a VoiceGift preview">
            <div className="instant-card-top">
              <div>
                <p className="kicker">What you get</p>
                <h2>A short custom song in your voice</h2>
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

          <div className="proof-grid" aria-label="Product promises">
            <span><b>Free preview</b> hear the idea first</span>
            <span><b>No singing</b> just read + hum</span>
            <span><b>Private</b> source voice expires</span>
          </div>
        </section>
      </main>
      <SongStudio open={studioOpen} onClose={() => setStudioOpen(false)} turnstileSiteKey={turnstileSiteKey} />
    </>
  );
}
