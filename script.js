// テキスト整形ロジック

function formatText(input) {
  const lines = input.split(/\r?\n/);
  const processedLines = [];
  let inCodeBlock = false;

  for (const line of lines) {
    // コードブロック（```）の中は一切加工しない
    if (/^```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      processedLines.push(line);
      continue;
    }
    if (inCodeBlock) {
      processedLines.push(line);
      continue;
    }

    // 空行はそのまま維持（段落区切り）
    if (line.trim() === '') {
      processedLines.push('');
      continue;
    }

    // マークダウンの構造行はそのまま維持
    if (
      /^#{1,6}\s/.test(line) ||         // 見出し: # ## ###
      /^[-*_]{3,}$/.test(line.trim())    // 水平線: --- *** ___
    ) {
      processedLines.push(line);
      continue;
    }

    // リスト・引用のプレフィックスを取り出して別途処理
    let prefix = '';
    let content = line;
    const prefixMatch = line.match(/^(\s*(?:[-*+]|\d+\.)\s+|>+\s*)/);
    if (prefixMatch) {
      prefix = prefixMatch[1];
      content = line.slice(prefix.length);
    }

    // Step 1: 半角スペース（ASCII U+0020）を削除
    //         全角スペース（U+3000）は残す
    content = content.replace(/ /g, '');

    // Step 2: 「」の中の句点を一時的に保護してから改行を挿入
    content = protectKuten(content);
    content = breakAtKuten(content);
    content = content.replace(/\x01/g, '。'); // 保護を解除

    processedLines.push(prefix + content);
  }

  // 行を結合してから、句点の後に空行が来ていない箇所を補完
  // 例: 「〜だよ。\n次の文」→「〜だよ。\n\n次の文」
  let result = processedLines.join('\n');
  result = result.replace(/。\n(?!\n)/g, '。\n\n');
  return result;
}

// 「」の中の句点を \x01 に置き換えて保護する（ネスト対応）
function protectKuten(text) {
  let depth = 0;
  let result = '';
  for (const ch of text) {
    if (ch === '「') { depth++; result += ch; }
    else if (ch === '」') { if (depth > 0) depth--; result += ch; }
    else if (ch === '。' && depth > 0) { result += '\x01'; } // 保護
    else { result += ch; }
  }
  return result;
}

// 句点（。）ごとに改行を入れる
function breakAtKuten(text) {
  if (!text.includes('。')) return text;

  const parts = text.split('。');
  const last = parts[parts.length - 1];

  if (last === '') {
    // 文末が 。 で終わる場合（最後に余分な空行を入れない）
    return parts.slice(0, -1).join('。\n\n') + '。';
  } else {
    // 途中に 。 がある場合
    return parts.join('。\n\n');
  }
}

// ---- HTMLからプレーンテキストへの変換（ペースト時に使用）----

// HTMLノードを再帰的にたどり、リスト番号などを復元したテキストを返す
function nodeToText(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;

  const tag = node.tagName ? node.tagName.toLowerCase() : '';
  const inner = () => Array.from(node.childNodes).map(nodeToText).join('');

  if (tag === 'ol') {
    let i = 1;
    return Array.from(node.children)
      .filter(li => li.tagName.toLowerCase() === 'li')
      .map(li => `${i++}. ${nodeToText(li).trim()}`)
      .join('\n') + '\n';
  }
  if (tag === 'ul') {
    return Array.from(node.children)
      .filter(li => li.tagName.toLowerCase() === 'li')
      .map(li => `- ${nodeToText(li).trim()}`)
      .join('\n') + '\n';
  }
  if (tag === 'li') return inner();
  if (tag === 'br') return '\n';
  if (tag === 'p')  return inner() + '\n';
  if (/^h[1-6]$/.test(tag)) return '#'.repeat(Number(tag[1])) + ' ' + inner() + '\n';
  if (tag === 'strong' || tag === 'b') return `**${inner()}**`;
  if (tag === 'em'     || tag === 'i') return `*${inner()}*`;
  return inner();
}

// クリップボードのHTMLをプレーンテキスト（リスト番号つき）に変換
function htmlToText(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return nodeToText(div).replace(/\n{3,}/g, '\n\n').trim();
}

// 入力エリアへのペーストをHTMLで横取り
document.getElementById('input').addEventListener('paste', (e) => {
  const html = e.clipboardData.getData('text/html');
  if (!html) return; // HTMLがなければ通常のペーストに任せる
  e.preventDefault();
  const text = htmlToText(html);
  const textarea = e.target;
  const start = textarea.selectionStart;
  const end   = textarea.selectionEnd;
  textarea.value =
    textarea.value.slice(0, start) + text + textarea.value.slice(end);
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
});

// ---- イベントリスナー ----

document.getElementById('format-btn').addEventListener('click', () => {
  const input = document.getElementById('input').value;
  if (!input.trim()) return;
  document.getElementById('output').value = formatText(input);
});

document.getElementById('clear-btn').addEventListener('click', () => {
  document.getElementById('input').value = '';
  document.getElementById('output').value = '';
});

document.getElementById('copy-btn').addEventListener('click', () => {
  const output = document.getElementById('output').value;
  if (!output) return;

  navigator.clipboard.writeText(output).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = 'コピーしました！';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'コピー';
      btn.classList.remove('copied');
    }, 2000);
  });
});
