import { isAxiosError } from 'axios';
import { filesize } from 'filesize';
import { ElMessage } from 'element-plus';
import { getBackupProgress, postDoBackup, type BackupProgress } from '~/api/backup';
import { showProgressMessage } from '~/utils/progress-message';

interface BackupWithProgressOptions {
  onFinished?: () => Promise<void>;
  successMessage?: string;
}

interface BackupWithProgressResult {
  ok: boolean;
  testMode?: boolean;
}

let activeBackup: Promise<BackupWithProgressResult> | null = null;
let watchingExisting = false;

function delay(ms: number) {
  return new Promise<void>(resolve => window.setTimeout(resolve, ms));
}

// 进度轮询专用：短超时、不重试、可取消。断网时快速失败，避免走全局 35s×4 重试链
// 把进度框卡住数分钟；取消时立即中断在途请求，stopPolling 不再等待超时。
function pollProgress(signal?: AbortSignal) {
  return getBackupProgress({
    timeout: 5000,
    signal,
    'axios-retry': { retries: 0 },
  });
}

function formatProgressMessage(progress: BackupProgress) {
  const base = progress.message || '正在备份';
  if (progress.fileName) {
    return `${base}：${progress.fileName}`;
  }
  return base;
}

function formatProgressDetail(progress: BackupProgress) {
  const details: string[] = [];
  if (progress.current > 0) {
    details.push(`已处理 ${progress.current} 个文件`);
  }
  if (progress.bytesCopied > 0) {
    details.push(`已写入 ${filesize(progress.bytesCopied)}`);
  }
  const message = formatProgressMessage(progress);
  return details.length > 0 ? `${message}（${details.join('，')}）` : message;
}

function getRequestErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    if (error.response?.status === 403) {
      return '没有权限执行备份，请重新登录后再试。';
    }
    if (error.response?.status === 401) {
      return '登录已失效，请重新登录后再试。';
    }
    if (error.code === 'ECONNABORTED') {
      return '等待备份结果超时，请稍后刷新备份列表确认。';
    }
    if (error.code === 'ERR_NETWORK' || !error.response) {
      return '连接不到服务器，无法确认备份状态。';
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return '备份失败，请检查服务器状态。';
}

function isUnauthorized(error: unknown) {
  return isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403);
}

export function runBackupWithProgress(
  selection: number,
  options: BackupWithProgressOptions = {},
): Promise<BackupWithProgressResult> {
  if (activeBackup) {
    ElMessage.info('备份已在进行中，请稍候。');
    return activeBackup;
  }
  if (watchingExisting) {
    ElMessage.info('备份已在进行中，请稍候。');
    return Promise.resolve({ ok: false });
  }

  activeBackup = runBackupWithProgressInner(selection, options).finally(() => {
    activeBackup = null;
  });
  return activeBackup;
}

