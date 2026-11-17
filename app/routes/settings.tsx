// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { m } from "shared/paraglide/messages.js";

import { Badge, Button, Checkbox, Input, InputArea, Link, Loader, useKumoToastManager } from "@cloudflare/kumo";
import { RobotIcon, ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useParams } from "react-router";
import { getAIFeatures, type AIFeatures } from "shared/ai-features";
import { useMailbox, useUpdateMailbox } from "~/queries/mailboxes";

export default function SettingsRoute() {
  const { mailboxId } = useParams<{ mailboxId: string }>();
  const toastManager = useKumoToastManager();
  const { data: mailbox } = useMailbox(mailboxId);
  const updateMailboxMutation = useUpdateMailbox();

  const [displayName, setDisplayName] = useState(mailbox?.settings?.fromName || mailbox?.name || "");
  const [forwardingEnabled, setForwardingEnabled] = useState(mailbox?.settings?.forwarding?.enabled ?? false);
  const [forwardingEmail, setForwardingEmail] = useState(mailbox?.settings?.forwarding?.email || "");
  const [aiFeatures, setAIFeatures] = useState(() => getAIFeatures(mailbox?.settings));
  const [aiModel, setAIModel] = useState(mailbox?.settings?.aiModel || "");
  const [agentPrompt, setAgentPrompt] = useState(mailbox?.settings?.agentSystemPrompt || "");
  const [isSaving, setIsSaving] = useState(false);

  const [previousMailbox, setPreviousMailbox] = useState(mailbox);
  if (mailbox !== previousMailbox) {
    setPreviousMailbox(mailbox);
    if (mailbox) {
      setDisplayName(mailbox.settings?.fromName || mailbox.name || "");
      setAgentPrompt(mailbox.settings?.agentSystemPrompt || "");
      setAIFeatures(getAIFeatures(mailbox.settings));
      setAIModel(mailbox.settings?.aiModel || "");
      setForwardingEnabled(mailbox.settings?.forwarding?.enabled ?? false);
      setForwardingEmail(mailbox.settings?.forwarding?.email || "");
    }
  }

  const handleSave = async () => {
    if (!mailbox || !mailboxId) return;
    setIsSaving(true);
    const settings = {
      ...mailbox.settings,
      fromName: displayName,
      aiEnabled: undefined,
      aiFeatures,
      aiModel: aiModel.trim() || undefined,
      forwarding: { enabled: forwardingEnabled, email: forwardingEmail.trim() },
      agentSystemPrompt: agentPrompt.trim() || undefined,
    };
    try {
      await updateMailboxMutation.mutateAsync({ mailboxId, settings });
      toastManager.add({ title: m.settings_saved() });
    } catch (error) {
      toastManager.add({
        title: error instanceof Error ? error.message : m.settings_save_failed(),
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPrompt = () => {
    setAgentPrompt("");
  };

  if (!mailbox) {
    return (
      <div className="flex justify-center py-20">
        <Loader size="lg" />
      </div>
    );
  }

  const isCustomPrompt = agentPrompt.trim().length > 0;

  return (
    <div className="h-full overflow-y-auto p-4  md:px-8 md:py-6">
      <h1 className="text-kumo-default mb-6 text-lg font-semibold">{m.settings()}</h1>

      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
      >
        {/* Account */}
        <div className="border-kumo-line bg-kumo-base rounded-lg border p-5">
          <div className="text-kumo-default mb-4 text-sm font-medium">{m.account()}</div>
          <div className="space-y-3">
            <Input label={m.display_name()} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <Input label={m.email()} type="email" value={mailbox.email} disabled />
          </div>
        </div>

        <div className="border-kumo-line bg-kumo-base rounded-lg border p-5">
          <div className="text-kumo-default mb-4 text-sm font-medium">{m.forwarding()}</div>
          <div>
            <Checkbox
              label={m.forward_incoming()}
              name="forwardingEnabled"
              checked={forwardingEnabled}
              onCheckedChange={setForwardingEnabled}
            />
          </div>
          {forwardingEnabled && (
            <div className="mt-3">
              <Input
                label={m.forward_to()}
                name="forwardingEmail"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={forwardingEmail}
                required
                aria-describedby="forwarding-help"
                onChange={(event) => {
                  setForwardingEmail(event.target.value);
                  event.target.setCustomValidity(
                    event.target.value.trim().toLowerCase() === mailbox.email.toLowerCase()
                      ? m.forward_different()
                      : "",
                  );
                }}
              />
            </div>
          )}
        </div>

        <fieldset className="border-kumo-line bg-kumo-base rounded-lg border p-5">
          <legend className="text-kumo-default px-1 text-sm font-medium">{m.ai_features()}</legend>
          {(
            [
              ["assistant", m.ai_assistant()],
              ["replies", m.ai_replies()],
              ["spam", m.ai_spam()],
              ["summaries", m.ai_summaries()],
              ["mcp", m.mcp_access()],
            ] satisfies [keyof AIFeatures, string][]
          ).map(([feature, label]) => (
            <div key={feature} className="flex min-h-12 items-center">
              <Checkbox
                label={label}
                name={`aiFeatures.${feature}`}
                checked={aiFeatures[feature]}
                onCheckedChange={(checked) => setAIFeatures({ ...aiFeatures, [feature]: checked })}
              />
            </div>
          ))}
          <div className="mt-3">
            <Input
              label={m.ai_model()}
              name="aiModel"
              value={aiModel}
              onChange={(event) => setAIModel(event.target.value)}
              placeholder="@cf/meta/llama-3.3-70b-instruct-fp8-fast"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={200}
              aria-describedby="ai-model-help"
            />
            <p id="ai-model-help" className="text-kumo-subtle mt-2 text-xs">
              {m.ai_model_help()}{" "}
              <Link href="https://developers.cloudflare.com/workers-ai/models/" variant="current">
                {m.ai_catalog()}
              </Link>
            </p>
          </div>
        </fieldset>

        {/* Agent System Prompt */}
        {(aiFeatures.assistant || aiFeatures.replies) && (
          <div className="border-kumo-line bg-kumo-base rounded-lg border p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RobotIcon size={16} weight="duotone" className="text-kumo-subtle" />
                <span id="agent-prompt-label" className="text-kumo-default text-sm font-medium">
                  {m.agent_prompt()}
                </span>
                {isCustomPrompt ? (
                  <Badge variant="primary">{m.custom()}</Badge>
                ) : (
                  <Badge variant="secondary">{m.default_label()}</Badge>
                )}
              </div>
              {isCustomPrompt && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  icon={<ArrowCounterClockwiseIcon size={14} />}
                  onClick={handleResetPrompt}
                >
                  {m.reset_default()}
                </Button>
              )}
            </div>
            <p id="agent-prompt-description" className="text-kumo-subtle mb-3 text-xs">
              {m.prompt_description()}
            </p>
            <InputArea
              name="agentSystemPrompt"
              aria-labelledby="agent-prompt-label"
              aria-describedby="agent-prompt-description agent-prompt-help"
              value={agentPrompt}
              onChange={(e) => setAgentPrompt(e.target.value)}
              placeholder={m.prompt_placeholder()}
              rows={12}
              className="w-full resize-none font-mono text-xs/relaxed "
            />
            <p id="agent-prompt-help" className="text-kumo-subtle mt-2 text-xs">
              {m.prompt_help()}
            </p>
          </div>
        )}

        {/* Save */}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={isSaving} disabled={isSaving}>
            {m.save_changes()}
          </Button>
        </div>
      </form>
    </div>
  );
}
