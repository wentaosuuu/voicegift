import type { Project } from "@/types/domain";

type Generation = {
  id: string;
  project_id: string;
  kind: "preview" | "full";
  stage: string;
  status: string;
  provider_job_id?: string | null;
  created_at: string;
};

type MockData = {
  projects: Map<
    string,
    Project & {
      access_token_hash: string;
      access_token_ciphertext: string;
      voice_verified_at: string | null;
    }
  >;
  generations: Generation[];
  events: Array<Record<string, unknown>>;
  revisions: Array<Record<string, unknown>>;
};

declare global {
  var __voiceGiftMockData: MockData | undefined;
}

export const mockData: MockData =
  globalThis.__voiceGiftMockData ??
  (globalThis.__voiceGiftMockData = {
    projects: new Map(),
    generations: [],
    events: [],
    revisions: []
  });
