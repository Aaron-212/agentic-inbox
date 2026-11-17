// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { m } from "shared/paraglide/messages.js";

import { Button, Empty } from "@cloudflare/kumo";
import { WarningIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router";

export default function NotFoundRoute() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Empty
        icon={<WarningIcon size={48} className="text-kumo-inactive" />}
        title={m.not_found_title()}
        description={m.page_missing()}
        contents={
          <Button variant="primary" size="sm" onClick={() => navigate("/")}>
            {m.go_home()}
          </Button>
        }
      />
    </div>
  );
}
