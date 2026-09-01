/**
 * The repository side: a change an assistant makes travels the same road as a
 * change made in the app - a commit on a branch, and a pull request for review.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

import { GithubBackend } from '../src/backend-github.js';
import { buildConfig } from '../src/config.js';
import { ModelStore } from '../src/store.js';

const model = { processes: [{ id: 'p1', name: 'Book an appointment' }], journeys: [] };

function fakeGithub(responses) {
  const calls = [];
  global.fetch = mock.fn(async (url, options = {}) => {
    calls.push({ url, method: options.method, body: options.body ? JSON.parse(options.body) : null });
    const key = Object.keys(responses).find(pattern => url.includes(pattern) &&
      (!responses[pattern].method || responses[pattern].method === (options.method || 'GET')));
    const answer = key ? responses[key] : null;
    if (!answer) {
      return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 });
    }
    return new Response(JSON.stringify(answer.body), { status: answer.status || 200 });
  });
  return calls;
}

const backend = () => new GithubBackend({
  owner: 'acme', repo: 'landscape', path: 'model.json', branch: 'main', token: 't'
});

describe('the repository behind the model', () => {
  beforeEach(() => {
    delete global.fetch;
  });

  it('reads the model file and remembers what it read', async () => {
    fakeGithub({
      'contents/model.json': { body: { sha: 'abc', encoding: 'base64', content: Buffer.from(JSON.stringify(model)).toString('base64') } }
    });

    const github = backend();
    const { payload } = await github.read();
    assert.equal(payload.processes[0].name, 'Book an appointment');
    assert.equal(github.describe().fileSha, 'abc');
  });

  it('treats a file that is not there yet as an empty model', async () => {
    fakeGithub({
      'contents/model.json': { status: 404, body: { message: 'Not Found' } },
      'git/ref/heads/main': { body: { object: { sha: 'headsha' } } },
      '/repos/acme/landscape': { body: { full_name: 'acme/landscape' } }
    });
    const store = new ModelStore(backend());
    await store.load();
    assert.equal(store.counts().process, 0);
  });

  it('says so when the repository is not there, instead of handing back an empty model', async () => {
    fakeGithub({});
    await assert.rejects(() => backend().read(), /not there, or the token cannot see it/);
  });

  it('says so when the branch does not exist', async () => {
    fakeGithub({
      'contents/model.json': { status: 404, body: { message: 'Not Found' } },
      'git/ref/heads/main': { status: 404, body: { message: 'Not Found' } },
      '/repos/acme/landscape': { body: { full_name: 'acme/landscape' } }
    });
    await assert.rejects(() => backend().read(), /has no branch "main"/);
  });

  it('commits on a branch it creates and opens a pull request', async () => {
    const calls = fakeGithub({
      'contents/model.json?ref=main': { body: { sha: 'abc', encoding: 'base64', content: Buffer.from(JSON.stringify(model)).toString('base64') } },
      'git/ref/heads/main': { body: { object: { sha: 'headsha' } } },
      'git/refs': { method: 'POST', body: { ref: 'refs/heads/ai/journey' } },
      'contents/model.json': { method: 'PUT', body: { content: { sha: 'newsha' }, commit: { sha: 'c1', html_url: 'https://github.com/acme/landscape/commit/c1' } } },
      '/pulls': { method: 'POST', body: { number: 7, html_url: 'https://github.com/acme/landscape/pull/7' } }
    });

    const github = backend();
    const store = new ModelStore(github);
    await store.load();
    store.add('process', { id: 'p2', name: 'Bring the car in' });
    await store.touched();
    // a repository is never written on the way - the commit is a deliberate act
    assert.equal(store.dirty, true);

    const saved = await store.save({
      message: 'model: add a process',
      branch: 'ai/journey',
      pullRequest: { title: 'Add a process', body: 'Modelled with an assistant', base: 'main' }
    });

    assert.equal(saved.branchCreated, 'ai/journey');
    assert.equal(saved.pullRequest.number, 7);
    assert.equal(store.dirty, false);

    const created = calls.find(call => call.url.includes('git/refs') && call.method === 'POST');
    assert.equal(created.body.ref, 'refs/heads/ai/journey');
    assert.equal(created.body.sha, 'headsha');

    const commit = calls.find(call => call.method === 'PUT');
    assert.equal(commit.body.branch, 'ai/journey');
    assert.equal(commit.body.message, 'model: add a process');
    const written = JSON.parse(Buffer.from(commit.body.content, 'base64').toString('utf8'));
    assert.equal(written.processes.length, 2);

    const pull = calls.find(call => call.url.includes('/pulls'));
    assert.equal(pull.body.head, 'ai/journey');
    assert.equal(pull.body.base, 'main');
  });

  it('says what went wrong when the repository refuses', async () => {
    fakeGithub({
      'contents/model.json': { status: 401, body: { message: 'Bad credentials' } }
    });
    await assert.rejects(() => backend().read(), /Bad credentials/);
  });
});

describe('how the server is told which model to work on', () => {
  it('takes a repository from the command line', () => {
    const config = buildConfig(['--repo', 'acme/landscape', '--path', 'model.json', '--branch', 'draft'],
      { LANDSCAPR_GITHUB_TOKEN: 't' });
    assert.equal(config.backend.kind, 'github');
    assert.equal(config.backend.describe().branch, 'draft');
    assert.equal(config.autosave, false);
  });

  it('writes a local file as it goes, unless told not to', () => {
    assert.equal(buildConfig(['--file', './model.json'], {}).autosave, true);
    assert.equal(buildConfig(['--file', './model.json', '--no-autosave'], {}).autosave, false);
  });

  it('can be started read only', () => {
    assert.equal(buildConfig(['--file', './model.json', '--read-only'], {}).readOnly, true);
    assert.equal(buildConfig(['--file', './model.json'], { LANDSCAPR_READ_ONLY: 'true' }).readOnly, true);
  });

  it('refuses a repository without a token, rather than failing later', () => {
    assert.throws(() => buildConfig(['--repo', 'acme/landscape'], {}), /token/);
  });

  it('says what to do when it is given nothing', () => {
    assert.throws(() => buildConfig([], {}), /--file|--repo/);
  });
});
