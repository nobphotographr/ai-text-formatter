// テキスト整形ロジック
// ※ パターン確認後にここを更新します

function formatText(input) {
  // TODO: 実際のパターンを確認してから実装
  // 現在は仮の処理

  let text = input;

  // Step 1: 半角スペースを削除
  // （マークダウンの記法で必要なスペースは除外する必要があるか確認）

  // Step 2: 句点（。）ごとに改行を挿入

  // Step 3: 既存の改行を維持

  // Step 4: マークダウン記法を維持

  return text;
}

// イベントリスナー
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
