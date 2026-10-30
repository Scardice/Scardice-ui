export interface EndpointConfigPayload {
  version: number;
  payload: Record<string, unknown>;
}

export interface SecretRef {
  ref: string;
  version: number;
}

export interface EndpointConfigView {
  version: number;
  payload: Record<string, unknown>;
  secretRefs?: SecretRef[];
}

export interface CapabilityView {
  capabilities: string[];
  actions: string[];
}

export type DiagnosticSeverity = 1 | 2 | 3;

export interface DiagnosticField {
  key: string;
  value: string;
  redacted: boolean;
}

export interface DiagnosticEntry {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  fields?: DiagnosticField[];
}

export interface DiagnosticView {
  entries: DiagnosticEntry[] | null;
}

export type DesiredState = 'disabled' | 'enabled' | 'removing' | 'deleted';
export type ObservedState =
  | 'stopped'
  | 'starting'
  | 'connected'
  | 'stopping'
  | 'failed'
  | 'ambiguous';
export type EndpointOperationState = 'idle' | 'pending' | 'succeeded' | 'failed' | 'ambiguous';

export interface EndpointView {
  endpointId: string;
  displayName?: string;
  providerId?: string;
  groupNum?: number;
  cmdExecutedNum?: number;
  cmdExecutedLastTime?: number;
  onlineTotalTime?: number;
  adapterKey: string;
  config: EndpointConfigView;
  desiredState: DesiredState;
  observedState: ObservedState;
  operationState: EndpointOperationState;
  desiredVersion: number;
  generation: number;
  operationId?: string;
  correlationId?: string;
  version: number;
  capabilities: CapabilityView;
}

export type OperationStatus = 'pending' | 'succeeded' | 'failed' | 'ambiguous';

export interface OperationView {
  operationId: string;
  version: number;
  kind: string;
  status: OperationStatus;
  resultCode?: string;
  errorCode?: string;
  artifactId?: string;
  resourceId?: string;
  requestId?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface MutationResponse {
  operationId: string;
  endpoint?: EndpointView;
}

export interface ErrorResponse {
  code: string;
  message: string;
  requestId?: string;
}

export interface EndpointCreateRequest {
  endpointId?: string;
  displayName?: string;
  adapterKey: string;
  config: EndpointConfigPayload;
  secrets?: Record<string, string>;
  expectedAggregateVersion?: number;
  idempotencyKey?: string;
  confirm?: boolean;
}

export interface EndpointConfigRequest {
  config: EndpointConfigPayload;
  secrets?: Record<string, string>;
  expectedAggregateVersion: number;
  idempotencyKey?: string;
  confirm?: boolean;
}

export interface EndpointCommandRequest {
  expectedAggregateVersion: number;
  idempotencyKey?: string;
  confirm?: boolean;
}

export interface RequestQRCodeActionPayload {
  expectedAggregateVersion: number;
  idempotencyKey?: string;
}

export interface SubmitSMSCodeActionPayload {
  expectedAggregateVersion: number;
  smsCode: string;
  idempotencyKey?: string;
}

export interface SubmitCaptchaActionPayload {
  expectedAggregateVersion: number;
  captcha: string;
  idempotencyKey?: string;
}

export interface ValidateCredentialsActionPayload {
  expectedAggregateVersion: number;
  confirm: true;
  idempotencyKey?: string;
}

export interface GenerateConfigArtifactActionPayload {
  expectedAggregateVersion: number;
  confirm: true;
  ttlSeconds?: number;
  idempotencyKey?: string;
}

export type EndpointAction =
  | 'request-qr'
  | 'submit-sms-code'
  | 'submit-captcha'
  | 'validate-credentials'
  | 'generate-config-artifact';

export type EndpointActionPayload =
  | RequestQRCodeActionPayload
  | SubmitSMSCodeActionPayload
  | SubmitCaptchaActionPayload
  | ValidateCredentialsActionPayload
  | GenerateConfigArtifactActionPayload;

export type EndpointActionPayloadFor<A extends EndpointAction> = A extends 'request-qr'
  ? RequestQRCodeActionPayload
  : A extends 'submit-sms-code'
    ? SubmitSMSCodeActionPayload
    : A extends 'submit-captcha'
      ? SubmitCaptchaActionPayload
      : A extends 'validate-credentials'
        ? ValidateCredentialsActionPayload
        : GenerateConfigArtifactActionPayload;

export interface EndpointActionRequest {
  expectedAggregateVersion: number;
  idempotencyKey?: string;
  confirm?: boolean;
  ttlSeconds?: number;
  smsCode?: string;
  captcha?: string;
}

export interface ActionResponse {
  operationId: string;
  endpoint?: EndpointView;
  operation: OperationView;
  diagnostic: DiagnosticView;
}

export interface OperationResolveRequest {
  resolution: 'confirmed-success' | 'confirm-delete';
  expectedOperationVersion: number;
  expectedAggregateVersion: number;
  idempotencyKey?: string;
  confirm: true;
}

export interface EndpointArtifact {
  blob: Blob;
  filename?: string;
}

export type OperationTerminalStatus = Exclude<OperationStatus, 'pending'> | 'expired';
