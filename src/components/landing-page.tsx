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
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">The birthday card they’ll replay</p>
            <h1>You don’t need to sing.<br /><em>Your voice still can.</em></h1>
            <p>Turn a few memories and 20 seconds of your voice into a one-of-a-kind original song for someone you love.</p>
            <div className="hero-actions">
              <button className="button" onClick={() => setStudioOpen(true)}>Make their song →</button>
              <a className="text-button" href="#examples">▶ Hear examples</a>
            </div>
            <div className="hero-proof">
              <div className="avatar-stack" aria-hidden="true"><span>J</span><span>M</span><span>A</span></div>
              <div><strong>Made for real people, not perfect singers.</strong><small>Private by default · No subscription · Original music only</small></div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="orbit" /><div className="orbit" />
            <div className="phone">
              <div className="gift-label">A song from Jamie</div>
              <div className="cover-art"><div className="cover-copy"><small>for</small><strong>Emma</strong><p>Twenty-nine looks good on you</p></div></div>
              <div className="mini-player"><button className="round-play" aria-label="Play demo">▶</button><div className="track-meta"><strong>Emma’s Birthday Song</strong><span className="wave" /></div><small>0:42</small></div>
              <button className="share-demo">Share this surprise ↗</button>
            </div>
            <span className="floating float-one">1.2K ♥</span><span className="floating float-two">“Wait… is that YOU?”</span>
          </div>
        </section>

        <section className="occasion-strip">
          <p>Made for moments that deserve more than a text</p>
          <div><span>🎂 Birthdays</span><span>💍 Weddings</span><span>♥ Anniversaries</span><span>☀ Friendship</span></div>
        </section>

        <section className="section" id="examples">
          <div className="section-heading"><p className="kicker">Listen before you believe it</p><h2>Small stories. Surprisingly personal songs.</h2><p>Each starts with a real memory and a verified voice recording.</p></div>
          <div className="story-grid">
            {[
              ["Birthday · Indie pop", "J → E", "“Twenty-nine looks good on you”", "Inside jokes, late-night tacos, and a voice Emma recognized instantly."],
              ["Anniversary · Acoustic", "N + S", "“Still choosing you”", "A quiet love song built from one first date and twelve years together."],
              ["Best friend · Playful rap", "M ★ K", "“Queen of bad decisions”", "A chaotic tribute to missed flights, voice notes, and ten years of friendship."]
            ].map(([tag, initials, title, text]) => (
              <article className="story-card" key={title}>
                <div className="story-art"><span className="story-tag">{tag}</span>{initials}</div>
                <div className="story-body"><h3>{title}</h3><p>{text}</p><button className="sample-button">▶ Play sample preview</button></div>
              </article>
            ))}
          </div>
        </section>

        <section className="section how" id="how">
          <div className="section-heading"><p className="kicker">From your story to their song</p><h2>Three steps. Zero singing required.</h2></div>
          <div className="steps">
            <article><div className="step-icon">✎</div><h3>Tell us about them</h3><p>Share their name, a favorite memory, and what you wish you could say.</p></article><div className="step-line" />
            <article><div className="step-icon">♬</div><h3>Lend us your voice</h3><p>Read a random phrase and hum a few notes so we can verify it is really you.</p></article><div className="step-line" />
            <article><div className="step-icon">♫</div><h3>Send the surprise</h3><p>Hear the free preview, unlock the full song, then download or share privately.</p></article>
          </div>
        </section>

        <section className="section" id="create">
          <div className="pricing-card">
            <div><p className="kicker">One song. One simple price.</p><h2 className="large-heading">A gift that sounds like you.</h2><p>Get a 60–90 second original song, personalized lyrics, your verified voice, and a share-ready vertical video.</p><ul><li>✓ Free 15-second preview</li><li>✓ One style or lyric revision</li><li>✓ MP3 + vertical lyric video</li><li>✓ Source voice deleted automatically</li></ul></div>
            <div className="price-box"><small>One-time purchase</small><div className="price"><sup>$</sup>9<sup>99</sup></div><p>No subscription. No hidden credits.</p><button className="button button-full" onClick={() => setStudioOpen(true)}>Make their song →</button></div>
          </div>
        </section>

        <section className="section safety">
          <div className="safety-visual"><div className="shield">♥</div></div>
          <div><p className="kicker">Your voice belongs to you</p><h2 className="large-heading">Made for memories.<br />Not impersonation.</h2><p style={{ color: "var(--muted)", lineHeight: 1.7 }}>We verify the voice is yours, never publish it as a reusable model, and delete source recordings. Every song uses original music—not someone else’s uploaded track.</p><div className="trust-grid"><span><b>01</b> Random phrase verification</span><span><b>02</b> Private by default</span><span><b>03</b> Delete anytime</span><span><b>04</b> Original music only</span></div></div>
        </section>

        <section className="final-cta"><p className="kicker" style={{ color: "white" }}>Some feelings deserve their own chorus</p><h2>Whose day could you make?</h2><button className="button-light" onClick={() => setStudioOpen(true)}>Make a song with your voice →</button></section>
      </main>
      <SongStudio open={studioOpen} onClose={() => setStudioOpen(false)} turnstileSiteKey={turnstileSiteKey} />
    </>
  );
}
