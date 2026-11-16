// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { Button, Popover } from "@cloudflare/kumo";
import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, RulerIcon } from "@phosphor-icons/react";
import type { useComposeWindow } from "~/hooks/useComposeWindow";

type ComposeWindow = ReturnType<typeof useComposeWindow>;

export default function ComposeWindowMenu({ windowState }: { windowState: ComposeWindow }) {
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
            aria-label="Window options. Use arrow keys to resize."
            onKeyDown={windowState.onResizeKeyDown}
            className="hidden @3xl:inline-flex"
          />
        }
      />
      <Popover.Content side="bottom" align="end" className="space-y-3 p-3">
        <Popover.Title className="text-sm font-medium">Window options</Popover.Title>
        <Popover.Description className="max-w-64 text-xs text-kumo-subtle">
          Drag the title to move or any border to resize. Arrow keys move the focused title or resize from the size
          button. Hold Shift for larger steps.
        </Popover.Description>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            shape="square"
            size="sm"
            icon={<ArrowLeftIcon size={16} />}
            onClick={() => windowState.moveBy(-64, 0)}
            aria-label="Move composer left"
          />
          <Button
            type="button"
            variant="secondary"
            shape="square"
            size="sm"
            icon={<ArrowUpIcon size={16} />}
            onClick={() => windowState.moveBy(0, -64)}
            aria-label="Move composer up"
          />
          <Button
            type="button"
            variant="secondary"
            shape="square"
            size="sm"
            icon={<ArrowDownIcon size={16} />}
            onClick={() => windowState.moveBy(0, 64)}
            aria-label="Move composer down"
          />
          <Button
            type="button"
            variant="secondary"
            shape="square"
            size="sm"
            icon={<ArrowRightIcon size={16} />}
            onClick={() => windowState.moveBy(64, 0)}
            aria-label="Move composer right"
          />
          <Button type="button" variant="ghost" size="sm" onClick={windowState.center}>
            Center
          </Button>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => windowState.resizeBy(-64, -64)}>
            Smaller
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => windowState.resizeBy(64, 64)}>
            Larger
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={windowState.reset}>
            Reset
          </Button>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
