// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { m } from "shared/paraglide/messages.js";

import { type KeyboardEvent, type RefObject, useEffect, useState } from "react";
import type { Rnd, Props as RndProps } from "react-rnd";
import { type ComposePosition, type ComposeSize, useComposeStore } from "./useComposeStore";

export function useComposeWindow(panel: RefObject<Rnd | null>, expanded: boolean) {
  const preferredSize = useComposeStore((state) => state.composerSize);
  const preferredPosition = useComposeStore((state) => state.composerPosition);
  const setLayout = useComposeStore((state) => state.setComposerLayout);
  const [workspace, setWorkspace] = useState({ width: 0, height: 0, rem: 16 });
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const element = panel.current?.getSelfElement()?.parentElement;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const next = {
        width: element.clientWidth,
        height: element.clientHeight,
        rem: Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16,
      };
      setWorkspace((previous) =>
        previous.width === next.width && previous.height === next.height && previous.rem === next.rem ? previous : next,
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [panel]);

  const floating = !expanded && workspace.width >= 48 * workspace.rem;
  const maxWidth = Math.max(0, workspace.width - 2 * workspace.rem);
  const maxHeight = Math.max(0, workspace.height - 2 * workspace.rem);
  const minWidth = Math.min(384, maxWidth);
  const minHeight = Math.min(320, maxHeight);
  const clampSize = (size: ComposeSize): ComposeSize => ({
    width: Math.round(Math.max(minWidth, Math.min(size.width, maxWidth))),
    height: Math.round(Math.max(minHeight, Math.min(size.height, maxHeight))),
  });
  const size = clampSize(preferredSize ?? { width: 576, height: Math.min(workspace.height * 0.75, 768) });
  const centeredPosition = { x: (workspace.width - size.width) / 2, y: (workspace.height - size.height) / 2 };
  const clampPosition = (position: ComposePosition, dimensions = size): ComposePosition => ({
    x: Math.round(Math.max(0, Math.min(position.x, workspace.width - dimensions.width))),
    y: Math.round(Math.max(0, Math.min(position.y, workspace.height - dimensions.height))),
  });
  const position = clampPosition(preferredPosition ?? centeredPosition);
  const resizeBy = (width: number, height: number) => {
    const nextSize = clampSize({ width: size.width + width, height: size.height + height });
    setLayout(nextSize, clampPosition(position, nextSize));
    setAnnouncement(m.composer_resized({ width: nextSize.width, height: nextSize.height }));
  };
  const moveBy = (x: number, y: number) => {
    setLayout(size, clampPosition({ x: position.x + x, y: position.y + y }));
    setAnnouncement(m.composer_moved());
  };
  const onArrowKey = (event: KeyboardEvent<HTMLButtonElement>, resize: boolean) => {
    const step = event.shiftKey ? 64 : 16;
    const adjust = resize ? resizeBy : moveBy;
    switch (event.key) {
      case "ArrowLeft":
        adjust(-step, 0);
        break;
      case "ArrowRight":
        adjust(step, 0);
        break;
      case "ArrowUp":
        adjust(0, -step);
        break;
      case "ArrowDown":
        adjust(0, step);
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  const rndProps: RndProps = {
    size: floating ? size : { width: "100%", height: "100%" },
    position: floating ? position : { x: 0, y: 0 },
    disableDragging: !floating,
    enableResizing: floating,
    bounds: "parent",
    dragHandleClassName: "compose-window-titlebar",
    cancel: "button:not(.compose-window-drag-handle), a, input, textarea, [contenteditable]",
    enableUserSelectHack: false,
    minWidth: floating ? minWidth : undefined,
    minHeight: floating ? minHeight : undefined,
    maxWidth: floating ? maxWidth : undefined,
    maxHeight: floating ? maxHeight : undefined,
    onDragStop: (_event, data) => {
      if (!floating) return;
      setLayout(size, clampPosition(data));
      setAnnouncement(m.composer_moved());
    },
    onResizeStart: (event) => !("button" in event && event.button !== 0),
    onResizeStop: (_event, _direction, element, _delta, nextPosition) => {
      if (!floating || !element.offsetWidth || !element.offsetHeight) return;
      const nextSize = clampSize({ width: element.offsetWidth, height: element.offsetHeight });
      setLayout(nextSize, clampPosition(nextPosition, nextSize));
      setAnnouncement(m.composer_resized({ width: nextSize.width, height: nextSize.height }));
    },
  };

  return {
    rndProps,
    floating,
    announcement,
    resizeBy,
    moveBy,
    onResizeKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => onArrowKey(event, true),
    onMoveKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => onArrowKey(event, false),
    center: () => {
      setLayout(size, clampPosition(centeredPosition));
      setAnnouncement(m.composer_centered());
    },
    reset: () => {
      setLayout(null, null);
      setAnnouncement(m.composer_reset());
    },
  };
}
