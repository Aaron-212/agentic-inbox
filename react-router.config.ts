// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  future: {
    unstable_optimizeDeps: true,
    v8_viteEnvironmentApi: true,
  },
} satisfies Config;
