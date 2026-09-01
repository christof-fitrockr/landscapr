/**
 * The model as a file in a GitHub repository - the way the app itself keeps it.
 *
 * Writing goes through the same route the app uses: a commit on a branch, and
 * on request a pull request, so a change an assistant makes is reviewed like
 * any other change to the model.
 */

const API = 'https://api.github.com';

export class GithubBackend {
  /**
   * @param {{owner: string, repo: string, path: string, branch: string, token: string}} config
   */
  constructor(config) {
    this.owner = config.owner;
    this.repo = config.repo;
    this.path = config.path;
    this.branch = config.branch;
    this.token = config.token;
    this.kind = 'github';
    /** sha of the file as it was read, needed to write it back safely */
    this.sha = null;
  }

  describe() {
    return {
      kind: 'github',
      repository: `${this.owner}/${this.repo}`,
      path: this.path,
      branch: this.branch,
      fileSha: this.sha
    };
  }

  async request(method, url, body) {
    const response = await fetch(url.startsWith('http') ? url : `${API}${url}`, {
      method,
      headers: {
        Authorization: `token ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'landscapr-mcp',
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const text = await response.text();
    const parsed = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const message = parsed && parsed.message ? parsed.message : response.statusText;
      throw new Error(`GitHub ${method} ${url} failed (${response.status}): ${message}`);
    }
    return parsed;
  }

  async read() {
    let file;
    try {
      file = await this.request('GET',
        `/repos/${this.owner}/${this.repo}/contents/${encodeURI(this.path)}?ref=${encodeURIComponent(this.branch)}`);
    } catch (error) {
      if (String(error.message).includes('(404)')) {
        this.sha = null;
        return { payload: null, revision: null };
      }
      throw error;
    }

    this.sha = file.sha;
    const raw = Buffer.from(file.content || '', file.encoding === 'base64' ? 'base64' : 'utf8').toString('utf8');
    if (!raw.trim()) {
      return { payload: null, revision: file.sha };
    }
    try {
      return { payload: JSON.parse(raw), revision: file.sha };
    } catch (error) {
      throw new Error(`${this.path} in ${this.owner}/${this.repo} is not valid JSON: ${error.message}`);
    }
  }

  /** Creates a branch off the current one, so an assistant never writes on main by accident */
  async createBranch(name) {
    const ref = await this.request('GET',
      `/repos/${this.owner}/${this.repo}/git/ref/heads/${encodeURIComponent(this.branch)}`);
    await this.request('POST', `/repos/${this.owner}/${this.repo}/git/refs`, {
      ref: `refs/heads/${name}`,
      sha: ref.object.sha
    });
  }

  async branchExists(name) {
    try {
      await this.request('GET', `/repos/${this.owner}/${this.repo}/git/ref/heads/${encodeURIComponent(name)}`);
      return true;
    } catch (error) {
      if (String(error.message).includes('(404)')) return false;
      throw error;
    }
  }

  /**
   * @param {object} payload the whole model document
   * @param {{message?: string, branch?: string, pullRequest?: {title?: string, body?: string, base?: string}}} options
   */
  async write(payload, options = {}) {
    const result = {};
    const target = options.branch || this.branch;

    if (target !== this.branch) {
      if (!(await this.branchExists(target))) {
        await this.createBranch(target);
        result.branchCreated = target;
      }
      // the file on the new branch carries its own sha
      const onTarget = await this.shaOnBranch(target);
      this.sha = onTarget;
      this.branch = target;
    }

    const content = Buffer.from(JSON.stringify(payload, null, 2), 'utf8').toString('base64');
    const commit = await this.request('PUT', `/repos/${this.owner}/${this.repo}/contents/${encodeURI(this.path)}`, {
      message: (options.message || '').trim() || `model: update ${this.path}`,
      content,
      branch: target,
      ...(this.sha ? { sha: this.sha } : {})
    });

    this.sha = commit.content ? commit.content.sha : null;
    result.commit = commit.commit ? { sha: commit.commit.sha, url: commit.commit.html_url } : null;
    result.branch = target;

    if (options.pullRequest) {
      const base = options.pullRequest.base || 'main';
      const pr = await this.request('POST', `/repos/${this.owner}/${this.repo}/pulls`, {
        title: options.pullRequest.title || `Update ${this.path}`,
        body: options.pullRequest.body || '',
        head: target,
        base
      });
      result.pullRequest = { number: pr.number, url: pr.html_url };
    }

    return result;
  }

  async shaOnBranch(branch) {
    try {
      const file = await this.request('GET',
        `/repos/${this.owner}/${this.repo}/contents/${encodeURI(this.path)}?ref=${encodeURIComponent(branch)}`);
      return file.sha;
    } catch (error) {
      if (String(error.message).includes('(404)')) return null;
      throw error;
    }
  }
}
