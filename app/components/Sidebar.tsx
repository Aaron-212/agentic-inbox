// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { Badge, Button, Dialog, Input, Sidebar as KumoSidebar, Tooltip } from "@cloudflare/kumo";
import {
  ArchiveIcon,
  CaretLeftIcon,
  FileIcon,
  FolderIcon,
  PaperPlaneTiltIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  TrayIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useMatch, useNavigate, useParams } from "react-router";
import { Folders, SYSTEM_FOLDER_IDS } from "shared/folders";
import { useCreateFolder, useFolders } from "~/queries/folders";
import { useMailbox } from "~/queries/mailboxes";
import { useUIStore } from "~/hooks/useUIStore";

const FOLDER_ICONS: Record<string, React.ReactNode> = {
  [Folders.INBOX]: <TrayIcon size={18} weight="regular" />,
  [Folders.SENT]: <PaperPlaneTiltIcon size={18} weight="regular" />,
  [Folders.DRAFT]: <FileIcon size={18} weight="regular" />,
  [Folders.ARCHIVE]: <ArchiveIcon size={18} weight="regular" />,
  [Folders.TRASH]: <TrashIcon size={18} weight="regular" />,
};

const SYSTEM_FOLDER_LINKS = [
  { id: Folders.INBOX, label: "Inbox" },
  { id: Folders.SENT, label: "Sent" },
  { id: Folders.DRAFT, label: "Drafts" },
  { id: Folders.ARCHIVE, label: "Archive" },
  { id: Folders.TRASH, label: "Trash" },
];

interface FolderLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  unreadCount?: number;
  onClick?: () => void;
}

function FolderLink({ to, icon, label, unreadCount, onClick }: FolderLinkProps) {
  const match = useMatch(`${to}/*`);

  return (
    <KumoSidebar.MenuButton
      href={to}
      icon={icon}
      active={match !== null}
      aria-current={match ? "page" : undefined}
      onClick={onClick}
    >
      <span className="truncate flex-1">{label}</span>
      {unreadCount != null && unreadCount > 0 && <Badge variant="secondary">{unreadCount}</Badge>}
    </KumoSidebar.MenuButton>
  );
}

export default function Sidebar() {
  const { mailboxId } = useParams<{ mailboxId: string }>();
  const navigate = useNavigate();
  const { data: folders = [] } = useFolders(mailboxId);
  const createFolderMutation = useCreateFolder();
  const { startCompose, closeSidebar } = useUIStore();
  const { data: currentMailbox } = useMailbox(mailboxId);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const customFolders = useMemo(
    () => folders.filter((f) => !(SYSTEM_FOLDER_IDS as readonly string[]).includes(f.id)),
    [folders],
  );

  const getUnreadCount = (folderId: string) => {
    const found = folders.find((f) => f.id === folderId);
    return found?.unreadCount || 0;
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim() && mailboxId) {
      createFolderMutation.mutate({ mailboxId, name: newFolderName.trim() });
      setNewFolderName("");
      setIsCreateFolderOpen(false);
    }
  };

  const displayName = useMemo(() => {
    if (!currentMailbox) return mailboxId?.split("@")[0] || "Mailbox";
    // Prefer settings.fromName > name > local part of email
    if (currentMailbox.settings?.fromName) {
      return currentMailbox.settings.fromName;
    }
    if (currentMailbox.name && currentMailbox.name !== currentMailbox.email) {
      return currentMailbox.name;
    }
    return currentMailbox.email.split("@")[0] || currentMailbox.name;
  }, [currentMailbox, mailboxId]);

  const handleNavClick = () => {
    // Close mobile sidebar on navigation
    closeSidebar();
  };

  return (
    <KumoSidebar id="folder-sidebar" aria-label="Mailbox folders" className="max-md:w-5/6">
      {/* Back + identity */}
      <KumoSidebar.Header className="h-16 flex-row items-center gap-4">
        <Button
          shape="square"
          variant="outline"
          size="md"
          onClick={() => {
            navigate("/");
            closeSidebar();
          }}
          icon={<CaretLeftIcon size={16} />}
          aria-label="Back to mailboxes"
        />
        <div className="flex flex-col flex-1">
          <div className="text-base font-semibold text-kumo-default truncate">{displayName}</div>
          <div className="text-sm text-kumo-subtle truncate">{currentMailbox?.email || mailboxId}</div>
        </div>
        <KumoSidebar.Close className="md:hidden" />
      </KumoSidebar.Header>

      {/* Compose */}
      <div className="p-4">
        <Button
          variant="primary"
          icon={<PencilSimpleIcon size={16} />}
          onClick={() => startCompose()}
          className="w-full"
        >
          Compose
        </Button>
      </div>

      {/* Navigation */}
      <KumoSidebar.Content>
        <nav aria-label="Folders">
          <KumoSidebar.Menu>
            {SYSTEM_FOLDER_LINKS.map((folder) => (
              <FolderLink
                key={folder.id}
                to={`/mailbox/${mailboxId}/emails/${folder.id}`}
                icon={FOLDER_ICONS[folder.id]}
                label={folder.label}
                unreadCount={getUnreadCount(folder.id)}
                onClick={handleNavClick}
              />
            ))}
          </KumoSidebar.Menu>

          <KumoSidebar.Group className="pt-5">
            <div className="flex items-center justify-between">
              <KumoSidebar.GroupLabel>Folders</KumoSidebar.GroupLabel>
              <Tooltip
                content="New folder"
                render={
                  <Button
                    variant="ghost"
                    shape="square"
                    size="sm"
                    icon={<PlusIcon size={16} />}
                    onClick={() => setIsCreateFolderOpen(true)}
                    aria-label="Create new folder"
                  />
                }
              />
            </div>
            <KumoSidebar.Menu>
              {customFolders.map((folder) => (
                <FolderLink
                  key={folder.id}
                  to={`/mailbox/${mailboxId}/emails/${folder.id}`}
                  icon={<FolderIcon size={18} />}
                  label={folder.name}
                  unreadCount={folder.unreadCount}
                  onClick={handleNavClick}
                />
              ))}
            </KumoSidebar.Menu>
          </KumoSidebar.Group>
        </nav>
      </KumoSidebar.Content>
      <KumoSidebar.ResizeHandle className="max-md:hidden" />

      {/* Create folder dialog */}
      <Dialog.Root open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <Dialog size="sm" className="p-6">
          <Dialog.Title className="text-base font-semibold mb-4">Create folder</Dialog.Title>
          <form onSubmit={handleCreateFolder} className="space-y-4">
            <Input
              label="Folder name"
              placeholder="e.g. Projects"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2">
              <Dialog.Close
                render={(props) => (
                  <Button {...props} variant="secondary">
                    Cancel
                  </Button>
                )}
              />
              <Button type="submit" variant="primary" disabled={!newFolderName.trim()}>
                Create
              </Button>
            </div>
          </form>
        </Dialog>
      </Dialog.Root>
    </KumoSidebar>
  );
}
