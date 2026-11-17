// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import LanguageSelect from "~/components/LanguageSelect";
import { m } from "shared/paraglide/messages.js";

import { Button, Dialog, Input, LayerDialog, Loader, Select, Text, useKumoToastManager } from "@cloudflare/kumo";
import { EnvelopeIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router";
import api from "~/services/api";
import { useCreateMailbox, useDeleteMailbox, useMailboxes } from "~/queries/mailboxes";
import { queryKeys } from "~/queries/keys";

const EMPTY_ADDRESSES: string[] = [];

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

  const domains = configData?.domains ?? EMPTY_ADDRESSES;
  const emailAddresses = configData?.emailAddresses ?? EMPTY_ADDRESSES;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPrefix, setNewPrefix] = useState("");
  const [domainSelection, setSelectedDomain] = useState("");
  const selectedDomain = domainSelection || domains[0] || "";
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [mailboxToDelete, setMailboxToDelete] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
  }, [emailAddresses, mailboxes, mailboxesFetched, refetchMailboxes]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newPrefix || !selectedDomain) {
      setCreateError(m.fill_fields());
      return;
    }
    const email = `${newPrefix}@${selectedDomain}`;
    const name = newName || newPrefix;
    setIsCreating(true);
    try {
      await createMailbox.mutateAsync({ email, name });
      toastManager.add({ title: m.mailbox_created() });
      setIsCreateOpen(false);
      setNewPrefix("");
      setNewName("");
    } catch (err: unknown) {
      const message = (err instanceof Error ? err.message : null) || m.mailbox_create_failed();
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
      toastManager.add({ title: m.mailbox_deleted() });
      setIsDeleteOpen(false);
      setMailboxToDelete(null);
    } catch {
      toastManager.add({ title: m.mailbox_delete_failed(), variant: "error" });
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
            <h1 className="text-kumo-default text-2xl font-bold">{m.mailboxes()}</h1>
            <div className="flex items-center gap-2">
              <LanguageSelect />
              {!isConfigured && (
                <Button variant="primary" icon={<PlusIcon size={16} />} onClick={() => setIsCreateOpen(true)}>
                  {m.new_mailbox()}
                </Button>
              )}
            </div>
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
                <div className="bg-kumo-fill text-kumo-default flex size-10  shrink-0 items-center justify-center rounded-full text-sm font-bold">
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
                    aria-label={m.delete_mailbox_address({ email: account.email })}
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
              <h3 className="text-kumo-default mb-1.5 text-base font-semibold">{m.no_mailboxes()}</h3>
              <p className="text-kumo-subtle mb-5 max-w-sm text-sm">
                {isConfigured ? m.mailboxes_pending() : m.create_mailbox_help()}
              </p>
              {!isConfigured && (
                <Button variant="primary" icon={<PlusIcon size={16} />} onClick={() => setIsCreateOpen(true)}>
                  {m.create_mailbox()}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <LayerDialog.Root open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <LayerDialog.Content>
          <LayerDialog.Title>{m.create_new_mailbox()}</LayerDialog.Title>
          <LayerDialog.Body>
            <form id="create-mailbox-form" onSubmit={handleCreate} className="space-y-4">
              {createError && <Text variant="error">{createError}</Text>}
              <div>
                <span className="text-kumo-default mb-1.5 block font-medium">{m.email_address()}</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      aria-label={m.address_prefix()}
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
                          aria-label={m.domain()}
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
                      <span className="text-kumo-subtle">{selectedDomain || m.no_domain()}</span>
                    )}
                  </div>
                </div>
              </div>
              <Input
                label={m.display_name_optional()}
                placeholder={m.display_name_example()}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </form>
          </LayerDialog.Body>
          <LayerDialog.Actions dismissLabel={m.cancel()}>
            <LayerDialog.Action
              type="submit"
              form="create-mailbox-form"
              loading={isCreating}
              disabled={!selectedDomain}
            >
              {m.create()}
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
          <Dialog.Title className="mb-2 text-base font-semibold">{m.delete_mailbox()}</Dialog.Title>
          <Dialog.Description className="text-kumo-subtle mb-5 text-base">
            {m.delete_mailbox_confirm({ email: mailboxToDelete?.email || "" })}
          </Dialog.Description>
          <div className="flex justify-end gap-2">
            <Dialog.Close
              render={(props) => (
                <Button {...props} variant="secondary">
                  {m.cancel()}
                </Button>
              )}
            />
            <Button variant="destructive" loading={isDeleting} onClick={handleDelete}>
              {m.delete()}
            </Button>
          </div>
        </Dialog>
      </Dialog.Root>
    </div>
  );
}
