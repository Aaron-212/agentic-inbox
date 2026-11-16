// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { type KeyboardEvent, type RefObject, useEffect, useState } from "react";
import type { Resizable, ResizableProps } from "re-resizable";
import { type ComposeSize, useComposeStore } from "./useComposeStore";

export function useComposeResize(panel: RefObject<Resizable | null>, hasMinimized: boolean, expanded: boolean) {
  const preferredSize = useComposeStore((state) => state.composerSize);
  const setSize = useComposeStore((state) => state.setComposerSize);
  const [workspace, setWorkspace] = useState({ width: 0, height: 0, rem: 16 });
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const element = panel.current?.resizable?.parentElement;
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

  const docked = !expanded && workspace.width >= 48 * workspace.rem;
  const bottom = docked && hasMinimized ? 4 * workspace.rem : 0;
  const maxWidth = Math.max(0, workspace.width - 2 * workspace.rem);
  const maxHeight = Math.max(0, workspace.height - bottom - workspace.rem);
  const minWidth = Math.min(384, maxWidth);
  const minHeight = Math.min(320, maxHeight);
  const clampSize = (width: number, height: number): ComposeSize => ({
    width: Math.round(Math.max(minWidth, Math.min(width, maxWidth))),
    height: Math.round(Math.max(minHeight, Math.min(height, maxHeight))),
  });
  const size = clampSize(preferredSize?.width ?? 576, preferredSize?.height ?? Math.min(workspace.height * 0.75, 768));

  const commit = (width: number, height: number) => {
    const next = clampSize(width, height);
    setSize(next);
    setAnnouncement(`Composer resized to ${next.width} by ${next.height} pixels.`);
  };
  const resizeBy = (width: number, height: number) => commit(size.width + width, size.height + height);
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 64 : 16;
    switch (event.key) {
      case "ArrowLeft":
        resizeBy(step, 0);
        break;
      case "ArrowRight":
        resizeBy(-step, 0);
        break;
      case "ArrowUp":
        resizeBy(0, step);
        break;
      case "ArrowDown":
        resizeBy(0, -step);
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  const resizableProps = {
    size: docked ? size : { width: "100%", height: "100%" },
    style: { position: "absolute", top: "auto", left: "auto", right: docked ? workspace.rem : 0, bottom },
    enable: docked ? { top: true, left: true, topLeft: true } : false,
    bounds: "parent",
    boundsByDirection: true,
    minWidth: docked ? minWidth : undefined,
    minHeight: docked ? minHeight : undefined,
    maxWidth: docked ? maxWidth : undefined,
    maxHeight: docked ? maxHeight : undefined,
    onResizeStart: (event) => !("button" in event && event.button !== 0),
    onResizeStop: (_event, _direction, element, delta) => {
      if (element.getClientRects().length && (delta.width || delta.height)) {
        commit(element.offsetWidth, element.offsetHeight);
      }
    },
  } satisfies Partial<ResizableProps>;

  return {
    resizableProps,
    announcement,
    resizeBy,
    onKeyDown,
    reset: () => {
      setSize(null);
      setAnnouncement("Composer size reset.");
    },
  };
}
