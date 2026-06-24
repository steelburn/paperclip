// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SubscriptionCredentialsPanel } from "./SubscriptionCredentialsPanel";
import { TooltipProvider } from "@/components/ui/tooltip";

const mockSubscriptionCredentialsApi = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  upsert: vi.fn(),
  recordTestResult: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/api/subscriptionCredentials", () => ({
  subscriptionCredentialsApi: mockSubscriptionCredentialsApi,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

describe("SubscriptionCredentialsPanel", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);

    mockSubscriptionCredentialsApi.list.mockResolvedValue([]);
    mockSubscriptionCredentialsApi.upsert.mockResolvedValue({
      id: "credential-1",
      companyId: "company-1",
      userId: "user-1",
      provider: "claude",
      credentialKind: "claude_oauth_token",
      status: "active",
      testStatus: "untested",
      redactedMetadata: { kind: "claude_oauth_token", materialFormat: "token" },
      lastTestedAt: null,
      lastResolvedAt: null,
      createdAt: "2026-06-24T00:00:00.000Z",
      updatedAt: "2026-06-24T00:00:00.000Z",
    });
    mockSubscriptionCredentialsApi.remove.mockResolvedValue(undefined);
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("links a credential without echoing the submitted secret back into the form", async () => {
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <SubscriptionCredentialsPanel companyId="company-1" companyName="Paperclip" />
          </TooltipProvider>
        </QueryClientProvider>,
      );
    });
    await flushReact();
    await flushReact();

    expect(container.textContent).toContain("No Claude credential is linked for this user yet.");
    expect(container.textContent).toContain("No Codex credential is linked for this user yet.");

    const textareas = container.querySelectorAll("textarea");
    expect(textareas.length).toBeGreaterThan(0);
    const claudeTextarea = textareas[0] as HTMLTextAreaElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      setter?.call(claudeTextarea, "secret-token");
      claudeTextarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await flushReact();

    expect(claudeTextarea.value).toBe("secret-token");

    const linkButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent?.includes("Link credential"),
    ) as HTMLButtonElement | undefined;
    expect(linkButton).toBeDefined();

    await act(async () => {
      linkButton?.click();
    });
    await flushReact();
    await flushReact();

    expect(mockSubscriptionCredentialsApi.upsert).toHaveBeenCalledWith("company-1", {
      provider: "claude",
      credentialKind: "claude_oauth_token",
      material: "secret-token",
      status: "active",
    });
    expect(claudeTextarea.value).toBe("");
    expect(container.textContent).not.toContain("secret-token");

    await act(async () => {
      root.unmount();
    });
  });
});
