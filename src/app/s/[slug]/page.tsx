import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandHeader } from "@/components/brand-header";
import { getProjectByShareSlug } from "@/lib/repository";
import { createSignedAssetUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectByShareSlug(slug);
  if (!project) return { title: "Private song" };
  return {
    title: `A VoiceGift for ${project.recipient_name}`,
    description: `Someone made ${project.recipient_name} an original personal song.`,
    robots: { index: false, follow: false }
  };
}

export default async function SharePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectByShareSlug(slug);
  if (!project || project.status !== "completed") notFound();
  const [audioUrl, videoUrl] = await Promise.all([
    createSignedAssetUrl(project.full_audio_path),
    createSignedAssetUrl(project.video_path)
  ]);
  return (
    <>
      <BrandHeader />
      <main className="share-page">
        <section className="share-card">
          <p className="kicker">Someone made you a song</p>
          <h1>For {project.recipient_name}</h1>
          <div className="song-cover"><div><small>an original VoiceGift for</small><strong>{project.recipient_name}</strong><small>{project.occasion.replaceAll("_", " ")}</small></div></div>
          {audioUrl?.includes("demo-audio.svg") ? <div className="mock-player"><button>▶</button><i /><small>Song demo</small></div> : <audio controls preload="metadata" src={audioUrl ?? undefined} style={{ width: "100%" }} />}
          {videoUrl ? <p><a className="button-dark" href={videoUrl}>Watch the lyric video</a></p> : null}
          <p style={{ color: "var(--muted)" }}>Made with a verified voice and original music.</p>
          <Link className="button" href="/#create">Make one with my voice →</Link>
        </section>
      </main>
    </>
  );
}
