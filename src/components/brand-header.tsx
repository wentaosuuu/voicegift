import Link from "next/link";

export function BrandHeader({ onCreate }: { onCreate?: () => void }) {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <span className="brand-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
        VoiceGift
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/#how">How it works</Link>
        <Link href="/#examples">Examples</Link>
        <Link href="/voice-safety">Your voice, protected</Link>
      </nav>
      {onCreate ? (
        <button className="button-dark" onClick={onCreate}>Make a song</button>
      ) : (
        <Link className="button-dark" href="/#create">Make a song</Link>
      )}
    </header>
  );
}
