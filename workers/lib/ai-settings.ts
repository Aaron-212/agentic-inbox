// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import type { Env } from "../types";
import { getAIFeatures, type AIFeatureSettings, type AIFeatures } from "shared/ai-features";
import { getAIModel, type AIModelSettings, type DEFAULT_AI_MODELS } from "shared/ai-model";

export async function getMailboxAIModel(
  env: Env,
  mailboxId: string,
  task: keyof typeof DEFAULT_AI_MODELS,
): Promise<string> {
  const mailbox = await env.BUCKET.get(`mailboxes/${mailboxId}.json`);
  const settings = mailbox ? await mailbox.json<AIModelSettings>() : undefined;
  return getAIModel(settings, task);
}

export async function isMailboxAIFeatureEnabled(
  env: Env,
  mailboxId: string,
  feature: keyof AIFeatures,
): Promise<boolean> {
  const mailbox = await env.BUCKET.get(`mailboxes/${mailboxId}.json`);
  if (!mailbox) return false;
  const settings = await mailbox.json<AIFeatureSettings>();
  return getAIFeatures(settings)[feature];
}
