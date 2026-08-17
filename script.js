'use strict';

const { formatText } = window.TextFormatterCore;

const elements = {
  input: document.getElementById('input'),
  output: document.getElementById('output'),
  inputCount: document.getElementById('input-count'),
  outputCount: document.getElementById('output-count'),
  format: document.getElementById('format-btn'),
  clear: document.getElementById('clear-btn'),
  copy: document.getElementById('copy-btn'),
  reuse: document.getElementById('reuse-btn'),
  sample: document.getElementById('sample-btn'),
  cleanSpacing: document.getElementById('clean-spacing'),
  tightenLatin: document.getElementById('tighten-latin'),
  sentenceBreaks: document.getElementById('sentence-breaks'),
  normalizeBlanks: document.getElementById('normalize-blanks'),
  status: document.getElementById('result-status'),
  toast: document.getElementById('toast'),
};

let toastTimer;

function getOptions() {
  return {
    spacingMode: elements.cleanSpacing.checked
      ? (elements.tightenLatin.checked ? 'strong' : 'safe')
      : 'none',
    sentenceBreaks: elements.sentenceBreaks.checked,
    normalizeBlanks: elements.normalizeBlanks.checked,
    trimLines: true,
  };
}

function updateRuleAvailability() {
  elements.tightenLatin.disabled = !elements.cleanSpacing.checked;
  elements.tightenLatin.closest('.rule-option').classList.toggle('is-disabled', !elements.cleanSpacing.checked);
}

function updateCounts() {
  elements.inputCount.textContent = String(Array.from(elements.input.value).length);
  elements.outputCount.textContent = String(Array.from(elements.output.value).length);
  const hasOutput = elements.output.value.length > 0;
  elements.copy.disabled = !hasOutput;
  elements.reuse.disabled = !hasOutput;
}

function setStatus(message, hasResult = false) {
  elements.status.lastElementChild.textContent = message;
  elements.status.classList.toggle('has-result', hasResult);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => elements.toast.classList.remove('is-visible'), 2200);
}

function runFormatter() {
  const input = elements.input.value;
  if (!input.trim()) {
    setStatus('文章を入力してください');
    elements.input.focus();
    return;
  }

  const output = formatText(input, getOptions());
  elements.output.value = output;
  updateCounts();

  if (output === input.trim()) {
    setStatus('変更する箇所はありませんでした', true);
  } else {
    setStatus('整形が完了しました。内容を確認してコピーしてください', true);
  }

  if (window.matchMedia('(max-width: 900px)').matches) {
    elements.output.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function nodeToText(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  const tag = node.tagName ? node.tagName.toLowerCase() : '';
  const inner = () => Array.from(node.childNodes).map(nodeToText).join('');

  if (tag === 'ol' || tag === 'ul') {
    return Array.from(node.children)
      .filter((child) => child.tagName.toLowerCase() === 'li')
      .map((child, index) => `${tag === 'ol' ? `${index + 1}.` : '-'} ${nodeToText(child).trim()}`)
      .join('\n') + '\n';
  }
  if (tag === 'li') return inner();
  if (tag === 'br') return '\n';
  if (tag === 'p' || tag === 'div') return inner() + '\n';
  if (/^h[1-6]$/.test(tag)) return `${'#'.repeat(Number(tag[1]))} ${inner()}\n`;
  if (tag === 'strong' || tag === 'b') return `**${inner()}**`;
  if (tag === 'em' || tag === 'i') return `*${inner()}*`;
  if (tag === 'a') return `[${inner()}](${node.href || ''})`;
  return inner();
}

function htmlToText(html) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  return nodeToText(wrapper).replace(/\n{3,}/g, '\n\n').trim();
}

function textToHtml(text) {
  const escapeHtml = (value) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return text
    .split(/\n\n+/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

[elements.cleanSpacing, elements.tightenLatin, elements.sentenceBreaks, elements.normalizeBlanks]
  .forEach((control) => control.addEventListener('change', updateRuleAvailability));

elements.input.addEventListener('input', () => {
  updateCounts();
  if (!elements.input.value && !elements.output.value) setStatus('入力待ちです');
});

elements.output.addEventListener('input', updateCounts);

elements.input.addEventListener('paste', (event) => {
  const html = event.clipboardData?.getData('text/html');
  if (!html) return;
  event.preventDefault();
  const text = htmlToText(html);
  const start = elements.input.selectionStart;
  const end = elements.input.selectionEnd;
  elements.input.setRangeText(text, start, end, 'end');
  elements.input.dispatchEvent(new Event('input'));
});

elements.format.addEventListener('click', runFormatter);

elements.input.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    runFormatter();
  }
});

elements.clear.addEventListener('click', () => {
  elements.input.value = '';
  elements.output.value = '';
  updateCounts();
  setStatus('入力待ちです');
  elements.input.focus();
});

elements.sample.addEventListener('click', () => {
  elements.input.value = `生成 AI を使うと、文章の間に 不自然な 空白が入ることがあります。ですが、URL https://example.com/tools や Markdown の [リンク](https://example.com) は壊したくありません。\n\n## 確認項目\n\n- 日本語 の空白を整える\n- \`inline code\` は変更しない\n- 最後に内容を確認する`;
  updateCounts();
  setStatus('サンプルを入力しました');
});

elements.reuse.addEventListener('click', () => {
  elements.input.value = elements.output.value;
  elements.output.value = '';
  updateCounts();
  setStatus('結果を入力欄へ戻しました');
  elements.input.focus();
});

elements.copy.addEventListener('click', async () => {
  const output = elements.output.value;
  if (!output) return;

  try {
    if (window.ClipboardItem && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([output], { type: 'text/plain' }),
          'text/html': new Blob([textToHtml(output)], { type: 'text/html' }),
        }),
      ]);
    } else {
      await navigator.clipboard.writeText(output);
    }
    showToast('整形した文章をコピーしました');
  } catch {
    elements.output.select();
    document.execCommand('copy');
    showToast('整形した文章をコピーしました');
  }
});

updateRuleAvailability();
updateCounts();
