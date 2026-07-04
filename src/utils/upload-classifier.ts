import type { ParseError } from 'jsonc-parser';

type UploadTargetZone = 'js' | 'deck' | 'helpdoc' | 'customReply' | 'package';

type UploadDetectedType =
  | 'jsPlugin'
  | 'sealpack'
  | 'helpdocJson'
  | 'helpdocXlsx'
  | 'customReply'
  | 'deckJson'
  | 'deckYaml'
  | 'deckToml'
  | 'deckArchive'
  | 'unknown';

interface UploadDetectionResult {
  type: UploadDetectedType;
  label: string;
}

interface ConfirmUploadTargetMatchOptions {
  warnUnknown?: boolean;
}

interface ConfirmUploadTargetMatchResult {
  proceed: boolean;
  detected: UploadDetectionResult;
}

interface UploadTargetMeta {
  label: string;
  correctZoneLabel: string;
}

const ZIP_LOCAL_FILE_HEADER = [0x50, 0x4b, 0x03, 0x04] as const;

const targetMetaMap: Record<UploadTargetZone, UploadTargetMeta> = {
  js: {
    label: 'JS 插件区',
    correctZoneLabel: 'JS 插件区',
  },
  deck: {
    label: '牌堆区',
    correctZoneLabel: '牌堆区',
  },
  helpdoc: {
    label: '帮助文档区',
    correctZoneLabel: '帮助文档区',
  },
  customReply: {
    label: '自定义回复区',
    correctZoneLabel: '自定义回复区',
  },
  package: {
    label: '当前上传区',
    correctZoneLabel: '扩展包管理区',
  },
};

const targetExpectedExtensions: Record<UploadTargetZone, string[]> = {
  js: ['js', 'ts'],
  deck: ['json', 'jsonc', 'hjson', 'yaml', 'yml', 'toml', 'deck'],
  helpdoc: ['json', 'jsonc', 'hjson', 'xlsx'],
  customReply: ['yaml', 'yml', 'json', 'jsonc', 'hjson'],
  package: ['sealpack'],
};

const detectedTypeLabels: Record<UploadDetectedType, string> = {
  jsPlugin: 'JS 插件',
  sealpack: '扩展包压缩文件',
  helpdocJson: '帮助文档',
  helpdocXlsx: '帮助文档 Excel',
  customReply: '自定义回复',
  deckJson: 'JSON 牌堆',
  deckYaml: 'YAML 牌堆',
  deckToml: 'TOML 牌堆',
  deckArchive: '牌堆压缩包',
  unknown: '未知文件',
};

const detectedExpectedExtensions: Partial<Record<UploadDetectedType, string[]>> = {
  jsPlugin: ['js', 'ts'],
  sealpack: ['sealpack'],
  helpdocJson: ['json', 'jsonc', 'hjson'],
  helpdocXlsx: ['xlsx'],
  customReply: ['yaml', 'yml', 'json', 'jsonc', 'hjson'],
  deckJson: ['json', 'jsonc', 'hjson'],
  deckYaml: ['yaml', 'yml'],
  deckToml: ['toml'],
  deckArchive: ['deck'],
};

const mismatchTargetMap: Partial<Record<UploadDetectedType, UploadTargetZone>> = {
  jsPlugin: 'js',
  sealpack: 'package',
  helpdocJson: 'helpdoc',
  helpdocXlsx: 'helpdoc',
  customReply: 'customReply',
  deckJson: 'deck',
  deckYaml: 'deck',
  deckToml: 'deck',
  deckArchive: 'deck',
};

const jsonLikeExtensions = new Set(['json', 'jsonc', 'hjson', '']);
const yamlLikeExtensions = new Set(['yaml', 'yml', '']);
const deckYamlMetaKeys = new Set([
  'name',
  'author',
  'version',
  'command',
  'license',
  'desc',
  'info',
  'default',
  'store_id',
  'update_urls',
  'etag',
]);

let jsoncParserPromise: Promise<typeof import('jsonc-parser')> | null = null;
let yamlModulePromise: Promise<typeof import('yaml')> | null = null;

