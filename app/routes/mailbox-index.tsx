// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { Navigate } from "react-router";

export default function MailboxIndexRoute() {
  return <Navigate to="emails/inbox" replace />;
}
