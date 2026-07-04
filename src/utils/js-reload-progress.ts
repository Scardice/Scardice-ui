import { isAxiosError } from 'axios';
import { ElMessage } from 'element-plus';
import { getJsReloadStatus, reloadJS, type JsReloadProgress } from '~/api/js';
import { showProgressMessage } from '~/utils/progress-message';

interface JsReloadWithProgressOptions {
  afterReload?: () => Promise<void>;
  successMessage?: string;
  testModeMessage?: string;
}

interface JsReloadWithProgressResult {
  ok: boolean;
  testMode?: boolean;
}

interface JsReloadResponse {
  testMode?: boolean;
}

let activeReload: Promise<JsReloadWithProgressResult> | null = null;

function delay(ms: number) {
  return new Promise<void>(resolve => window.setTimeout(resolve, ms));
}

function isReloadResponse(value: unknown): value is JsReloadResponse {
  return typeof value === 'object' && value !== null && 'testMode' in value;
}

function getReloadErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    if (error.response?.status === 400) {
      return '已有 JS 重载正在进行中，请稍候。';
    }
    if (error.response?.status === 403) {
      return '没有权限重载 JS，请重新登录后再试。';
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || !error.response) {
      return '连接不到服务器，无法确认 JS 重载状态。';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '重载 JS 失败，请检查服务器状态。';
}

function formatProgressMessage(progress: JsReloadProgress) {
  if (progress.scriptName) {
    return `${progress.message}：${progress.scriptName}`;
  }
  return progress.message || '正在重载 JS，请稍候。';
}

async function runJsReloadWithProgressInner(
  options: JsReloadWithProgressOptions,
): Promise<JsReloadWithProgressResult> {
  const progressMessage = showProgressMessage({
    title: '正在重载 JS',
    message: '已发起重载请求，正在等待服务器开始处理。',
    percentage: 0,
    type: 'info',
    showClose: false,
  });
  let polling = true;

  const pollProgress = async () => {
    while (polling) {
      try {
        const progress = await getJsReloadStatus();
        progressMessage.update({
          indeterminate: progress.running && progress.percentage <= 0,
          message: formatProgressMessage(progress),
          percentage: progress.percentage,
          status: progress.error ? 'exception' : undefined,
        });
      } catch {
        progressMessage.update({
          indeterminate: true,
          message: '重载请求已发出，正在等待服务器返回进度。',
          percentage: undefined,
        });
      }
      await delay(350);
    }
  };

  const pollPromise = pollProgress();

  try {
    const response = await reloadJS();
    polling = false;
    await pollPromise;

    if (isReloadResponse(response) && response.testMode) {
      progressMessage.close();
      ElMessage.success(options.testModeMessage ?? '展示模式无法重载 JS');
      return { ok: true, testMode: true };
    }

    let finalProgress: JsReloadProgress | undefined;
    try {
      finalProgress = await getJsReloadStatus();
    } catch {
      finalProgress = undefined;
    }

    progressMessage.update({
      indeterminate: false,
      message: finalProgress?.message || 'JS 重载完成，正在刷新界面数据。',
      percentage: finalProgress?.percentage ?? 100,
      status: 'success',
    });

    if (options.afterReload) {
      progressMessage.update({
        message: 'JS 重载完成，正在刷新界面数据。',
        percentage: 98,
        status: undefined,
      });
      await options.afterReload();
      progressMessage.update({
        message: 'JS 重载完成，界面数据已刷新。',
        percentage: 100,
        status: 'success',
      });
    }

    await delay(500);
    progressMessage.close();
    ElMessage.success(options.successMessage ?? '已重载 JS');
    return { ok: true };
  } catch (error) {
    polling = false;
    await pollPromise;
    progressMessage.close();
    ElMessage.error(getReloadErrorMessage(error));
    return { ok: false };
  }
}

export function runJsReloadWithProgress(
  options: JsReloadWithProgressOptions = {},
): Promise<JsReloadWithProgressResult> {
  if (activeReload) {
    ElMessage.info('JS 重载已在进行中，请稍候。');
    return activeReload;
  }

  activeReload = runJsReloadWithProgressInner(options).finally(() => {
    activeReload = null;
  });
  return activeReload;
}