function loadJsoncParser() {
  jsoncParserPromise ??= import('jsonc-parser');
  return jsoncParserPromise;
}

function loadYamlModule() {
  yamlModulePromise ??= import('yaml');
  return yamlModulePromise;
}

function getFileExtension(file: Blob) {
  if (!(file instanceof File)) {
    return '';
  }

  return file.name.split('.').pop()?.toLowerCase() ?? '';
}

function formatSuffix(extension: string) {
  return extension ? `.${extension}` : '无后缀名';
}

function formatSuffixList(extensions: string[]) {
  return extensions.map(extension => `.${extension}`).join(' / ');
}

function isExpectedExtension(extension: string, expectedExtensions: string[]) {
  return expectedExtensions.includes(extension);
}

function hasZipSignature(bytes: Uint8Array) {
  if (bytes.length < ZIP_LOCAL_FILE_HEADER.length) {
    return false;
  }

  return ZIP_LOCAL_FILE_HEADER.every((value, index) => bytes[index] === value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function normalizeText(text: string) {
  return text.replace(/^\uFEFF/, '').trim();
}

function countOccurrences(text: string, token: string) {
  if (token.length === 0) {
    return 0;
  }

  let count = 0;
  let startIndex = 0;
  while (startIndex < text.length) {
    const foundIndex = text.indexOf(token, startIndex);
    if (foundIndex === -1) {
      break;
    }
    count += 1;
    startIndex = foundIndex + token.length;
  }
  return count;
}

function updateTripleQuoteState(line: string, currentDelimiter: "'''" | '"""' | null) {
  const delimiters: Array<"'''" | '"""'> = ["'''", '"""'];
  let nextDelimiter = currentDelimiter;

  for (const delimiter of delimiters) {
    const occurrences = countOccurrences(line, delimiter);
    if (occurrences === 0) {
      continue;
    }

    if (nextDelimiter === null) {
      if (occurrences % 2 === 1) {
        nextDelimiter = delimiter;
      }
      continue;
    }

    if (nextDelimiter === delimiter && occurrences % 2 === 1) {
      nextDelimiter = null;
    }
  }

  return nextDelimiter;
}

function stripHjsonComments(text: string) {
  const lines = text.split('\n');
  const result: string[] = [];
  let inString = false;
  let stringQuote = '';
  let tripleQuoteDelimiter: "'''" | '"""' | null = null;

  for (const line of lines) {
    if (tripleQuoteDelimiter !== null) {
      result.push(line);
      tripleQuoteDelimiter = updateTripleQuoteState(line, tripleQuoteDelimiter);
      continue;
    }

    let processedLine = '';
    let sawNonWhitespace = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1] ?? '';

      if (!inString) {
        const tripleCandidate = line.slice(index, index + 3);
        if (tripleCandidate === "'''" || tripleCandidate === '"""') {
          tripleQuoteDelimiter = tripleCandidate as "'''" | '"""';
          processedLine += tripleCandidate;
          index += 2;
          continue;
        }
      }

      if (inString) {
        processedLine += char;
        if (char === '\\') {
          processedLine += next;
          index += 1;
          continue;
        }
        if (char === stringQuote) {
          inString = false;
          stringQuote = '';
        }
        continue;
      }

      if (char === '"' || char === "'") {
        inString = true;
        stringQuote = char;
        processedLine += char;
        sawNonWhitespace = true;
        continue;
      }

      if (char === '#' && !sawNonWhitespace) {
        break;
      }

      if (char.trim() !== '') {
        sawNonWhitespace = true;
      }
      processedLine += char;
    }

    result.push(processedLine);
    if (tripleQuoteDelimiter !== null) {
      tripleQuoteDelimiter = updateTripleQuoteState(processedLine, tripleQuoteDelimiter);
    }
  }

  return result.join('\n');
}

