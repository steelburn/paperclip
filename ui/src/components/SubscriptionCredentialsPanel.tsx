import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cloud, KeyRound, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import type {
  SubscriptionCredentialKind,
  SubscriptionCredentialProvider,
  SubscriptionCredentialReadModel,
  SubscriptionCredentialStatus,
} from "@paperclipai/shared";
import { subscriptionCredentialsApi } from "@/api/subscriptionCredentials";
import { queryKeys } from "@/lib/queryKeys";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "./agent-config-primitives";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ProviderConfig = {
  provider: SubscriptionCredentialProvider;
  label: string;
  icon: typeof Cloud;
  accentClassName: string;
  description: string;
  guidance: string;
  emptyState: string;
  kinds: Array<{
    value: SubscriptionCredentialKind;
    label: string;
    note: string;
  }>;
};

const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    provider: "claude",
    label: "Claude",
    icon: Cloud,
    accentClassName: "from-sky-500/20 via-cyan-500/10 to-transparent",
    description: "Use the official Claude Code subscription login or a pasted credentials JSON export.",
    guidance:
      "Paste either the Claude OAuth token or the contents of ~/.claude/.credentials.json from the official CLI.",
    emptyState: "No Claude credential is linked for this user yet.",
    kinds: [
      {
        value: "claude_oauth_token",
        label: "Claude OAuth token",
        note: "Paste the token string from Claude Code setup.",
      },
      {
        value: "claude_credentials_json",
        label: "Claude credentials JSON",
        note: "Paste the ~/.claude/.credentials.json document.",
      },
    ],
  },
  {
    provider: "codex",
    label: "Codex",
    icon: KeyRound,
    accentClassName: "from-emerald-500/20 via-teal-500/10 to-transparent",
    description: "Use the official Codex CLI subscription auth JSON for the signed-in employee.",
    guidance:
      "Paste the contents of ~/.codex/auth.json from the official Codex app or CLI.",
    emptyState: "No Codex credential is linked for this user yet.",
    kinds: [
      {
        value: "codex_auth_json",
        label: "Codex auth JSON",
        note: "Paste the ~/.codex/auth.json document.",
      },
    ],
  },
];

function kindLabel(kind: SubscriptionCredentialKind): string {
  switch (kind) {
    case "claude_oauth_token":
      return "Claude OAuth token";
    case "claude_credentials_json":
      return "Claude credentials JSON";
    case "codex_auth_json":
      return "Codex auth JSON";
  }
}

function statusTone(status: SubscriptionCredentialStatus): "secondary" | "outline" | "destructive" {
  return status === "active" ? "secondary" : "outline";
}

function testStatusTone(testStatus: SubscriptionCredentialReadModel["testStatus"]): "secondary" | "outline" | "destructive" {
  if (testStatus === "ready") return "secondary";
  if (testStatus === "failed") return "destructive";
  return "outline";
}

function timestampLabel(value: string | null) {
  if (!value) return "-";
  return `${formatDateTime(value)} (${relativeTime(value)})`;
}

function describeMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata) return "-";
  const entries = Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null);
  if (entries.length === 0) return "-";
  return entries
    .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join(" | ");
}

interface SubscriptionCredentialsPanelProps {
  companyId: string;
  companyName: string;
}

