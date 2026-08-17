(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TextFormatterCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PRESETS = Object.freeze({
    safe: Object.freeze({
      spacingMode: 'safe',
      sentenceBreaks: false,
      normalizeBlanks: true,
      trimLines: true,
    }),
    note: Object.freeze({
      spacingMode: 'strong',
      sentenceBreaks: true,
      normalizeBlanks: true,
      trimLines: true,
    }),
    social: Object.freeze({
      spacingMode: 'strong',
      sentenceBreaks: false,
      normalizeBlanks: true,
      trimLines: true,
    }),
    markdown: Object.freeze({
      spacingMode: 'safe',
      sentenceBreaks: false,
      normalizeBlanks: true,
      trimLines: true,
    }),
  });

  const JAPANESE = '\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}々〆ヶ';
  const OPEN = '「『（【〈《〔［｛';
  const CLOSE = '、。！？）」』】〉》〕］｝：；';
  const PROTECTED_PATTERN = /`[^`\n]+`|!?\[[^\]\n]*\]\([^\n)]*\)|https?:\/\/[^\s<>{}\[\]]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/gu;

  function protectFragments(text) {
    const values = [];
    const protectedText = text.replace(PROTECTED_PATTERN, (value) => {
      const token = `\uE000${values.length}\uE001`;
      values.push(value);
      return token;
    });
    return {
      text: protectedText,
      restore(value) {
        return value.replace(/\uE000(\d+)\uE001/g, (_, index) => values[Number(index)] ?? '');
      },
    };
  }

  function cleanSpacing(text, mode) {
    if (mode === 'none') return text;
    const protectedValue = protectFragments(text);
    let result = protectedValue.text;

    const betweenJapanese = new RegExp(`([${JAPANESE}])[ \\u00a0]+(?=[${JAPANESE}])`, 'gu');
    const afterOpening = new RegExp(`([${OPEN}])[ \\u00a0]+`, 'gu');
    const beforeClosing = new RegExp(`[ \\u00a0]+(?=[${CLOSE}])`, 'gu');

    result = result
      .replace(betweenJapanese, '$1')
      .replace(afterOpening, '$1')
      .replace(beforeClosing, '');

    if (mode === 'strong') {
      const japaneseToLatin = new RegExp(`([${JAPANESE}${CLOSE}])[ \\u00a0]+(?=[A-Za-z0-9])`, 'gu');
      const latinToJapanese = new RegExp(`([A-Za-z0-9])[ \\u00a0]+(?=[${JAPANESE}${OPEN}])`, 'gu');
      result = result
        .replace(japaneseToLatin, '$1')
        .replace(latinToJapanese, '$1');
    }

    return protectedValue.restore(result);
  }

  function isStructuralMarkdownLine(line) {
    const trimmed = line.trim();
    return /^(?:#{1,6}\s|[-*_]{3,}\s*$|```|~~~|\|.*\||<[^>]+>)/.test(trimmed);
  }

  function isListOrQuoteLine(line) {
    return /^\s*(?:[-*+]\s+|\d+[.)]\s+|>+\s*)/.test(line);
  }

  function breakJapaneseSentences(text) {
    const protectedValue = protectFragments(text);
    const source = protectedValue.text;
    const opening = new Set(['「', '『', '（', '【', '〈', '《']);
    const closing = new Set(['」', '』', '）', '】', '〉', '》']);
    let depth = 0;
    let result = '';

    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      if (opening.has(character)) depth += 1;
      result += character;
      if (closing.has(character)) depth = Math.max(0, depth - 1);

      if (depth === 0 && /[。！？]/.test(character)) {
        const next = source[index + 1] || '';
        if (next && !/[。！？\n]/.test(next)) result += '\n\n';
      }
    }

    return protectedValue.restore(result);
  }

  function formatLine(line, options) {
    if (line.trim() === '' || isStructuralMarkdownLine(line)) return line;

    const prefixMatch = line.match(/^(\s*(?:[-*+]\s+|\d+[.)]\s+|>+\s*))/);
    const prefix = prefixMatch ? prefixMatch[1] : '';
    let content = prefix ? line.slice(prefix.length) : line;
    content = cleanSpacing(content, options.spacingMode);

    if (options.sentenceBreaks && !isListOrQuoteLine(line)) {
      content = breakJapaneseSentences(content);
    }

    return prefix + content;
  }

  function formatText(input, suppliedOptions) {
    const options = { ...PRESETS.safe, ...(suppliedOptions || {}) };
    const lines = String(input ?? '').replace(/\r\n?/g, '\n').split('\n');
    const output = [];
    let fence = null;

    for (const originalLine of lines) {
      const fenceMatch = originalLine.match(/^\s*(```+|~~~+)/);
      if (fenceMatch) {
        const marker = fenceMatch[1][0];
        if (fence === null) fence = marker;
        else if (fence === marker) fence = null;
        output.push(originalLine);
        continue;
      }

      if (fence !== null) {
        output.push(originalLine);
        continue;
      }

      const line = options.trimLines ? originalLine.replace(/[\t \u00a0]+$/g, '') : originalLine;
      output.push(formatLine(line, options));
    }

    let result = output.join('\n');
    if (options.normalizeBlanks) result = result.replace(/\n[\t ]*\n(?:[\t ]*\n)+/g, '\n\n');
    return result.trim();
  }

  return {
    PRESETS,
    cleanSpacing,
    breakJapaneseSentences,
    formatText,
  };
});
