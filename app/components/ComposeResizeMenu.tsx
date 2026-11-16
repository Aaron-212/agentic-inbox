// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { Button, Popover } from "@cloudflare/kumo";
import { RulerIcon } from "@phosphor-icons/react";
import type { useComposeResize } from "~/hooks/useComposeResize";

type ComposeResize = ReturnType<typeof useComposeResize>;

export default function ComposeResizeMenu({ resize }: { resize: ComposeResize }) {
  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <Button
            type="button"
            variant="ghost"
            shape="square"
            size="sm"
            icon={<RulerIcon size={18} />}
            aria-label="Composer size options. Use arrow keys to resize."
            onKeyDown={resize.onKeyDown}
            className="hidden @3xl:inline-flex"
          />
        }
      />
      <Popover.Content side="bottom" align="end" className="space-y-3 p-3">
        <Popover.Title className="text-sm font-medium">Resize composer</Popover.Title>
        <Popover.Description className="max-w-64 text-xs text-kumo-subtle">
          Drag the top or left border, or use arrow keys on the size button. Hold Shift for larger steps.
        </Popover.Description>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => resize.resizeBy(-64, -64)}>
            Smaller
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => resize.resizeBy(64, 64)}>
            Larger
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={resize.reset}>
            Reset
          </Button>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
