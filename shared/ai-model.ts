// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

export const DEFAULT_AI_MODELS = {
  assistant: "@cf/moonshotai/kimi-k2.5",
  replies: "@cf/moonshotai/kimi-k2.5",
  security: "@cf/meta/llama-3.1-8b-instruct-fast",
  verification: "@cf/meta/llama-4-scout-17b-16e-instruct",
} as const;

export interface AIModelSettings {
  aiModel?: string;
}

export function getAIModel(settings: AIModelSettings | undefined, task: keyof typeof DEFAULT_AI_MODELS): string {
  return settings?.aiModel?.trim() || DEFAULT_AI_MODELS[task];
}
