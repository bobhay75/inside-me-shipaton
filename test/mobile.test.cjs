const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, options = {}) {
  const filename = path.resolve(__dirname, '..', file);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  const localRequire = name => name === '@react-native-async-storage/async-storage' ? options.storage : name.startsWith('.') ? load(path.relative(path.join(__dirname, '..'), path.resolve(path.dirname(filename), name)) + '.ts', options) : require(name);
  vm.runInNewContext(compiled, { module, exports: module.exports, require: localRequire, process: { env: options.env || {} }, fetch: options.fetch || (() => { throw new Error('unexpected network'); }), AbortController, setTimeout, clearTimeout });
  return module.exports;
}
const entry = { id: 'one', createdAt: '2026-11-23T00:00:00Z', mood: 3, text: 'Private entry', reflection: 'Anchor' };
test('legacy valid journal remains readable', () => {
  const { parseEntries } = load('src/entryValidation.ts');
  assert.equal(parseEntries(JSON.stringify([entry]))[0].id, 'one');
});
test('malformed stored records fail before UI receives them', () => {
  const { parseEntries } = load('src/entryValidation.ts');
  for (const value of [null, {}, [null], [{ ...entry, createdAt: 'bad' }], [{ ...entry, revelation: { tags: null } }], [{ ...entry, growthMode: {} }]]) assert.throws(() => parseEntries(JSON.stringify(value)));
});
test('load errors do not silently erase a journal or perform writes', async () => {
  let writes = 0;
  const storage = { getItem: async () => '{invalid', setItem: async () => { writes++; } };
  await assert.rejects(load('src/storage.ts', { storage }).loadEntries());
  assert.equal(writes, 0);
  storage.getItem = async () => { throw new Error('unavailable'); };
  await assert.rejects(load('src/storage.ts', { storage }).loadEntries(), /unavailable/);
});
test('failed journal persistence is observable to the caller', async () => {
  const storage = { setItem: async () => { throw new Error('quota'); } };
  await assert.rejects(load('src/storage.ts', { storage }).saveEntries([entry]), /quota/);
});
test('local Inner Mirror keeps urgent-risk bypass even when cloud is enabled', async () => {
  let network = 0;
  const service = load('src/services/reflection.ts', { env: { EXPO_PUBLIC_REFLECTION_API_URL: 'https://example.test/reflect' }, fetch: async () => { network++; throw new Error(); } });
  const result = await service.getRevelation({ text: 'I want to kill myself', mode: 'now' }, true);
  assert.equal(result.source, 'local'); assert.match(result.choice, /emergency/); assert.equal(network, 0);
});
test('ordinary local reflection labels the user account as unverified', async () => {
  const service = load('src/services/reflection.ts');
  const result = await service.getRevelation({ text: 'They always hate me.', mode: 'now' });
  assert.match(result.facts, /not independently verified/);
});
test('local message mirror also keeps urgent-risk text off the model', async () => {
  let network = 0;
  const service = load('src/services/reflection.ts', { env: { EXPO_PUBLIC_REFLECTION_API_URL: 'https://example.test/reflect' }, fetch: async () => { network++; throw new Error(); } });
  const result = await service.getMirrorPreview({ text: 'I want to hurt someone', intent: '', mood: 1, mode: 'message' }, true);
  assert.equal(result.source, 'local'); assert.match(result.controlCue, /emergency/); assert.equal(network, 0);
});
