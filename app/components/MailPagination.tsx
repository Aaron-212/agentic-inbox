// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { Pagination } from "@cloudflare/kumo";
import { m } from "shared/paraglide/messages.js";
import { getLocale } from "shared/paraglide/runtime.js";

interface MailPaginationProps {
  page: number;
  setPage: (page: number) => void;
  perPage: number;
  totalCount: number;
}

export default function MailPagination({ page, setPage, perPage, totalCount }: MailPaginationProps) {
  const number = new Intl.NumberFormat(getLocale());
  return (
    <Pagination
      page={page}
      setPage={setPage}
      perPage={perPage}
      totalCount={totalCount}
      labels={{
        navigation: m.pagination(),
        firstPage: m.first_page(),
        previousPage: m.previous_page(),
        nextPage: m.next_page(),
        lastPage: m.last_page(),
        pageNumber: m.page_number(),
        pageSize: m.page_size(),
      }}
    >
      <div className="grow" aria-live="polite" aria-atomic="true">
        <Pagination.Info>
          {() =>
            m.pagination_info({
              start: number.format(Math.min((page - 1) * perPage + 1, totalCount)),
              end: number.format(Math.min(page * perPage, totalCount)),
              count: number.format(totalCount),
            })
          }
        </Pagination.Info>
      </div>
      <Pagination.Controls />
    </Pagination>
  );
}
