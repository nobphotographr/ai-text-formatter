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

    // Step 2: 句点（。）の後に改行を挿入
    content = breakAtKuten(content);

    processedLines.push(prefix + content);
  }

  return processedLines.join('\n');
}

// 句点（。）ごとに改行を入れる
function breakAtKuten(text) {
  if (!text.includes('。')) return text;

  const parts = text.split('。');
  const last = parts[parts.length - 1];

  if (last === '') {
    // 文末が 。 で終わる場合（最後に余分な改行を入れない）
    return parts.slice(0, -1).join('。\n') + '。';
  } else {
    // 途中に 。 がある場合
    return parts.join('。\n');
  }
}

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
