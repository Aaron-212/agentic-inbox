// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { getLocale } from "./paraglide/runtime.js";

/**
 * Consolidated date formatting utilities.
 *
 * Previously spread across `app/lib/utils.ts` (4 functions) and
 * `workers/lib/html.ts` (`formatEmailDate`). Now one canonical set
 * imported by both the frontend and backend.
 */

/** Parse safely — returns null on invalid dates instead of NaN-date. */
function safeParse(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Email list rows.
 * - Today: "3:42 PM"
 * - This year: "Apr 15"
 * - Older: "Apr 15, 2024"
 */
export function formatListDate(dateStr: string, locale = getLocale(), timeZone?: string): string {
  const date = safeParse(dateStr);
  if (!date) return dateStr;

  const now = new Date();
  const day = new Intl.DateTimeFormat(locale, { year: "numeric", month: "numeric", day: "numeric", timeZone });
  const year = new Intl.DateTimeFormat(locale, { year: "numeric", timeZone });
  if (day.format(date) === day.format(now)) {
    return date.toLocaleTimeString(locale, {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (year.format(date) === year.format(now)) {
    return date.toLocaleDateString(locale, {
      timeZone,
      month: "short",
      day: "numeric",
    });
  }
  return date.toLocaleDateString(locale, {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Email detail header.
 * "Tue, Apr 15, 3:42 PM"
 */
export function formatDetailDate(dateStr: string, locale = getLocale(), timeZone?: string): string {
  const date = safeParse(dateStr);
  if (!date) return dateStr;

  return date.toLocaleDateString(locale, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Thread message headers — time only.
 * "3:42 PM"
 */
export function formatShortDate(dateStr: string, locale = getLocale(), timeZone?: string): string {
  const date = safeParse(dateStr);
  if (!date) return dateStr;

  return date.toLocaleTimeString(locale, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Compose quoted replies & backend quoted blocks.
 * "Tue, Apr 15, 2026, 3:42 PM"
 *
 * Uses explicit "en-US" locale for deterministic output on both browser
 * and Cloudflare Workers (which support `toLocaleString`).
 */
export function formatQuotedDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const date = safeParse(dateStr);
  if (!date) return dateStr;

  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
