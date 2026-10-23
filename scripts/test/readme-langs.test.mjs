import test from 'node:test';
import assert from 'node:assert/strict';

import { findReadmeVariants, guessLang, normalizeLang, repoPath } from '../lib/readme-langs.mjs';

test('normalizeLang maps the codes repos use onto one key', () => {
  assert.equal(normalizeLang('zh_CN'), 'zh-CN');
  assert.equal(normalizeLang('CN'), 'zh-CN');
  assert.equal(normalizeLang('zh-Hant'), 'zh-TW');
  assert.equal(normalizeLang('ja-JP'), 'ja');
  assert.equal(normalizeLang('pt-br'), 'pt-BR');
  assert.equal(normalizeLang('es-MX'), 'es');
  assert.equal(normalizeLang('dev'), null);
  assert.equal(normalizeLang('old'), null);
});

test('repoPath resolves relative, rooted and same-repo GitHub links', () => {
  assert.equal(repoPath('./README.zh-CN.md', 'a/b'), 'README.zh-CN.md');
  assert.equal(repoPath('/docs/README.ja.md#top', 'a/b'), 'docs/README.ja.md');
  assert.equal(repoPath('../README.md', 'a/b', 'docs/i18n'), 'docs/README.md');
  assert.equal(repoPath('https://github.com/A/B/blob/main/README_CN.md', 'a/b'), 'README_CN.md');
  assert.equal(repoPath('https://github.com/other/repo/blob/main/README_CN.md', 'a/b'), null);
  assert.equal(repoPath('https://example.com/README.ja.md', 'a/b'), null);
  assert.equal(repoPath('mailto:x@y.z', 'a/b'), null);
});

test('findReadmeVariants reads markdown, HTML and reference links, first per language', () => {
  const md = [
    '[English](README.md) · [简体中文](./README.zh-CN.md) · [中文](README_CN.md)',
    '<a href="docs/README.ja.md">日本語</a>',
    '[ko]: https://github.com/a/b/blob/main/README.ko-KR.md',
    '[changelog](README.dev.md) [other](https://github.com/x/y/blob/main/README.es.md)',
  ].join('\n');
  assert.deepEqual(findReadmeVariants(md, 'a/b'), [
    { lang: 'zh-CN', path: 'README.zh-CN.md' },
    { lang: 'ja', path: 'docs/README.ja.md' },
    { lang: 'ko', path: 'README.ko-KR.md' },
  ]);
});

test('guessLang tells a Chinese README from an English one despite code blocks', () => {
  assert.equal(guessLang('# Tool\n\nA plugin that does things.\n```js\nconst x = 1\n```'), 'en');
  assert.equal(guessLang('# 工具\n\n这是一个用于 OpenCode 的插件，可以自动整理会话记录。\n```bash\nnpm install some-long-package-name\n```'), 'zh-CN');
  assert.equal(guessLang('# ツール\n\nこれは OpenCode のためのプラグインです。'), 'ja');
});
