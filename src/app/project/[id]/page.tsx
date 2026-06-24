import { notFound } from "next/navigation";
import { BrandHeader } from "@/components/brand-header";
import { ProjectClient } from "@/components/project-client";
import { authorizeProjectToken } from "@/lib/project-access";
import { createSignedAssetUrl } from "@/lib/storage";
import { toPublicView } from "@/lib/repository";
import { cookies } from "next/headers";
import { isMockMode } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const [{ id }, query, cookieStore] = await Promise.all([params, searchParams, cookies()]);
  const token = query.t ?? cookieStore.get(`vg_${id}`)?.value;
  const project = await authorizeProjectToken(id, token);
  if (!project) notFound();
  const [previewUrl, fullAudioUrl, videoUrl] = await Promise.all([
    createSignedAssetUrl(project.preview_audio_path),
    createSignedAssetUrl(project.full_audio_path),
    createSignedAssetUrl(project.video_path)
  ]);
  return (
    <>
      <BrandHeader />
      <ProjectClient
        initialProject={toPublicView(project, { previewUrl, fullAudioUrl, videoUrl })}
        token={token!}
        paypalClientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}
        mockMode={isMockMode}
      />
    </>
  );
}
