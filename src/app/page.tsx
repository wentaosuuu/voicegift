import { LandingPage } from "@/components/landing-page";

export default function HomePage() {
  return <LandingPage turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />;
}
