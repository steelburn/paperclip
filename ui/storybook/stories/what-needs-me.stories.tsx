import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowUpDown, CheckCircle2, Inbox, Layers, ListFilter } from "lucide-react";
import type { AttentionItem, AttentionSourceKind, AttentionSeverity, InboxDismissalKind } from "@paperclipai/shared";
import { AttentionQueueRow } from "@/components/AttentionQueueRow";
import { IssueGroupHeader } from "@/components/IssueGroupHeader";
import { Button } from "@/components/ui/button";
import {
  groupAttentionItems,
  sortAttentionItems,
  type AttentionGroupBy,
  type AttentionSortOrder,
} from "@/lib/attention";

const companyId = "company-storybook";

// Base "now" resolved once at module load so date buckets are stable per render.
const NOW = Date.parse("2026-07-10T12:00:00Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function dismissal(kind: InboxDismissalKind, snoozedUntil: string | null): AttentionItem["dismissal"] {
  return { kind, dismissedAt: new Date(NOW - HOUR).toISOString(), snoozedUntil, isActive: true };
}

function item(
  id: string,
  sourceKind: AttentionSourceKind,
  severity: AttentionSeverity,
  title: string,
  whyNow: string,
  overrides: Partial<AttentionItem> = {},
): AttentionItem {
  const now = new Date("2026-07-09T12:00:00Z");
  return {
    id,
    companyId,
    sourceKind,
    subject: {
      kind: "issue",
      id: `${id}-subject`,
      companyId,
      title,
      identifier: null,
      status: "pending",
      href: "/PAP/issues/PAP-1000",
      metadata: {},
    },
    whyNow,
    decisionVerbs: [
      { id: "approve", label: "Approve", description: null },
      { id: "reject", label: "Reject", description: null },
    ],
    inlineResolvable: false,
    entryRule: "",
    exitRule: "",
    dedupKey: `${id}-dedup`,
    dismissalKey: `attention:${id}-dedup`,
    severity,
    rank: 0,
    activityAt: now.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    relatedIssue: {
      kind: "issue",
      id: "issue-1000",
      companyId,
      title: "Ship the attention queue",
      identifier: "PAP-1000",
      status: "in_progress",
      href: "/PAP/issues/PAP-1000",
      metadata: {},
    },
    project: null,
    workspace: null,
    detail: null,
    dismissal: null,
    ...overrides,
  };
}

const POPULATED: AttentionItem[] = [
  item(
    "recov-1",
    "recovery_action",
    "critical",
    "Run watchdog escalated — agent stalled 40m",
    "Recovery action escalated and needs a human decision.",
    { subject: { kind: "recovery_action", id: "r1", companyId, title: "Run watchdog escalated — agent stalled 40m", identifier: null, status: "escalated", href: "/PAP/issues/PAP-1000", metadata: {} } },
  ),
  item(
    "appr-1",
    "approval",
    "high",
    "Hire agent: Research Analyst",
    "Approval is pending a board decision.",
    {
      inlineResolvable: true,
      subject: { kind: "approval", id: "approval-1", companyId, title: "Hire agent: Research Analyst", identifier: null, status: "pending", href: "/PAP/approvals/approval-1", metadata: { type: "hire_agent" } },
      relatedIssue: null,
      decisionVerbs: [
        { id: "approve", label: "Approve", description: null },
        { id: "reject", label: "Reject", description: null },
        { id: "request_revision", label: "Request revision", description: null },
      ],
    },
  ),
  item(
    "intx-1",
    "issue_thread_interaction",
    "medium",
    "Which rollout order should we use?",
    "Questions need answers on an issue thread.",
    {
      inlineResolvable: true,
      subject: { kind: "interaction", id: "interaction-1", companyId, title: "Which rollout order should we use?", identifier: null, status: "pending", href: "/PAP/issues/PAP-1000#interaction-1", metadata: { kind: "ask_user_questions", issueId: "issue-1000" } },
      decisionVerbs: [{ id: "respond", label: "Respond", description: null }],
    },
  ),
  item(
    "review-1",
    "review",
    "medium",
    "PR ready for review: attention feed endpoint",
    "In-review issue is waiting on a human reviewer.",
    {
      inlineResolvable: false,
      decisionVerbs: [
        { id: "approve", label: "Approve", description: null },
        { id: "request_changes", label: "Request changes", description: null },
      ],
    },
  ),
  item(
    "join-1",
    "join_request",
    "medium",
    "alex@acme.dev wants to join",
    "Join request is pending approval.",
    {
      inlineResolvable: true,
      subject: { kind: "join_request", id: "join-1", companyId, title: "alex@acme.dev wants to join", identifier: null, status: "pending_approval", href: "/PAP/settings/access", metadata: {} },
      relatedIssue: null,
    },
  ),
  item(
    "fail-1",
    "failed_run",
    "high",
    "Deploy pipeline failed after 3 retries",
    "Retries are exhausted; a human action is needed.",
    { relatedIssue: null, inlineResolvable: false },
  ),
  item(
    "budget-1",
    "budget_alert",
    "low",
    "Company budget crossed 85%",
    "Budget crossed the 85% threshold.",
    { relatedIssue: null, inlineResolvable: false },
  ),
];