function quoteHjsonKeys(text: string) {
  const lines = text.split('\n');
  const result: string[] = [];
  let tripleQuoteDelimiter: "'''" | '"""' | null = null;
  let continuationIndent = -1;

  for (const line of lines) {
    if (tripleQuoteDelimiter !== null) {
      result.push(line);
      tripleQuoteDelimiter = updateTripleQuoteState(line, tripleQuoteDelimiter);
      if (tripleQuoteDelimiter === null) {
        continuationIndent = -1;
      }
      continue;
    }

    const trimmed = line.trim();
    const indentMatch = line.match(/^\s*/);
    const indent = indentMatch?.[0] ?? '';

    if (trimmed === '') {
      result.push(line);
      continue;
    }

    if (continuationIndent >= 0 && indent.length > continuationIndent) {
      result.push(line);
      continue;
    }
    continuationIndent = -1;

    const keyMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:(.*)$/);
    if (!keyMatch) {
      result.push(line);
      continue;
    }

    const [, key, rest] = keyMatch;
    const rewrittenLine = `${indent}"${key}":${rest}`;
    result.push(rewrittenLine);

    const valueTail = rest.trim();
    if (
      valueTail !== '' &&
      !valueTail.endsWith(',') &&
      !valueTail.endsWith('{') &&
      !valueTail.endsWith('[') &&
      !valueTail.startsWith('{') &&
      !valueTail.startsWith('[')
    ) {
      continuationIndent = indent.length;
    }

    tripleQuoteDelimiter = updateTripleQuoteState(rewrittenLine, tripleQuoteDelimiter);
  }

  return result.join('\n');
}

function injectHjsonCommas(text: string) {
  const lines = text.split('\n');
  const result: string[] = [];
  let tripleQuoteDelimiter: "'''" | '"""' | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (
      tripleQuoteDelimiter !== null ||
      trimmed === '' ||
      trimmed.endsWith(',') ||
      trimmed.endsWith('{') ||
      trimmed.endsWith('[')
    ) {
      result.push(line);
      tripleQuoteDelimiter = updateTripleQuoteState(line, tripleQuoteDelimiter);
      continue;
    }

    const nextMeaningfulLine =
      lines
        .slice(index + 1)
        .find(item => item.trim() !== '')
        ?.trim() ?? '';
    const shouldAddComma =
      nextMeaningfulLine !== '' &&
      nextMeaningfulLine !== '}' &&
      nextMeaningfulLine !== ']' &&
      !trimmed.endsWith('}') &&
      !trimmed.endsWith(']');

    const nextLine = shouldAddComma ? `${line},` : line;
    result.push(nextLine);
    tripleQuoteDelimiter = updateTripleQuoteState(nextLine, tripleQuoteDelimiter);
  }

  return result.join('\n');
}

function hjsonToLikelyJson(text: string) {
  const withoutComments = stripHjsonComments(text);
  const withQuotedKeys = quoteHjsonKeys(withoutComments);
  return injectHjsonCommas(withQuotedKeys);
}

function isLikelyHjson(text: string) {
  return /(^|\n)\s*#/.test(text) || /(^|[\{,\n]\s*)[A-Za-z_][A-Za-z0-9_\-]*\s*:/.test(text);
}

function isCustomReplyStructure(data: Record<string, unknown>) {
  const hasReplyItems = Array.isArray(data.items);
  const hasReplyConditions = Array.isArray(data.conditions);
  const hasReplyEnable = typeof data.enable === 'boolean';
  return hasReplyEnable && (hasReplyItems || hasReplyConditions);
}

function isHelpdocStructure(data: Record<string, unknown>) {
  return isPlainObject(data.helpdoc);
}

function isDeckJsonStructure(data: Record<string, unknown>) {
  const deckKeys = Object.keys(data).filter(key => key !== '$schema');
  if (deckKeys.length === 0) {
    return false;
  }

  return deckKeys.every(key => isStringArray(data[key]));
}

function isDeckYamlStructure(data: Record<string, unknown>) {
  const keys = Object.keys(data);
  if (keys.length === 0) {
    return false;
  }

  if (keys.some(key => deckYamlMetaKeys.has(key))) {
    return true;
  }

  const nonMetaKeys = keys.filter(key => !deckYamlMetaKeys.has(key));
  return nonMetaKeys.length > 0 && nonMetaKeys.every(key => isStringArray(data[key]));
}

