import request, { http } from '..';
import type {
  ActionResponse,
  DiagnosticView,
  EndpointAction,
  EndpointActionRequest,
  EndpointArtifact,
  EndpointCommandRequest,
  EndpointConfigRequest,
  EndpointCreateRequest,
  EndpointView,
  ErrorResponse,
  MutationResponse,
  OperationResolveRequest,
  OperationView,
  OperationTerminalStatus,
} from './types';

export * from './types';

const newIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};
const mutationRequest = <T>(
  method: 'post' | 'patch' | 'delete',
  url: string,
  body: object,
  key?: string,
) => {
  const bodyRecord = body as Record<string, unknown>;
  const idempotencyKey = key || String(bodyRecord.idempotencyKey || newIdempotencyKey());
  const payload = { ...bodyRecord, idempotencyKey };
  if (method === 'delete') {
    return http.request<T, T>({
      method,
      url,
      data: payload,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }
  return request<T>(method, url, payload, 'json', {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
};

export function listEndpoints() {
  return request<EndpointView[]>('get', '/endpoints');
}

export function getEndpoint(endpointId: string) {
  return request<EndpointView>('get', `/endpoints/${encodeURIComponent(endpointId)}`);
}

export function createEndpoint(input: EndpointCreateRequest) {
  return mutationRequest<MutationResponse>('post', '/endpoints', input, input.idempotencyKey);
}

export function patchEndpointConfig(endpointId: string, input: EndpointConfigRequest) {
  return mutationRequest<MutationResponse>(
    'patch',
    `/endpoints/${encodeURIComponent(endpointId)}/config`,
    input,
    input.idempotencyKey,
  );
}

function endpointCommand(
  endpointId: string,
  command: 'enable' | 'disable' | 'relogin',
  input: EndpointCommandRequest,
) {
  return mutationRequest<MutationResponse>(
    'post',
    `/endpoints/${encodeURIComponent(endpointId)}/${command}`,
    input,
    input.idempotencyKey,
  );
}

export const enableEndpoint = (endpointId: string, input: EndpointCommandRequest) =>
  endpointCommand(endpointId, 'enable', input);
export const disableEndpoint = (endpointId: string, input: EndpointCommandRequest) =>
  endpointCommand(endpointId, 'disable', input);
export const reloginEndpoint = (endpointId: string, input: EndpointCommandRequest) =>
  endpointCommand(endpointId, 'relogin', input);

export function deleteEndpoint(endpointId: string, input: EndpointCommandRequest) {
  return mutationRequest<MutationResponse>(
    'delete',
    `/endpoints/${encodeURIComponent(endpointId)}`,
    input,
    input.idempotencyKey,
  );
}

export function getEndpointDiagnostics(endpointId: string) {
  return request<DiagnosticView>('get', `/endpoints/${encodeURIComponent(endpointId)}/diagnostics`);
}
export function performEndpointAction(
  endpointId: string,
  action: EndpointAction,
  input: EndpointActionRequest,
) {
  return mutationRequest<ActionResponse>(
    'post',
    `/endpoints/${encodeURIComponent(endpointId)}/actions/${action}`,
    input,
    input.idempotencyKey,
  );
}

export function getOperation(operationId: string) {
  return request<OperationView>('get', `/operations/${encodeURIComponent(operationId)}`);
}

export function resolveOperation(operationId: string, input: OperationResolveRequest) {
  return mutationRequest<MutationResponse>(
    'post',
    `/operations/${encodeURIComponent(operationId)}/resolve`,
    input,
    input.idempotencyKey,
  );
}

export async function getOperationArtifact(operationId: string): Promise<EndpointArtifact> {
  const response = await request<Blob>(
    'get',
    `/operations/${encodeURIComponent(operationId)}/artifact`,
    undefined,
    'json',
    { responseType: 'blob' },
  );
  return { blob: response };
}

const terminalStatuses = new Set<OperationTerminalStatus>([
  'succeeded',
  'failed',
  'expired',
  'ambiguous',
]);

export function isTerminalOperation(operation: OperationView): boolean {
  return terminalStatuses.has(operation.status.toLowerCase() as OperationTerminalStatus);
}

export async function waitForOperation(
  operationId: string,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<OperationView> {
  const started = Date.now();
  let delay = 500;
  while (true) {
    if (options.signal?.aborted) {
      throw new DOMException('Operation polling cancelled', 'AbortError');
    }
    const operation = await getOperation(operationId);
    if (isTerminalOperation(operation)) {
      return operation;
    }
    if (options.timeoutMs && Date.now() - started >= options.timeoutMs) {
      return { ...operation, status: 'ambiguous' };
    }
    const jitter = 0.8 + Math.random() * 0.4;
    const waitMs = Math.min(5000, delay) * jitter;
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(resolve, waitMs);
      const onAbort = () => {
        window.clearTimeout(timer);
        reject(new DOMException('Operation polling cancelled', 'AbortError'));
      };
      options.signal?.addEventListener('abort', onAbort, { once: true });
    });
    delay = Math.min(5000, delay * 2);
  }
}

export function isErrorResponse(value: unknown): value is ErrorResponse {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.code === 'string' && typeof candidate.message === 'string';
}