async function runBackupWithProgressInner(
  selection: number,
  options: BackupWithProgressOptions,
): Promise<BackupWithProgressResult> {
  const box = showProgressMessage({
    title: '正在备份',
    message: '正在准备备份数据',
    indeterminate: true,
    type: 'info',
    // 允许手动关闭：断网或长时间无进度时用户可自行收起，备份仍在后台继续。
    showClose: true,
  });

  let sawRunning = false;
  let lastProgress: BackupProgress | undefined;
  let polling = true;
  let resolveFinished: (progress: BackupProgress) => void = () => {};
  const finished = new Promise<BackupProgress>(resolve => {
    resolveFinished = resolve;
  });

  const applyProgress = (progress: BackupProgress) => {
    if (progress.testMode) {
      return;
    }
    if (progress.running) {
      sawRunning = true;
    } else if (!sawRunning) {
      // 发起请求前进度接口返回的是上一次备份的完成状态，不能直接当成本次结果
      return;
    }
    lastProgress = progress;
    box.update({
      indeterminate: progress.running && progress.percentage <= 0,
      message: formatProgressDetail(progress),
      percentage: progress.percentage > 0 ? progress.percentage : undefined,
      status: progress.error ? 'exception' : undefined,
    });
  };

  const pollAbort = new AbortController();
  void (async () => {
    while (polling) {
      try {
        const progress = await pollProgress(pollAbort.signal);
        applyProgress(progress);
        if (sawRunning && !progress.running) {
          resolveFinished(progress);
          return;
        }
      } catch {
        // 轮询失败不结束进度框，等下一次重试
      }
      await delay(400);
    }
  })();

  const stopPolling = () => {
    polling = false;
    // 立即取消在途轮询，不等待其超时/重试链结束，避免断网时进度框长时间卡住。
    pollAbort.abort();
  };

  const finishSuccess = async (final?: BackupProgress) => {
    await stopPolling();
    const progress = final ?? (await pollProgress().catch(() => undefined));
    box.update({
      indeterminate: false,
      message: progress?.message || '备份完成',
      percentage: 100,
      status: 'success',
    });
    if (options.onFinished) {
      try {
        await options.onFinished();
      } catch {
        // 刷新列表失败不影响备份结果提示
      }
    }
    await delay(400);
    box.close();
    ElMessage.success(options.successMessage ?? '备份完成');
    return { ok: true };
  };

  const finishError = async (message: string, warning = false) => {
    await stopPolling();
    box.update({
      indeterminate: false,
      message,
      percentage: undefined,
      status: warning ? 'warning' : 'exception',
    });
    await delay(1200);
    box.close();
    if (warning) {
      ElMessage.warning(message);
    } else {
      ElMessage.error(message);
    }
    return { ok: false };
  };

  let response: { success?: boolean; err?: string; testMode?: boolean } | undefined;
  let requestError: unknown;
  try {
    response = await postDoBackup(selection);
  } catch (error) {
    requestError = error;
  }

  if (response?.testMode) {
    await stopPolling();
    box.close();
    ElMessage.success('展示模式无法备份');
    return { ok: true, testMode: true };
  }

  if (response?.success) {
    const final = await pollProgress().catch(() => undefined);
    return finishSuccess(final);
  }

  // 请求超时、连接中断，或并发/重试撞上“已有备份进行中”时，服务端可能仍在备份；
  // 以进度接口为准继续等待，避免把还在写的大备份误判成失败。
  if (isUnauthorized(requestError)) {
    return finishError(getRequestErrorMessage(requestError));
  }

  if (!lastProgress?.running) {
    const latest = await pollProgress().catch(() => undefined);
    if (latest) {
      applyProgress(latest);
    }
  }

  if (lastProgress?.running || sawRunning) {
    const final = await Promise.race([finished, delay(30 * 60 * 1000).then(() => undefined)]);
    if (!final) {
      await stopPolling();
      box.update({
        indeterminate: false,
        message: '备份仍在后台进行，请稍后刷新备份列表确认。',
        percentage: undefined,
        status: 'warning',
      });
      await delay(1200);
      box.close();
      return { ok: false };
    }
    if (final.error) {
      return finishError(final.error);
    }
    return finishSuccess(final);
  }

  if (response && response.success === false) {
    const message = response.err || '备份失败';
    return finishError(message, message.includes('进行中'));
  }

  return finishError(getRequestErrorMessage(requestError));
}

// 页面打开时如果已有备份在跑（自动备份、其他标签页或指令触发），同样显示进度框。
export async function resumeBackupProgress(options: BackupWithProgressOptions = {}) {
  // 同一时间只保留一个恢复轮询；页面重新挂载时不能叠加第二个进度框。
  if (activeBackup || watchingExisting) {
    return;
  }
  // 先占位再发请求：守卫必须在首个 await 之前生效，否则快速重入（两次挂载落在
  // 同一次首查 RTT 内）会双双通过检查，叠出两个进度框、完成时重复提示。
  watchingExisting = true;

  let progress: BackupProgress | undefined;
  try {
    progress = await pollProgress();
  } catch {
    watchingExisting = false;
    return;
  }
  if (!progress || progress.testMode || !progress.running) {
    watchingExisting = false;
    return;
  }

  const box = showProgressMessage({
    title: '正在备份',
    message: formatProgressDetail(progress),
    indeterminate: progress.percentage <= 0,
    type: 'info',
    // 允许手动关闭：断网或长时间无进度时用户可自行收起，备份仍在后台继续。
    showClose: true,
  });

  let last = progress;
  const pollAbort = new AbortController();
  const deadline = Date.now() + 30 * 60 * 1000;
  try {
    while (Date.now() < deadline) {
      await delay(400);
      try {
        progress = await pollProgress(pollAbort.signal);
        if (progress.testMode) {
          box.close();
          return;
        }
        last = progress;
        box.update({
          indeterminate: progress.running && progress.percentage <= 0,
          message: formatProgressDetail(progress),
          percentage: progress.percentage > 0 ? progress.percentage : undefined,
          status: progress.error ? 'exception' : undefined,
        });
        if (!progress.running) {
          break;
        }
      } catch {
        // 忽略轮询失败
      }
    }

    if (last.running) {
      box.update({
        indeterminate: false,
        message: '备份仍在后台进行，请稍后刷新备份列表确认。',
        percentage: undefined,
        status: 'warning',
      });
      await delay(1200);
      box.close();
      return;
    }

    box.update({
      indeterminate: false,
      message: last.error || last.message || '备份完成',
      percentage: last.error ? undefined : 100,
      status: last.error ? 'exception' : 'success',
    });
    if (!last.error && options.onFinished) {
      try {
        await options.onFinished();
      } catch {
        // 刷新列表失败不影响备份结果提示
      }
    }
    await delay(400);
    box.close();
    if (last.error) {
      ElMessage.error(last.error);
    } else {
      ElMessage.success(options.successMessage ?? '备份完成');
    }
  } finally {
    pollAbort.abort();
    watchingExisting = false;
  }
}