function detectStructuredTextType(text: string): UploadDetectionResult {
  if (/==UserScript==/.test(text)) {
    return {
      type: 'jsPlugin',
      label: detectedTypeLabels.jsPlugin,
    };
  }

  if (/^\s*\[meta\]\s*$/im.test(text) || /^\s*\[decks\]\s*$/im.test(text)) {
    return {
      type: 'deckToml',
      label: detectedTypeLabels.deckToml,
    };
  }

  return {
    type: 'unknown',
    label: detectedTypeLabels.unknown,
  };
}

async function tryParseJsonFamily(text: string, extension: string): Promise<unknown> {
  const jsonText = normalizeText(text);
  const jsoncParser = await loadJsoncParser();

  const tryStandardJson = () => JSON.parse(jsonText);
  const tryJsonc = () => {
    const errors: ParseError[] = [];
    const value = jsoncParser.parse(jsonText, errors, {
      allowTrailingComma: true,
      disallowComments: false,
    });
    if (errors.length > 0) {
      throw new Error('Invalid JSONC');
    }
    return value;
  };
  const tryHjson = () => {
    const hjsonLikeText = hjsonToLikelyJson(jsonText);
    return tryJsoncFromText(hjsonLikeText);
  };

  const tryJsoncFromText = (candidate: string) => {
    const errors: ParseError[] = [];
    const value = jsoncParser.parse(candidate, errors, {
      allowTrailingComma: true,
      disallowComments: false,
    });
    if (errors.length > 0) {
      throw new Error('Invalid JSON-like content');
    }
    return value;
  };

  if (extension === 'hjson') {
    return tryHjson();
  }

  if (extension === 'jsonc') {
    try {
      return tryJsonc();
    } catch {
      return isLikelyHjson(jsonText)
        ? tryHjson()
        : (() => {
            throw new Error('Invalid JSONC');
          })();
    }
  }

  try {
    return tryStandardJson();
  } catch {
    try {
      return tryJsonc();
    } catch {
      if (isLikelyHjson(jsonText)) {
        return tryHjson();
      }
      throw new Error('Invalid JSON family');
    }
  }
}

async function tryParseYaml(text: string): Promise<unknown> {
  const yamlModule = await loadYamlModule();
  const doc = yamlModule.parseDocument(text);
  if (doc.errors.length > 0) {
    throw new Error('Invalid YAML');
  }
  return doc.toJSON();
}

async function readFileHead(file: Blob, size: number): Promise<Uint8Array> {
  const buffer = await file.slice(0, size).arrayBuffer();
  return new Uint8Array(buffer);
}

async function readFileText(file: Blob, size: number): Promise<string> {
  const text = await file.slice(0, size).text();
  return normalizeText(text);
}

function detectParsedObjectType(
  data: Record<string, unknown>,
  source: 'json' | 'yaml',
): UploadDetectionResult {
  if (isHelpdocStructure(data)) {
    return {
      type: 'helpdocJson',
      label: detectedTypeLabels.helpdocJson,
    };
  }

  if (isCustomReplyStructure(data)) {
    return {
      type: 'customReply',
      label: detectedTypeLabels.customReply,
    };
  }

  if (source === 'json' && isDeckJsonStructure(data)) {
    return {
      type: 'deckJson',
      label: detectedTypeLabels.deckJson,
    };
  }

  if (source === 'yaml' && isDeckYamlStructure(data)) {
    return {
      type: 'deckYaml',
      label: detectedTypeLabels.deckYaml,
    };
  }

  return {
    type: 'unknown',
    label: detectedTypeLabels.unknown,
  };
}

