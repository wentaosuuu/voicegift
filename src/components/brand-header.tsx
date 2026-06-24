import Link from "next/link";

export function BrandHeader({ onCreate }: { onCreate?: () => void }) {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <span className="brand-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
        VoiceGift
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/voice-safety">Voice safety</Link>
        <Link href="/privacy">Privacy</Link>
      </nav>
      {onCreate ? (
        <button className="button-dark" onClick={onCreate}>Start preview</button>
      ) : (
        <Link className="button-dark" href="/">Start preview</Link>
      )}
    </header>
  );
}
