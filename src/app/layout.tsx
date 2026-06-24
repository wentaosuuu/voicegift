import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { assertLiveConfiguration } from "@/lib/config";

assertLiveConfiguration();

export const metadata: Metadata = {
  title: {
    default: "VoiceGift — A song that sounds like you",
    template: "%s · VoiceGift"
  },
  description: "Turn your memories and your own voice into an original personal song made to share.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "VoiceGift — A song that sounds like you",
    description: "You don’t need to sing. Your voice still can.",
    type: "website"
  },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="site-footer">
          <Link className="brand brand-inverse" href="/">
            <span className="brand-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
            VoiceGift
          </Link>
          <p>Original songs, made personal.</p>
          <nav aria-label="Footer">
            <Link href="/voice-safety">Voice safety</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
