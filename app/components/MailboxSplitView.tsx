// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import type { ReactNode } from "react";
import EmailPanel from "~/components/EmailPanel";

interface MailboxSplitViewProps {
  selectedEmailId: string | null;
  children: ReactNode;
}

export default function MailboxSplitView({ selectedEmailId, children }: MailboxSplitViewProps) {
  const isPanelOpen = selectedEmailId !== null;

  return (
    <div className="flex h-full">
      <div
        className={`flex min-w-0 shrink-0 flex-col ${
          isPanelOpen ? "md:border-kumo-line hidden md:flex md:w-[380px] md:border-r" : "w-full"
        }`}
      >
        {children}
      </div>
      {isPanelOpen && (
        <div className="flex w-full min-w-0 flex-1 flex-col overflow-hidden md:w-auto">
          {selectedEmailId && <EmailPanel emailId={selectedEmailId} />}
        </div>
      )}
    </div>
  );
}