export async function detectUploadContentType(file: Blob): Promise<UploadDetectionResult> {
  const headBytes = await readFileHead(file, 8192);
  const extension = getFileExtension(file);
  if (hasZipSignature(headBytes)) {
    if (extension === 'xlsx') {
      return {
        type: 'helpdocXlsx',
        label: detectedTypeLabels.helpdocXlsx,
      };
    }

    if (extension === 'deck') {
      return {
        type: 'deckArchive',
        label: detectedTypeLabels.deckArchive,
      };
    }

    if (extension === 'sealpack') {
      return {
        type: 'sealpack',
        label: detectedTypeLabels.sealpack,
      };
    }

    return {
      type: 'unknown',
      label: detectedTypeLabels.unknown,
    };
  }

  const text = await readFileText(file, 8192);
  if (text.length === 0) {
    return {
      type: 'unknown',
      label: detectedTypeLabels.unknown,
    };
  }

  const structuredTextResult = detectStructuredTextType(text);
  if (structuredTextResult.type !== 'unknown') {
    return structuredTextResult;
  }

  if (jsonLikeExtensions.has(extension)) {
    try {
      const parsed = await tryParseJsonFamily(text, extension);
      if (isPlainObject(parsed)) {
        const result = detectParsedObjectType(parsed, 'json');
        if (result.type !== 'unknown') {
          return result;
        }
      }
    } catch {
      // Keep probing other formats.
    }
  }

  if (yamlLikeExtensions.has(extension)) {
    try {
      const parsed = await tryParseYaml(text);
      if (isPlainObject(parsed)) {
        const result = detectParsedObjectType(parsed, 'yaml');
        if (result.type !== 'unknown') {
          return result;
        }
      }
    } catch {
      // Keep unknown when YAML syntax itself is invalid.
    }
  }

  return {
    type: 'unknown',
    label: detectedTypeLabels.unknown,
  };
}

async function showUploadConfirmation(message: string) {
  try {
    await ElMessageBox.confirm(message, '上传提醒', {
      confirmButtonText: '继续上传',
      cancelButtonText: '取消',
      confirmButtonType: 'default',
      cancelButtonType: 'primary',
      distinguishCancelAndClose: true,
      autofocus: false,
      type: 'warning',
    });
    return true;
  } catch {
    return false;
  }
}

async function showSuffixMismatchAlert(message: string) {
  await ElMessageBox.alert(message, '上传提示', {
    confirmButtonText: '知道了',
    type: 'error',
    autofocus: false,
  });
}

export async function confirmUploadTargetMatch(
  file: Blob,
  targetZone: UploadTargetZone,
  options: ConfirmUploadTargetMatchOptions = {},
): Promise<ConfirmUploadTargetMatchResult> {
  const detected = await detectUploadContentType(file);
  const expectedTarget = mismatchTargetMap[detected.type];
  const targetMeta = targetMetaMap[targetZone];
  const extension = getFileExtension(file);

  if (detected.type === 'unknown') {
    const targetExtensions = targetExpectedExtensions[targetZone];
    if (!isExpectedExtension(extension, targetExtensions)) {
      await showSuffixMismatchAlert(
        `目标位置（${targetMeta.label}）要求文件后缀名为 ${formatSuffixList(targetExtensions)}，当前文件后缀名为 ${formatSuffix(extension)}，请修改后缀名后重试`,
      );
      return {
        proceed: false,
        detected,
      };
    }
  } else {
    const expectedExtensions = detectedExpectedExtensions[detected.type];
    if (expectedExtensions && !isExpectedExtension(extension, expectedExtensions)) {
      await showSuffixMismatchAlert(
        `上传的文件内容（检测到${detected.label}）与文件后缀名（${formatSuffix(extension)}）不匹配，请修改为 ${formatSuffixList(expectedExtensions)} 后重试`,
      );
      return {
        proceed: false,
        detected,
      };
    }
  }

  if (!expectedTarget || expectedTarget === targetZone) {
    if (detected.type === 'unknown' && options.warnUnknown !== false) {
      const proceed = await showUploadConfirmation(
        '未能识别上传文件内容，上传的文件内容可能不正确或不标准，请检查文件内容和上传位置是否正确。是否仍要继续上传？',
      );
      return {
        proceed,
        detected,
      };
    }

    return {
      proceed: true,
      detected,
    };
  }

  const correctTargetMeta = targetMetaMap[expectedTarget];
  const proceed = await showUploadConfirmation(
    `上传的文件内容（检测到${detected.label}）疑似与目标位置（${targetMeta.label}）不匹配，请在正确功能区（${correctTargetMeta.correctZoneLabel}）上传`,
  );
  return {
    proceed,
    detected,
  };
}
