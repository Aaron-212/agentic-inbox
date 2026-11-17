// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { Select } from "@cloudflare/kumo";
import { getLocale, isLocale, setLocale } from "shared/paraglide/runtime.js";

export default function LanguageSelect() {
  return (
    <Select
      aria-label="Language / 语言"
      value={getLocale()}
      items={{ en: "English", "zh-CN": "简体中文" }}
      className="shrink-0"
      onValueChange={(locale) => {
        if (isLocale(locale)) void setLocale(locale);
      }}
    />
  );
}
