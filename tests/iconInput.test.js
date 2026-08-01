const { test } = require('node:test');
const assert = require('node:assert/strict');
const { IconAddParser } = require('../src/iconInput');

test('isIconAddInput: 「絵文字追加」で始まる文のみtrue', () => {
  assert.equal(IconAddParser.isIconAddInput('絵文字追加 サッカー ⚽'), true);
  assert.equal(IconAddParser.isIconAddInput('今日の予定'), false);
});

test('絵文字追加 サッカー ⚽', () => {
  const r = IconAddParser.parse('絵文字追加 サッカー ⚽');
  assert.deepEqual(r, { keyword: 'サッカー', icon: '⚽' });
});

test('全角スペース区切りも認識する', () => {
  const r = IconAddParser.parse('絵文字追加　サッカー　⚽');
  assert.deepEqual(r, { keyword: 'サッカー', icon: '⚽' });
});

test('キーワード・絵文字のいずれかが欠けている場合はnull', () => {
  assert.equal(IconAddParser.parse('絵文字追加 サッカー'), null);
  assert.equal(IconAddParser.parse('絵文字追加'), null);
});

test('余分なトークンがある場合はnull', () => {
  assert.equal(IconAddParser.parse('絵文字追加 サッカー 試合 ⚽'), null);
});
