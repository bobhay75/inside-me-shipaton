import assert from 'node:assert/strict';
import test from 'node:test';
import { app } from '../index.js';

async function withServer(run) {
  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
}

test('health reports the service and model', async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, 'me-u-reflection-agent');
    assert.equal(typeof body.model, 'string');
    assert.match(body.memory, /^(unverified|available|unavailable)$/);
  });
});

test('reflect rejects an empty reset', async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/reflect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood: 3 }),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'text is required' });
  });
});

test('urgent-risk language bypasses the model', async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/reflect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'I am suicidal and need help right now.',
        mood: 1,
        memoryId: 'meu_test_123456',
      }),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.model, 'safety-rule');
    assert.equal(body.stored, false);
    assert.match(body.reflection, /immediate local emergency help/i);
  });
});