// Spread activity across recent buckets + attach a couple of projects so the
// date/project group-by modes have something to show.
const ACTIVITY_OFFSETS: Record<string, number> = {
  "recov-1": NOW - 30 * 60 * 1000,
  "appr-1": NOW - 2 * HOUR,
  "intx-1": NOW - 26 * HOUR,
  "review-1": NOW - 27 * HOUR,
  "join-1": NOW - 3 * DAY,
  "fail-1": NOW - 5 * DAY,
  "budget-1": NOW - 40 * DAY,
};
const PROJECTS: Record<string, AttentionItem["project"]> = {
  "appr-1": { id: "proj-alpha", name: "Alpha", urlKey: "alpha" },
  "intx-1": { id: "proj-alpha", name: "Alpha", urlKey: "alpha" },
  "review-1": { id: "proj-beta", name: "Beta", urlKey: "beta" },
};
const POPULATED_DATED: AttentionItem[] = POPULATED.map((it) => ({
  ...it,
  activityAt: new Date(ACTIVITY_OFFSETS[it.id] ?? NOW).toISOString(),
  project: PROJECTS[it.id] ?? null,
}));

const SNOOZED: AttentionItem[] = [
  {
    ...item("snz-1", "review", "medium", "Design review: settings redesign", "Snoozed until this afternoon."),
    activityAt: new Date(NOW - 6 * HOUR).toISOString(),
    dismissal: dismissal("snooze", new Date(NOW + 3 * HOUR).toISOString()),
  },
  {
    ...item("snz-2", "budget_alert", "low", "Budget crossed 70%", "Snoozed until next week.", { inlineResolvable: false }),
    activityAt: new Date(NOW - 2 * DAY).toISOString(),
    dismissal: dismissal("snooze", new Date(NOW + 5 * DAY).toISOString()),
  },
];
const DISMISSED: AttentionItem[] = [
  {
    ...item("dsm-1", "agent_error_alert", "medium", "Agent error: research analyst", "Dismissed earlier today.", { inlineResolvable: false }),
    activityAt: new Date(NOW - 8 * HOUR).toISOString(),
    dismissal: dismissal("dismiss", null),
  },
];

function ToolbarButton({ icon: Icon, active }: { icon: typeof Layers; active?: boolean }) {
  return (
    <Button type="button" variant="outline" size="icon" className={active ? "h-8 w-8 shrink-0 bg-accent" : "h-8 w-8 shrink-0"}>
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );
}

