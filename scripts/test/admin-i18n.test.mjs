import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// The admin panel's two message files must have identical keys and ICU placeholders.
const load = (locale) => JSON.parse(readFileSync(new URL(`../../apps/web/messages/admin/${locale}.json`, import.meta.url), 'utf8'));

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === 'object' ? flatten(value, `${prefix}${key}.`) : [[`${prefix}${key}`, value]],
  );

const en = new Map(flatten(load('en')));
const zh = new Map(flatten(load('zh')));
const placeholders = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('admin en and zh messages have the same keys', () => {
  assert.deepEqual([...zh.keys()].filter((k) => !en.has(k)), [], 'keys only in zh');
  assert.deepEqual([...en.keys()].filter((k) => !zh.has(k)), [], 'keys only in en');
});

test('admin messages use the same placeholders in both languages', () => {
  for (const [key, text] of en) assert.deepEqual(placeholders(zh.get(key)), placeholders(text), key);
});

test('admin messages are never empty', () => {
  for (const [map, name] of [[en, 'en'], [zh, 'zh']]) for (const [key, text] of map) assert.ok(String(text).trim(), `${name}:${key}`);
});
