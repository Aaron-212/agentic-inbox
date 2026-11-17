// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { m } from "shared/paraglide/messages.js";

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
            aria-label={m.window_options_hint()}
            onKeyDown={windowState.onResizeKeyDown}
            className="hidden @3xl:inline-flex"
          />
        }
      />
      <Popover.Content side="bottom" align="end" className="space-y-3 p-3">
        <Popover.Title className="text-sm font-medium">{m.window_options()}</Popover.Title>
        <Popover.Description className="text-kumo-subtle max-w-64 text-xs">{m.window_help()}</Popover.Description>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            shape="square"
            size="sm"
            icon={<ArrowLeftIcon size={16} />}
            onClick={() => windowState.moveBy(-64, 0)}
            aria-label={m.move_left()}
          />
          <Button
            type="button"
            variant="secondary"
            shape="square"
            size="sm"
            icon={<ArrowUpIcon size={16} />}
            onClick={() => windowState.moveBy(0, -64)}
            aria-label={m.move_up()}
          />
          <Button
            type="button"
            variant="secondary"
            shape="square"
            size="sm"
            icon={<ArrowDownIcon size={16} />}
            onClick={() => windowState.moveBy(0, 64)}
            aria-label={m.move_down()}
          />
          <Button
            type="button"
            variant="secondary"
            shape="square"
            size="sm"
            icon={<ArrowRightIcon size={16} />}
            onClick={() => windowState.moveBy(64, 0)}
            aria-label={m.move_right()}
          />
          <Button type="button" variant="ghost" size="sm" onClick={windowState.center}>
            {m.center()}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => windowState.resizeBy(-64, -64)}>
            {m.smaller()}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => windowState.resizeBy(64, 64)}>
            {m.larger()}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={windowState.reset}>
            {m.reset()}
          </Button>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
