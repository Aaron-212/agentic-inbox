// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

interface EmailPanelHeaderProps {
  subject: string;
  messageCount: number;
  showThreadCount: boolean;
}

export default function EmailPanelHeader({ subject, messageCount, showThreadCount }: EmailPanelHeaderProps) {
  return (
    <div className="border-kumo-line shrink-0 border-b px-4 py-3 md:px-6">
      <h2 className="text-kumo-default text-base font-semibold">{subject}</h2>
      {showThreadCount && (
        <span className="text-kumo-subtle mt-0.5 block text-xs">{messageCount} messages in this thread</span>
      )}
    </div>
  );
}
