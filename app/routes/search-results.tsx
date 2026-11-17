// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { getFolderDisplayName } from "shared/folders";
import { m } from "shared/paraglide/messages.js";

import { Badge, Button, Loader, Tooltip } from "@cloudflare/kumo";
import { ArrowLeftIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import MailPagination from "~/components/MailPagination";
import MailboxSplitView from "~/components/MailboxSplitView";
import { formatListDate, getSnippetText } from "~/lib/utils";
import { useUpdateEmail } from "~/queries/emails";
import { useSearchEmails, SEARCH_PAGE_SIZE } from "~/queries/search";
import { useUIStore } from "~/hooks/useUIStore";
import type { Email } from "~/types";

function highlightTerms(text: string, query: string): React.ReactNode {
  if (!query || !text) return text;
  const freeText = query
    .replace(/\b(?:from|to|subject|in|is|has|before|after):"[^"]*"/gi, "")
    .replace(/\b(?:from|to|subject|in|is|has|before|after):\S+/gi, "")
    .trim();
  if (!freeText) return text;
  try {
    const escaped = freeText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);
    if (parts.length === 1) return text;
    // Use case-insensitive string comparison instead of regex.test() with g flag,
    // which has stateful lastIndex causing alternating true/false results.
    const lowerEscaped = escaped.toLowerCase();
    return parts.map((part, i) =>
      part.toLowerCase() === lowerEscaped ? (
        <mark key={i} className="bg-kumo-warning-tint text-kumo-default rounded-sm px-0.5">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  } catch {
    return text;
  }
}

export default function SearchResultsRoute() {
  const { mailboxId } = useParams<{ mailboxId: string }>();
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const searchKey = JSON.stringify([mailboxId, urlQuery]);
  const closePanel = useUIStore((state) => state.closePanel);
  const previousSearchKey = useRef(searchKey);

  useEffect(() => {
    if (previousSearchKey.current !== searchKey) {
      previousSearchKey.current = searchKey;
      closePanel();
    }
  }, [closePanel, searchKey]);

  return <SearchResults key={searchKey} mailboxId={mailboxId} urlQuery={urlQuery} />;
}

function SearchResults({ mailboxId, urlQuery }: { mailboxId: string | undefined; urlQuery: string }) {
  const navigate = useNavigate();
  const { selectedEmailId, selectEmail } = useUIStore();
  const updateEmail = useUpdateEmail();
  const [page, setPage] = useState(1);

  const { data: searchData, isLoading } = useSearchEmails(mailboxId, urlQuery, page);
  const results = searchData?.results ?? [];
  const totalCount = searchData?.totalCount ?? 0;
  const isPanelOpen = selectedEmailId !== null;

  const handleRowClick = (email: Email) => {
    selectEmail(email.id);
    if (!email.read && mailboxId) updateEmail.mutate({ mailboxId, id: email.id, data: { read: true } });
  };

  return (
    <MailboxSplitView selectedEmailId={selectedEmailId}>
      <>
        <div className="border-kumo-line flex shrink-0 items-center gap-2 border-b px-4 py-3.5 md:px-5">
          <Tooltip
            content={m.back_inbox()}
            side="bottom"
            render={
              <Button
                variant="ghost"
                shape="square"
                size="sm"
                icon={<ArrowLeftIcon size={18} />}
                onClick={() => navigate(`/mailbox/${mailboxId}/emails/inbox`)}
                aria-label={m.back_inbox()}
              />
            }
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-kumo-default truncate text-lg font-semibold">{m.search_results()}</h1>
            {!isLoading && (
              <span className="text-kumo-subtle text-sm">
                {urlQuery
                  ? m.results_for({ results: m.results_count({ count: totalCount }), query: urlQuery })
                  : m.results_count({ count: totalCount })}
              </span>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader size="lg" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
              <div className="mb-4">
                <MagnifyingGlassIcon size={48} weight="thin" className="text-kumo-subtle" />
              </div>
              <h3 className="text-kumo-default mb-1.5 text-base font-semibold">{m.no_results()}</h3>
              <p className="text-kumo-subtle max-w-xs text-sm">
                {urlQuery ? m.no_search_match({ query: urlQuery }) : m.search_help()}
              </p>
              {urlQuery && (
                <p className="text-kumo-subtle mt-3 max-w-sm text-xs">
                  {m.search_tip()} <code className="bg-kumo-tint rounded px-1">from:name</code>,{" "}
                  <code className="bg-kumo-tint rounded px-1">is:unread</code>,{" "}
                  <code className="bg-kumo-tint rounded px-1">has:attachment</code>,{" "}
                  <code className="bg-kumo-tint rounded px-1">before:2025-01-01</code>
                </p>
              )}
            </div>
          ) : (
            <div>
              {results.map((email) => {
                const isSelected = selectedEmailId === email.id;
                const snippet = getSnippetText(email.snippet, 120);
                const folderName = (email as Email & { folder_name?: string }).folder_name;
                return (
                  <div
                    key={email.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleRowClick(email)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleRowClick(email);
                      }
                    }}
                    className={`group border-kumo-line flex w-full cursor-pointer items-center gap-3 border-b px-4 py-2.5 text-left transition-colors md:px-5 md:py-3 ${isPanelOpen ? "md:px-4 md:py-2.5" : ""} ${isSelected ? "bg-kumo-tint" : "hover:bg-kumo-tint"}`}
                  >
                    <div className="flex w-2.5 shrink-0 justify-center">
                      {!email.read && <div className="bg-kumo-brand size-2  rounded-full" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`min-w-0 flex-1 text-sm wrap-anywhere ${!email.read ? "text-kumo-default font-semibold" : "text-kumo-subtle"}`}
                        >
                          {highlightTerms(email.sender, urlQuery)}
                        </span>
                        {folderName && (
                          <Badge variant="outline">{getFolderDisplayName(email.folder_id || "", folderName)}</Badge>
                        )}
                        <span className="text-kumo-subtle ml-auto shrink-0 text-sm">{formatListDate(email.date)}</span>
                      </div>
                      <div
                        className={`mt-0.5 truncate text-sm ${!email.read ? "text-kumo-default font-medium" : "text-kumo-subtle"}`}
                      >
                        {highlightTerms(email.subject, urlQuery)}
                      </div>
                      {snippet && (
                        <div className="text-kumo-subtle mt-0.5 truncate text-xs">
                          {highlightTerms(snippet, urlQuery)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {totalCount > SEARCH_PAGE_SIZE && (
          <div className="border-kumo-line flex shrink-0 justify-center border-t py-3">
            <MailPagination page={page} setPage={setPage} perPage={SEARCH_PAGE_SIZE} totalCount={totalCount} />
          </div>
        )}
      </>
    </MailboxSplitView>
  );
}
