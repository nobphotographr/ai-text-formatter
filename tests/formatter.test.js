const test = require('node:test');
const assert = require('node:assert/strict');
const { PRESETS, formatText } = require('../formatter-core.js');

test('safe mode removes spaces only between Japanese characters', () => {
  assert.equal(
    formatText('これは 文章です。AI の URL は残します。', PRESETS.safe),
    'これは文章です。AI の URL は残します。',
  );
});

test('strong mode also removes spaces between Japanese and Latin text', () => {
  assert.equal(
    formatText('生成 AI の文章を 3 枚作る。', PRESETS.social),
    '生成AIの文章を3枚作る。',
  );
});

test('URLs, email addresses, markdown links and inline code are preserved', () => {
  const source = 'URL https://example.com/a-b?q=1 と [リンク](https://example.com) と `const value = 1`、mail@example.com';
  assert.equal(formatText(source, PRESETS.note).replace(/\n/g, ''), source);
});

test('fenced code blocks are never changed', () => {
  const source = '説明 文です。\n```js\nconst value = "日本語 の 空白";\n```';
  const output = formatText(source, PRESETS.note);
  assert.match(output, /const value = "日本語 の 空白";/);
});

test('note mode inserts blank lines after Japanese sentence punctuation', () => {
  assert.equal(
    formatText('最初の文です。次の文です！最後です。', PRESETS.note),
    '最初の文です。\n\n次の文です！\n\n最後です。',
  );
});

test('sentence punctuation inside Japanese quotes is not split', () => {
  assert.equal(
    formatText('彼は「そのままで良い。」と答えた。次へ進む。', PRESETS.note),
    '彼は「そのままで良い。」と答えた。\n\n次へ進む。',
  );
});

test('markdown structure and list prefixes remain intact', () => {
  const source = '## 見出し\n\n- 日本語 の項目\n- URL https://example.com';
  assert.equal(
    formatText(source, PRESETS.markdown),
    '## 見出し\n\n- 日本語の項目\n- URL https://example.com',
  );
});

test('excess blank lines are normalized', () => {
  assert.equal(formatText('一段落\n\n\n\n二段落', PRESETS.safe), '一段落\n\n二段落');
});
