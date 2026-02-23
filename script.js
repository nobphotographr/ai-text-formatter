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

    // 番号付きリスト（1. 2. ...）の場合、最初の半角スペースを改行に変換
    // → 「1. タイトル 本文」の タイトルと本文を分離する
    if (/^\s*\d+\.\s/.test(prefix)) {
      const firstSpace = content.indexOf(' ');
      if (firstSpace !== -1) {
        content = content.slice(0, firstSpace) + '\n' + content.slice(firstSpace + 1);
      }
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

// プレーンテキスト → HTML変換（リッチテキストエディタ用）
//
// 「N. タイトル\n本文...」形式のブロックを <ol><li> に変換する。
// mond 等のエディタは <p>1. text</p> を自動リスト判定して番号を消すため、
// 正しい <ol><li> 構造で渡すことで番号を正しく表示させる。
function textToHtml(text) {
  const esc     = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const toInner = b => esc(b).replace(/\n/g, '<br>');

  const blocks = text.split(/\n\n/).map(b => b.trim()).filter(Boolean);

  const html = [];
  let inOl    = false;
  let liParts = null;       // 現在の <li> に入るコンテンツブロック
  let prevPara = false;     // 直前が通常段落かどうか（段落間に空行を入れるため）

  const flushLi = () => {
    if (liParts !== null) {
      html.push(`<li>${liParts.join('<br><br>')}</li>`);
      liParts = null;
    }
  };

  for (const block of blocks) {
    const listMatch = block.match(/^(\d+)\.\s+([\s\S]+)$/);

    if (listMatch) {
      // 番号付きリストアイテムの開始
      flushLi();
      if (!inOl) { html.push('<ol>'); inOl = true; prevPara = false; }
      liParts = [toInner(listMatch[2])];

    } else if (inOl) {
      // リスト内の本文（続き）
      liParts = liParts ?? [];
      liParts.push(toInner(block));

    } else {
      // リスト前の通常段落
      if (prevPara) html.push('<p><br></p>'); // 段落間の空行
      html.push(`<p>${toInner(block)}</p>`);
      prevPara = true;
    }
  }

  flushLi();
  if (inOl) html.push('</ol>');

  return html.join('\n');
}

document.getElementById('copy-btn').addEventListener('click', async () => {
  const output = document.getElementById('output').value;
  if (!output) return;

  const btn = document.getElementById('copy-btn');

  try {
    // HTML + プレーンテキストの両形式でコピー
    // → リッチテキストエディタ（mond等）では HTML が使われ空行が維持される
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html':  new Blob([textToHtml(output)], { type: 'text/html' }),
        'text/plain': new Blob([output],             { type: 'text/plain' }),
      }),
    ]);
  } catch {
    // ClipboardItem 非対応ブラウザはプレーンテキストで代替
    await navigator.clipboard.writeText(output);
  }

  btn.textContent = 'コピーしました！';
  btn.classList.add('copied');
  setTimeout(() => {
    btn.textContent = 'コピー';
    btn.classList.remove('copied');
  }, 2000);
});
