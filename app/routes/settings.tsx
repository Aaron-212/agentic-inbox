// Copyright (c) 2026 Cloudflare, Inc.
// SPDX-License-Identifier: Apache-2.0
// Modified by Aaron Ruan.

import { Badge, Button, Checkbox, Input, InputArea, Link, Loader, useKumoToastManager } from "@cloudflare/kumo";
import { RobotIcon, ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { getAIFeatures, type AIFeatures } from "shared/ai-features";
import { useMailbox, useUpdateMailbox } from "~/queries/mailboxes";

// Placeholder shown in the textarea when no custom prompt is set.
// The authoritative default prompt lives in workers/agent/index.ts (DEFAULT_SYSTEM_PROMPT).
const PROMPT_PLACEHOLDER = `You are an email assistant that helps manage this inbox. You read emails, draft replies, and help organize conversations.\n\nWrite like a real person. Short, direct, flowing prose. Plain text only.\n\n(Leave empty to use the full built-in default prompt)`;

export default function SettingsRoute() {
  const { mailboxId } = useParams<{ mailboxId: string }>();
  const toastManager = useKumoToastManager();
  const { data: mailbox } = useMailbox(mailboxId);
  const updateMailboxMutation = useUpdateMailbox();

  const [displayName, setDisplayName] = useState("");
  const [forwardingEnabled, setForwardingEnabled] = useState(false);
  const [forwardingEmail, setForwardingEmail] = useState("");
  const [aiFeatures, setAIFeatures] = useState(getAIFeatures);
  const [aiModel, setAIModel] = useState("");
  const [agentPrompt, setAgentPrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (mailbox) {
      setDisplayName(mailbox.settings?.fromName || mailbox.name || "");
      setAgentPrompt(mailbox.settings?.agentSystemPrompt || "");
      setAIFeatures(getAIFeatures(mailbox.settings));
      setAIModel(mailbox.settings?.aiModel || "");
      setForwardingEnabled(mailbox.settings?.forwarding?.enabled ?? false);
      setForwardingEmail(mailbox.settings?.forwarding?.email || "");
    }
  }, [mailbox]);

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
      toastManager.add({ title: "Settings saved!" });
    } catch (error) {
      toastManager.add({
        title: error instanceof Error ? error.message : "Failed to save settings",
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
    <div className="h-full overflow-y-auto px-4 py-4 md:px-8 md:py-6">
      <h1 className="text-kumo-default mb-6 text-lg font-semibold">Settings</h1>

      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
      >
        {/* Account */}
        <div className="border-kumo-line bg-kumo-base rounded-lg border p-5">
          <div className="text-kumo-default mb-4 text-sm font-medium">Account</div>
          <div className="space-y-3">
            <Input label="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <Input label="Email" type="email" value={mailbox.email} disabled />
          </div>
        </div>

        <div className="border-kumo-line bg-kumo-base rounded-lg border p-5">
          <div className="text-kumo-default mb-4 text-sm font-medium">Forwarding</div>
          <div>
            <Checkbox
              label="Forward incoming mail"
              name="forwardingEnabled"
              checked={forwardingEnabled}
              onCheckedChange={setForwardingEnabled}
            />
          </div>
          {forwardingEnabled && (
            <div className="mt-3">
              <Input
                label="Forward to"
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
                      ? "Enter an address different from this mailbox."
                      : "",
                  );
                }}
              />
            </div>
          )}
        </div>

        <fieldset className="border-kumo-line bg-kumo-base rounded-lg border p-5">
          <legend className="text-kumo-default px-1 text-sm font-medium">AI features</legend>
          {(
            [
              ["assistant", "AI assistant"],
              ["replies", "AI reply drafting"],
              ["spam", "AI spam detection"],
              ["mcp", "MCP access"],
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
              label="Workers AI model"
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
              Applies to the assistant, AI replies, and safety checks. Spam detection always uses Jev. Leave empty to
              use the built-in models. Choose a text-generation model with function calling for the assistant from the{" "}
              <Link href="https://developers.cloudflare.com/workers-ai/models/" variant="current">
                Workers AI catalog
              </Link>
              .
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
                  AI Agent Prompt
                </span>
                {isCustomPrompt ? <Badge variant="primary">Custom</Badge> : <Badge variant="secondary">Default</Badge>}
              </div>
              {isCustomPrompt && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  icon={<ArrowCounterClockwiseIcon size={14} />}
                  onClick={handleResetPrompt}
                >
                  Reset to default
                </Button>
              )}
            </div>
            <p id="agent-prompt-description" className="text-kumo-subtle mb-3 text-xs">
              Customize how the AI agent behaves for this mailbox. Leave empty to use the built-in default prompt.
            </p>
            <InputArea
              name="agentSystemPrompt"
              aria-labelledby="agent-prompt-label"
              aria-describedby="agent-prompt-description agent-prompt-help"
              value={agentPrompt}
              onChange={(e) => setAgentPrompt(e.target.value)}
              placeholder={PROMPT_PLACEHOLDER}
              rows={12}
              className="w-full resize-none font-mono text-xs leading-relaxed"
            />
            <p id="agent-prompt-help" className="text-kumo-subtle mt-2 text-xs">
              The prompt is sent as the system message to the AI model. It controls the agent's personality, writing
              style, and behavior rules.
            </p>
          </div>
        )}

        {/* Save */}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={isSaving} disabled={isSaving}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