function Queue({
  items,
  groupBy = "date",
  sortOrder = "newest",
  snoozed = [],
  dismissed = [],
  openCurtains = false,
}: {
  items: AttentionItem[];
  groupBy?: AttentionGroupBy;
  sortOrder?: AttentionSortOrder;
  snoozed?: AttentionItem[];
  dismissed?: AttentionItem[];
  openCurtains?: boolean;
}) {
  const firstInline = items.find((i) => i.inlineResolvable && (i.sourceKind === "approval" || i.sourceKind === "join_request"));
  const [expandedId, setExpandedId] = useState<string | null>(firstInline?.id ?? null);
  const [cleared, setCleared] = useState<Set<string>>(new Set());
  const visible = items.filter((i) => !cleared.has(i.id));

  const groups = useMemo(
    () => groupAttentionItems(sortAttentionItems(visible, sortOrder), groupBy, { now: NOW }),
    [visible, groupBy, sortOrder],
  );
  const count = visible.length;

  return (
    <div className="max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">What needs me</h1>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span className="text-sm text-muted-foreground">
              {count} {count === 1 ? "decision" : "decisions"}
            </span>
          )}
          <ToolbarButton icon={ListFilter} />
          <ToolbarButton icon={Layers} active={groupBy !== "date"} />
          <ToolbarButton icon={ArrowUpDown} />
        </div>
      </div>
      {count === 0 && snoozed.length === 0 && dismissed.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <div className="mb-4 rounded-full bg-green-500/10 p-4">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <p className="text-lg font-semibold text-foreground">You're all caught up</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Inbox className="h-4 w-4" />
            Nothing needs a decision from you right now.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.key} className="space-y-2">
              <IssueGroupHeader
                label={group.label}
                collapsible
                collapsed={false}
                trailing={<span className="text-xs tabular-nums text-muted-foreground">{group.items.length}</span>}
              />
              <div className="space-y-2">
                {group.items.map((it) => (
                  <AttentionQueueRow
                    key={it.id}
                    item={it}
                    companyId={companyId}
                    expanded={expandedId === it.id}
                    onToggleExpand={() => setExpandedId((p) => (p === it.id ? null : it.id))}
                    onDismiss={(d) => setCleared((prev) => new Set(prev).add(d.id))}
                    onSnooze={(d) => setCleared((prev) => new Set(prev).add(d.id))}
                  />
                ))}
              </div>
            </section>
          ))}

          {snoozed.length > 0 && (
            <section className="space-y-2">
              <IssueGroupHeader label={`Snoozed (${snoozed.length})`} collapsible collapsed={!openCurtains} className="text-muted-foreground" />
              {openCurtains && (
                <div className="space-y-2">
                  {snoozed.map((it) => (
                    <AttentionQueueRow
                      key={it.id}
                      item={it}
                      companyId={companyId}
                      variant="hidden"
                      expanded={false}
                      onToggleExpand={() => {}}
                      onDismiss={() => {}}
                      onRestore={() => {}}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {dismissed.length > 0 && (
            <section className="space-y-2">
              <IssueGroupHeader label={`Dismissed (${dismissed.length})`} collapsible collapsed={!openCurtains} className="text-muted-foreground" />
              {openCurtains && (
                <div className="space-y-2">
                  {dismissed.map((it) => (
                    <AttentionQueueRow
                      key={it.id}
                      item={it}
                      companyId={companyId}
                      variant="hidden"
                      expanded={false}
                      onToggleExpand={() => {}}
                      onDismiss={() => {}}
                      onRestore={() => {}}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

const meta: Meta<typeof Queue> = {
  title: "Pages/What needs me",
  component: Queue,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof Queue>;

export const DateGrouping: Story = {
  args: { items: POPULATED_DATED, groupBy: "date" },
};

export const GroupedByType: Story = {
  args: { items: POPULATED_DATED, groupBy: "type" },
};

export const GroupedByProject: Story = {
  args: { items: POPULATED_DATED, groupBy: "project" },
};

export const GroupedBySeverity: Story = {
  args: { items: POPULATED_DATED, groupBy: "severity" },
};

export const WithCurtains: Story = {
  args: { items: POPULATED_DATED.slice(0, 3), groupBy: "date", snoozed: SNOOZED, dismissed: DISMISSED, openCurtains: true },
};

export const ZeroState: Story = {
  args: { items: [] },
};
