// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

export interface AIFeatures {
  assistant: boolean;
  replies: boolean;
  spam: boolean;
  mcp: boolean;
}

export interface AIFeatureSettings {
  aiFeatures?: Partial<AIFeatures>;
  aiEnabled?: boolean;
}

export function getAIFeatures(settings?: AIFeatureSettings): AIFeatures {
  const enabled = settings?.aiEnabled !== false;
  return {
    assistant: settings?.aiFeatures?.assistant ?? enabled,
    replies: settings?.aiFeatures?.replies ?? enabled,
    spam: settings?.aiFeatures?.spam ?? false,
    mcp: settings?.aiFeatures?.mcp ?? enabled,
  };
}
