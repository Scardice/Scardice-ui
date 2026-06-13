<script setup lang="ts">
interface TextPart {
  type: 'text';
  text: string;
}

interface ImagePart {
  type: 'image';
  src: string;
  caption: string;
  original: string;
}

type RichContentPart = TextPart | ImagePart;

const props = defineProps<{
  content: string;
}>();

const imageMarkerPattern = /\[图:([^\]]+)\]|\[CQ:image,([^\]]+)\]/g;
const base64PrefixPattern = /^(?:base64|base):\/\//i;
const cqImageTargetKeys = new Set(['file', 'url', 'file/url']);

const decodeCQParamValue = (value: string): string => {
  return value
    .replace(/&#44;/g, ',')
    .replace(/&#91;/g, '[')
    .replace(/&#93;/g, ']')
    .replace(/&amp;/gi, '&');
};

const parseCQImageTarget = (paramsText: string): string | undefined => {
  const paramMatches = [...paramsText.matchAll(/(?:^|,)\s*([^=,\s]+)\s*=/g)];
  for (const [index, match] of paramMatches.entries()) {
    const key = match[1]?.trim().toLowerCase();
    if (!cqImageTargetKeys.has(key)) {
      continue;
    }
    const valueStart = (match.index ?? 0) + match[0].length;
    const valueEnd = paramMatches[index + 1]?.index ?? paramsText.length;
    const value = decodeCQParamValue(paramsText.slice(valueStart, valueEnd).trim());
    if (value) {
      return value;
    }
  }
  return undefined;
};

const inferImageMimeType = (base64Text: string): string => {
  if (base64Text.startsWith('/9j/')) {
    return 'image/jpeg';
  }
  if (base64Text.startsWith('iVBORw0KGgo')) {
    return 'image/png';
  }
  if (base64Text.startsWith('R0lGOD')) {
    return 'image/gif';
  }
  if (base64Text.startsWith('UklGR')) {
    return 'image/webp';
  }
  return 'image/png';
};

const normalizeImageSource = (rawTarget: string): string | undefined => {
  const target = rawTarget.trim();
  if (/^https?:\/\//i.test(target)) {
    return target;
  }
  if (/^data:image\//i.test(target)) {
    return target;
  }
  if (base64PrefixPattern.test(target)) {
    const base64Text = target.replace(base64PrefixPattern, '').trim();
    if (!base64Text) {
      return undefined;
    }
    return `data:${inferImageMimeType(base64Text)};base64,${base64Text}`;
  }
  return undefined;
};

const shortenBase64Text = (rawTarget: string): string => {
  const target = rawTarget.trim();
  if (/^https?:\/\//i.test(target)) {
    return target;
  }
  if (/^data:image\//i.test(target)) {
    const commaIndex = target.indexOf(',');
    if (commaIndex === -1) {
      return target;
    }
    const prefix = target.slice(0, commaIndex + 1);
    const payload = target.slice(commaIndex + 1);
    if (payload.length <= 32) {
      return target;
    }
    return `${prefix}${payload.slice(0, 12)}...已省略 ${payload.length - 24} 字符...${payload.slice(-12)}`;
  }
  if (!base64PrefixPattern.test(target)) {
    return target;
  }
  const prefixMatch = target.match(base64PrefixPattern);
  const prefix = prefixMatch?.[0] ?? '';
  const payload = target.slice(prefix.length).trim();
  if (payload.length <= 32) {
    return target;
  }
  return `${prefix}${payload.slice(0, 12)}...已省略 ${payload.length - 24} 字符...${payload.slice(-12)}`;
};

const getCaption = (original: string, rawTarget: string): string => {
  if (/^https?:\/\//i.test(rawTarget.trim())) {
    return original;
  }
  return original.replace(rawTarget, shortenBase64Text(rawTarget));
};

const parseRichContent = (content: string): RichContentPart[] => {
  const parts: RichContentPart[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(imageMarkerPattern)) {
    const matchIndex = match.index ?? 0;
    const original = match[0];
    const rawTarget = match[1] ?? parseCQImageTarget(match[2] ?? '');
    if (!rawTarget) {
      continue;
    }
    const src = normalizeImageSource(rawTarget);
    if (!src) {
      continue;
    }
    if (matchIndex > lastIndex) {
      parts.push({ type: 'text', text: content.slice(lastIndex, matchIndex) });
    }
    parts.push({ type: 'image', src, caption: getCaption(original, rawTarget), original });
    lastIndex = matchIndex + original.length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', text: content.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: 'text', text: content }];
};

const parts = computed(() => parseRichContent(props.content));
</script>

<template>
  <span class="log-rich-content">
    <template v-for="(part, index) in parts" :key="`${part.type}-${index}`">
      <span v-if="part.type === 'text'" class="log-rich-content__text">{{ part.text }}</span>
      <span v-else class="log-rich-content__image-block">
        <img
          class="log-rich-content__image"
          :src="part.src"
          :alt="part.caption"
          loading="lazy"
          referrerpolicy="no-referrer" />
        <span class="log-rich-content__caption">{{ part.caption }}</span>
      </span>
    </template>
  </span>
</template>

<style scoped lang="css">
.log-rich-content {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.log-rich-content__text {
  white-space: pre-wrap;
}

.log-rich-content__image-block {
  display: block;
  margin: 0.35rem 0;
}

.log-rich-content__image {
  display: block;
  max-width: min(100%, 28rem);
  max-height: 22rem;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  background: #fff;
}

.log-rich-content__caption {
  display: block;
  margin-top: 0.25rem;
  color: var(--el-text-color-secondary);
  font-size: 0.78rem;
  line-height: 1.35;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
