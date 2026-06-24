import type {
  SubscriptionCredentialKind,
  SubscriptionCredentialProvider,
  SubscriptionCredentialReadModel,
  SubscriptionCredentialStatus,
  SubscriptionCredentialTestStatus,
} from "@paperclipai/shared";
import { api } from "./client";

// Payload for linking (creating) or rotating (updating) a credential. The
// server keys the upsert on (company, user, provider), so a rotate is just an
// upsert with fresh `material` for the same provider. `material` is the raw
// pasted token / JSON document; it is sent once and never returned by the API.
export interface UpsertSubscriptionCredentialInput {
  provider: SubscriptionCredentialProvider;
  credentialKind: SubscriptionCredentialKind;
  material: string;
  status?: SubscriptionCredentialStatus;
}

export interface RecordTestResultInput {
  testStatus: SubscriptionCredentialTestStatus;
}

// All routes are company-scoped and resolve the acting board user server-side;
// the client never passes a userId. Responses are always the redacted read
// model; credential material is never echoed back.
export const subscriptionCredentialsApi = {
  list: (companyId: string) =>
    api.get<SubscriptionCredentialReadModel[]>(
      `/companies/${companyId}/subscription-credentials`,
    ),
  get: (companyId: string, credentialId: string) =>
    api.get<SubscriptionCredentialReadModel>(
      `/companies/${companyId}/subscription-credentials/${credentialId}`,
    ),
  // Link or rotate: upsert keyed by provider for the acting user.
  upsert: (companyId: string, data: UpsertSubscriptionCredentialInput) =>
    api.put<SubscriptionCredentialReadModel>(
      `/companies/${companyId}/subscription-credentials`,
      data,
    ),
  recordTestResult: (companyId: string, credentialId: string, data: RecordTestResultInput) =>
    api.post<SubscriptionCredentialReadModel>(
      `/companies/${companyId}/subscription-credentials/${credentialId}/test-result`,
      data,
    ),
  remove: (companyId: string, credentialId: string) =>
    api.delete<void>(`/companies/${companyId}/subscription-credentials/${credentialId}`),
};