export function SubscriptionCredentialsPanel({ companyId, companyName }: SubscriptionCredentialsPanelProps) {
  const queryClient = useQueryClient();
  const credentialsQuery = useQuery({
    queryKey: queryKeys.subscriptionCredentials.list(companyId),
    queryFn: () => subscriptionCredentialsApi.list(companyId),
  });

  const credentialsByProvider = useMemo(() => {
    const map = new Map<SubscriptionCredentialProvider, SubscriptionCredentialReadModel>();
    for (const credential of credentialsQuery.data ?? []) {
      map.set(credential.provider, credential);
    }
    return map;
  }, [credentialsQuery.data]);

  return (
    <section className="space-y-5">
      <div className="rounded-[28px] border border-border/70 bg-[linear-gradient(135deg,hsl(var(--primary))/12%,hsl(var(--accent))/10%,transparent_72%)] p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          <div className="rounded-2xl border border-border/60 bg-background/90 p-3 shadow-sm">
            <ShieldCheck className="size-5 text-primary" />
          </div>
          <div className="max-w-3xl space-y-2">
            <h2 className="text-xl font-semibold">Subscription credentials</h2>
            <p className="text-sm text-muted-foreground">
              Link a per-user Claude or Codex subscription credential for {companyName}. Paperclip encrypts the
              stored material at rest and only shows redacted metadata after submission.
            </p>
            <p className="text-sm text-muted-foreground">
              Use the official CLI or app for the signed-in employee. Do not paste another user&apos;s credentials
              or a company-shared secret.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm font-medium">How it works</p>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>Link once, then rotate by submitting fresh material for the same provider.</li>
              <li>Paperclip never re-displays the token or JSON body after save.</li>
              <li>Agents that prefer subscription mode look for the matching provider record here.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm font-medium">Status signals</p>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>Show the provider, credential kind, updated time, last test, and last use time.</li>
              <li>Missing records stay visible so it is obvious why subscription mode is unavailable.</li>
              <li>Validation errors are rendered inline below the form that triggered them.</li>
            </ul>
          </div>
        </div>
      </div>

      {credentialsQuery.isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {credentialsQuery.error instanceof Error
            ? credentialsQuery.error.message
            : "Failed to load subscription credentials."}
        </div>
      ) : null}

      {credentialsQuery.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading subscription credentials...</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {PROVIDER_CONFIGS.map((config) => (
            <SubscriptionCredentialCard
              key={config.provider}
              companyId={companyId}
              credential={credentialsByProvider.get(config.provider)}
              config={config}
              onSaved={async () => {
                await queryClient.invalidateQueries({ queryKey: queryKeys.subscriptionCredentials.list(companyId) });
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface SubscriptionCredentialCardProps {
  companyId: string;
  config: ProviderConfig;
  credential: SubscriptionCredentialReadModel | undefined;
  onSaved: () => Promise<void>;
}

function SubscriptionCredentialCard({ companyId, config, credential, onSaved }: SubscriptionCredentialCardProps) {
  const [credentialKind, setCredentialKind] = useState<SubscriptionCredentialKind>(
    credential?.credentialKind ?? config.kinds[0]?.value ?? "claude_oauth_token",
  );
  const [status, setStatus] = useState<SubscriptionCredentialStatus>(credential?.status ?? "active");
  const [material, setMaterial] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const isLinked = credential !== undefined;
  const Icon = config.icon;

  useEffect(() => {
    setCredentialKind(credential?.credentialKind ?? config.kinds[0]?.value ?? "claude_oauth_token");
    setStatus(credential?.status ?? "active");
    setMaterial("");
    setFormError(null);
  }, [credential?.credentialKind, credential?.status, credential?.updatedAt, config.kinds]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmedMaterial = material.trim();
      if (!trimmedMaterial) {
        throw new Error("Paste the credential material before saving.");
      }
      return subscriptionCredentialsApi.upsert(companyId, {
        provider: config.provider,
        credentialKind,
        material: trimmedMaterial,
        status,
      });
    },
    onSuccess: async () => {
      setFormError(null);
      setMaterial("");
      await onSaved();
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Failed to save subscription credential.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!credential) {
        throw new Error("No credential is linked for this provider.");
      }
      return subscriptionCredentialsApi.remove(companyId, credential.id);
    },
    onSuccess: async () => {
      setFormError(null);
      setMaterial("");
      await onSaved();
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Failed to unlink subscription credential.");
    },
  });

  return (
    <Card className="overflow-hidden border-border/70 shadow-sm">
      <div className={cn("h-1 bg-gradient-to-r", config.accentClassName)} />
      <CardHeader className="space-y-3 border-b border-border/60 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-9 items-center justify-center rounded-2xl border border-border/60 bg-background/85">
                <Icon className="size-4 text-foreground/80" />
              </span>
              <CardTitle>{config.label}</CardTitle>
            </div>
            <CardDescription>{config.description}</CardDescription>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge variant={credential ? statusTone(credential.status) : "outline"}>
              {credential?.status ?? "missing"}
            </Badge>
            <Badge variant={testStatusTone(credential?.testStatus ?? "untested")}>
              {credential?.testStatus ?? "untested"}
            </Badge>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{config.guidance}</p>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Credential kind</p>
            <p className="mt-1 text-sm font-medium">{credential ? kindLabel(credential.credentialKind) : "Not linked"}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Last updated</p>
            <p className="mt-1 text-sm font-medium">{timestampLabel(credential?.updatedAt ?? null)}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Last tested</p>
            <p className="mt-1 text-sm font-medium">{timestampLabel(credential?.lastTestedAt ?? null)}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Last used</p>
            <p className="mt-1 text-sm font-medium">{timestampLabel(credential?.lastResolvedAt ?? null)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
          {credential ? (
            <>
              <span className="font-medium text-foreground">Redacted metadata:</span>{" "}
              {describeMetadata(credential.redactedMetadata)}
            </>
          ) : (
            config.emptyState
          )}
        </div>

        <Separator />

        {formError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
            {formError}
          </div>
        ) : null}

        <div className="grid gap-4">
          <Field label="Credential kind" hint="Choose the credential shape that matches the pasted material.">
            <div className="grid gap-2 sm:grid-cols-2">
              {config.kinds.map((kind) => (
                <button
                  key={kind.value}
                  type="button"
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
                    credentialKind === kind.value
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border/60 bg-muted/10 text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                  )}
                  onClick={() => setCredentialKind(kind.value)}
                >
                  <div className="font-medium">{kind.label}</div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">{kind.note}</div>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Raw material" hint="Paste the token or JSON body once; Paperclip will not echo it back.">
            <Textarea
              value={material}
              onChange={(event) => setMaterial(event.target.value)}
              placeholder={config.provider === "claude" ? "Paste Claude token or JSON here..." : "Paste Codex auth JSON here..."}
              rows={7}
              spellCheck={false}
              autoComplete="off"
            />
          </Field>

          <Field label="Record status" hint="Disable a record without deleting it if the account should stop being used.">
            <div className="grid gap-2 sm:grid-cols-2">
              {(["active", "disabled"] as const).map((nextStatus) => (
                <button
                  key={nextStatus}
                  type="button"
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
                    status === nextStatus
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border/60 bg-muted/10 text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                  )}
                  onClick={() => setStatus(nextStatus)}
                >
                  <div className="font-medium">{nextStatus === "active" ? "Active" : "Disabled"}</div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">
                    {nextStatus === "active"
                      ? "Agents can use this credential when subscription mode is requested."
                      : "Keep the record for audit context while preventing new use."}
                  </div>
                </button>
              ))}
            </div>
          </Field>
        </div>
      </CardContent>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-6 py-4">
        <div className="text-xs text-muted-foreground">
          {isLinked
            ? "Submitting fresh material here rotates the existing per-user record for this provider."
            : "No secret is stored until you submit the form."}
        </div>
        <div className="flex flex-wrap gap-2">
          {credential ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending || saveMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Unlink
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || deleteMutation.isPending}
          >
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            {credential ? "Rotate credential" : "Link credential"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
