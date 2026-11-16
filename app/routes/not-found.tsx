// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { Button, Empty } from "@cloudflare/kumo";
import { WarningIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router";

export default function NotFoundRoute() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Empty
        icon={<WarningIcon size={48} className="text-kumo-inactive" />}
        title="404 -- Page Not Found"
        description="The page you're looking for doesn't exist."
        contents={
          <Button variant="primary" size="sm" onClick={() => navigate("/")}>
            Go Home
          </Button>
        }
      />
    </div>
  );
}
