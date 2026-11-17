// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { m } from "shared/paraglide/messages.js";

import { Button, Dialog } from "@cloudflare/kumo";
import { useCallback, useEffect, useRef, useState } from "react";

interface ConfirmationOptions {
  title: string;
  description: string;
  confirmLabel: string;
}

export function useConfirmation() {
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const [open, setOpen] = useState(false);
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);

  useEffect(
    () => () => {
      resolveRef.current?.(false);
      resolveRef.current = null;
    },
    [],
  );

  const confirm = useCallback((options: ConfirmationOptions): Promise<boolean> => {
    if (resolveRef.current) return Promise.resolve(false);
    setOptions(options);
    setOpen(true);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const finish = (confirmed: boolean) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setOpen(false);
    resolve?.(confirmed);
  };

  const confirmationDialog = (
    <Dialog.Root
      role="alertdialog"
      open={open}
      onOpenChange={(open) => {
        if (!open) finish(false);
      }}
    >
      <Dialog className="p-6">
        <Dialog.Title className="mb-2 text-base font-semibold">{options?.title}</Dialog.Title>
        <Dialog.Description className="text-kumo-subtle mb-5 text-sm">{options?.description}</Dialog.Description>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => finish(false)}>
            {m.cancel()}
          </Button>
          <Button type="button" variant="destructive" onClick={() => finish(true)}>
            {options?.confirmLabel}
          </Button>
        </div>
      </Dialog>
    </Dialog.Root>
  );

  return { confirm, confirmationDialog };
}
