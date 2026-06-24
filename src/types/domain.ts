export const PROJECT_STATUSES = [
  "draft",
  "uploading",
  "preview_queued",
  "preview_generating",
  "preview_ready",
  "awaiting_payment",
  "paid",
  "full_queued",
  "full_generating",
  "completed",
  "failed",
  "deletion_requested",
  "deleted"
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type Occasion = "birthday" | "anniversary" | "friendship" | "just_because";
export type MusicStyle = "warm_pop" | "acoustic" | "playful_rap" | "dreamy";
export type GenerationKind = "preview" | "full";
export type GenerationStage = "lyrics" | "music" | "voice" | "video" | "complete";

export interface Project {
  id: string;
  status: ProjectStatus;
  recipient_name: string;
  occasion: Occasion;
  memory: string;
  message: string | null;
  music_style: MusicStyle;
  customer_email: string;
  consent_version: string;
  voice_path: string | null;
  preview_audio_path: string | null;
  full_audio_path: string | null;
  video_path: string | null;
  lyrics: string | null;
  share_slug: string | null;
  share_enabled: boolean;
  payment_status: "unpaid" | "created" | "paid" | "refunded";
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface ProjectPublicView {
  id: string;
  status: ProjectStatus;
  recipientName: string;
  occasion: Occasion;
  musicStyle: MusicStyle;
  paymentStatus: Project["payment_status"];
  previewUrl: string | null;
  fullAudioUrl: string | null;
  videoUrl: string | null;
  lyrics: string | null;
  shareUrl: string | null;
  errorMessage: string | null;
}
