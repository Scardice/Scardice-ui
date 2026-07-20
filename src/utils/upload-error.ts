import { isAxiosError } from 'axios';

function textFromUnknown(value: unknown) {
  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}

export function formatUploadFailureMessage(error: unknown, prefix = '上传失败') {
  if (isAxiosError<{ readonly err?: unknown; readonly message?: unknown }>(error)) {
    const responseData = error.response?.data;
    const responseMessage =
      textFromUnknown(responseData?.err) ?? textFromUnknown(responseData?.message);
    if (responseMessage) {
      return `${prefix}：${responseMessage}`;
    }
    if (error.message) {
      return `${prefix}：${error.message}`;
    }
    if (error.response?.status) {
      return `${prefix}：HTTP ${error.response.status}`;
    }
  }

  const message = textFromUnknown(error) ?? (error instanceof Error ? error.message : undefined);
  return `${prefix}：${message ?? '未知异常'}`;
}
