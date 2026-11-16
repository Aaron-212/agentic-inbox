// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

export interface Env extends Cloudflare.Env {
  POLICY_AUD: string;
  TEAM_DOMAIN: string;
}
