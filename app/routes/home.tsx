// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { Button, Dialog, Empty, Input, LayerDialog, Loader, Select, Text, useKumoToastManager } from "@cloudflare/kumo";
import { EnvelopeIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router";
import api from "~/services/api";
import { useCreateMailbox, useDeleteMailbox, useMailboxes } from "~/queries/mailboxes";
import { queryKeys } from "~/queries/keys";

export function meta() {
  return [{ title: "Agentic Inbox" }];
}

export default function HomeRoute() {
  const toastManager = useKumoToastManager();
  const { data: mailboxes = [], refetch: refetchMailboxes, isFetched: mailboxesFetched } = useMailboxes();
  const createMailbox = useCreateMailbox();
  const deleteMailbox = useDeleteMailbox();

  const { data: configData } = useQuery({
    queryKey: queryKeys.config,
    queryFn: () => api.getConfig(),
    staleTime: Infinity, // config rarely changes
  });

  const domains = configData?.domains ?? [];
  const emailAddresses = configData?.emailAddresses ?? [];

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPrefix, setNewPrefix] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [mailboxToDelete, setMailboxToDelete] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Set default domain when config loads
  useEffect(() => {
    if (domains.length > 0 && !selectedDomain) {
      setSelectedDomain(domains[0]);
    }
  }, [domains, selectedDomain]);

  // Auto-create mailboxes from config (run once when both data sources are ready)
  const autoCreateDone = useRef(false);
  useEffect(() => {
    if (autoCreateDone.current) return;
    if (emailAddresses.length === 0 || !mailboxesFetched) return;
    const existingEmails = new Set(mailboxes.map((m) => m.email.toLowerCase()));
    const toCreate = emailAddresses.filter((addr) => !existingEmails.has(addr.toLowerCase()));
    if (toCreate.length === 0) {
      autoCreateDone.current = true;
      return;
    }
    autoCreateDone.current = true;
    let cancelled = false;
    Promise.all(
      toCreate.map((addr) => {
        const localPart = addr.split("@")[0] || addr;
        return api.createMailbox(addr, localPart).catch(() => {});
      }),
    ).then(() => {
      if (!cancelled) refetchMailboxes();
    });
    return () => {
      cancelled = true;
    };
  }, [emailAddresses, mailboxes, refetchMailboxes]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newPrefix || !selectedDomain) {
      setCreateError("Please fill in all fields");
      return;
    }
    const email = `${newPrefix}@${selectedDomain}`;
    const name = newName || newPrefix;
    setIsCreating(true);
    try {
      await createMailbox.mutateAsync({ email, name });
      toastManager.add({ title: "Mailbox created successfully!" });
      setIsCreateOpen(false);
      setNewPrefix("");
      setNewName("");
    } catch (err: unknown) {
      const message = (err instanceof Error ? err.message : null) || "Failed to create mailbox";
      setCreateError(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!mailboxToDelete) return;
    setIsDeleting(true);
    try {
      await deleteMailbox.mutateAsync(mailboxToDelete.id);
      toastManager.add({ title: "Mailbox deleted" });
      setIsDeleteOpen(false);
      setMailboxToDelete(null);
    } catch {
      toastManager.add({ title: "Failed to delete mailbox", variant: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  const isConfigured = emailAddresses.length > 0;
  const accounts = isConfigured
    ? emailAddresses.map((addr) => ({
        id: addr,
        email: addr,
        name: addr.split("@")[0] || addr,
      }))
    : mailboxes;

  const isLoading = !configData;

  return (
    <div className="bg-kumo-recessed min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-16">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-kumo-default text-2xl font-bold">Mailboxes</h1>
            {!isConfigured && (
              <Button variant="primary" icon={<PlusIcon size={16} />} onClick={() => setIsCreateOpen(true)}>
                New Mailbox
              </Button>
            )}
          </div>
          {domains.length > 0 && <p className="text-kumo-subtle mt-1 text-sm">{domains.join(", ")}</p>}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader size="lg" />
          </div>
        ) : accounts.length > 0 ? (
          <div className="border-kumo-line bg-kumo-base overflow-hidden rounded-xl border">
            {accounts.map((account, idx) => (
              <RouterLink
                key={account.id}
                to={`/mailbox/${account.id}`}
                className={`group hover:bg-kumo-tint flex items-center gap-4 px-5 py-4 no-underline transition-colors ${
                  idx > 0 ? "border-kumo-line border-t" : ""
                }`}
              >
                <div className="bg-kumo-fill text-kumo-default flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                  {account.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-kumo-default truncate text-sm font-medium">{account.name}</div>
                  <div className="text-kumo-subtle text-sm">{account.email}</div>
                </div>
                {!isConfigured && (
                  <Button
                    variant="ghost"
                    size="sm"
                    shape="square"
                    icon={<TrashIcon size={16} />}
                    aria-label={`Delete mailbox ${account.email}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMailboxToDelete({
                        id: account.id,
                        email: account.email,
                      });
                      setIsDeleteOpen(true);
                    }}
                  />
                )}
              </RouterLink>
            ))}
          </div>
        ) : (
          <div className="border-kumo-line bg-kumo-base rounded-xl border px-6 py-16">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4">
                <EnvelopeIcon size={48} weight="thin" className="text-kumo-subtle" />
              </div>
              <h3 className="text-kumo-default mb-1.5 text-base font-semibold">No mailboxes yet</h3>
              <p className="text-kumo-subtle mb-5 max-w-sm text-sm">
                {isConfigured
                  ? "Your email routing is configured but no mailboxes have been created yet. They will appear here automatically."
                  : "Create a mailbox to start sending and receiving emails with your domain."}
              </p>
              {!isConfigured && (
                <Button variant="primary" icon={<PlusIcon size={16} />} onClick={() => setIsCreateOpen(true)}>
                  Create Mailbox
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <LayerDialog.Root open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <LayerDialog.Content>
          <LayerDialog.Title>Create New Mailbox</LayerDialog.Title>
          <LayerDialog.Body>
            <form id="create-mailbox-form" onSubmit={handleCreate} className="space-y-4">
              {createError && <Text variant="error">{createError}</Text>}
              <div>
                <span className="text-kumo-default mb-1.5 block font-medium">Email Address</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      aria-label="Address prefix"
                      placeholder="info"
                      value={newPrefix}
                      onChange={(e) => setNewPrefix(e.target.value)}
                      required
                      className="w-full"
                    />
                  </div>
                  <div className="flex flex-row gap-0.5">
                    <span className="text-kumo-subtle">@</span>
                    {domains.length > 1 ? (
                      <div className="flex-1">
                        <Select
                          aria-label="Domain"
                          value={selectedDomain}
                          onValueChange={(value) => {
                            if (value) setSelectedDomain(value);
                          }}
                        >
                          {domains.map((d) => (
                            <Select.Option key={d} value={d}>
                              {d}
                            </Select.Option>
                          ))}
                        </Select>
                      </div>
                    ) : (
                      <span className="text-kumo-subtle">{selectedDomain || "no domain"}</span>
                    )}
                  </div>
                </div>
              </div>
              <Input
                label="Display Name (optional)"
                placeholder="Info"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </form>
          </LayerDialog.Body>
          <LayerDialog.Actions dismissLabel="Cancel">
            <LayerDialog.Action
              type="submit"
              form="create-mailbox-form"
              loading={isCreating}
              disabled={!selectedDomain}
            >
              Create
            </LayerDialog.Action>
          </LayerDialog.Actions>
        </LayerDialog.Content>
      </LayerDialog.Root>

      {/* Delete Dialog */}
      <Dialog.Root
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) setMailboxToDelete(null);
        }}
      >
        <Dialog className="p-6">
          <Dialog.Title className="mb-2 text-base font-semibold">Delete Mailbox</Dialog.Title>
          <Dialog.Description className="text-kumo-subtle mb-5 text-base">
            Are you sure you want to delete <strong className="text-kumo-default">{mailboxToDelete?.email}</strong>?
            This action cannot be undone.
          </Dialog.Description>
          <div className="flex justify-end gap-2">
            <Dialog.Close
              render={(props) => (
                <Button {...props} variant="secondary">
                  Cancel
                </Button>
              )}
            />
            <Button variant="destructive" loading={isDeleting} onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </Dialog>
      </Dialog.Root>
    </div>
  );
}
