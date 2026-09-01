/**
 * How the server is told which model to work on.
 *
 * Either a file on disk - the JSON the app downloads and uploads - or the file
 * in the GitHub repository the model is versioned in.
 */
import { GithubBackend } from './backend-github.js';
import { LocalFileBackend } from './backend-local.js';

const USAGE = `
landscapr-mcp - the Landscapr model for an AI assistant

  A file on disk:
    landscapr-mcp --file ./landscape.json

  A file in a GitHub repository:
    landscapr-mcp --repo owner/name --path model.json --branch main
    (the token comes from LANDSCAPR_GITHUB_TOKEN or GITHUB_TOKEN)

  Options:
    --file <path>       the model as a local JSON file
    --repo <owner/name> the repository the model is versioned in
    --path <path>       the model file inside the repository, model.json by default
    --branch <name>     the branch to read, main by default
    --read-only         answer questions, refuse changes
    --no-autosave       with --file: wait for landscapr_save instead of writing every change

  The same settings can be given as environment variables:
    LANDSCAPR_MODEL_FILE, LANDSCAPR_GITHUB_REPO, LANDSCAPR_GITHUB_PATH,
    LANDSCAPR_GITHUB_BRANCH, LANDSCAPR_GITHUB_TOKEN, LANDSCAPR_READ_ONLY
`;

export function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (!argument.startsWith('--')) continue;
    const name = argument.slice(2);
    if (name === 'help') return { help: true };
    if (name.startsWith('no-')) {
      options[name.slice(3)] = false;
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      options[name] = next;
      index++;
    } else {
      options[name] = true;
    }
  }
  return options;
}

export function buildConfig(argv = process.argv.slice(2), env = process.env) {
  const options = parseArguments(argv);
  if (options.help) {
    return { help: true, usage: USAGE };
  }

  const readOnly = options['read-only'] === true || String(env.LANDSCAPR_READ_ONLY || '') === 'true';
  const repository = options.repo || env.LANDSCAPR_GITHUB_REPO;
  const file = options.file || env.LANDSCAPR_MODEL_FILE;

  if (repository) {
    const [owner, repo] = String(repository).split('/');
    if (!owner || !repo) {
      throw new Error(`--repo takes owner/name, not "${repository}".`);
    }
    const token = env.LANDSCAPR_GITHUB_TOKEN || env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('No GitHub token. Set LANDSCAPR_GITHUB_TOKEN to a personal access token that may read and write the repository.');
    }
    const backend = new GithubBackend({
      owner,
      repo,
      path: options.path || env.LANDSCAPR_GITHUB_PATH || 'model.json',
      branch: options.branch || env.LANDSCAPR_GITHUB_BRANCH || 'main',
      token
    });
    // a commit is a deliberate act, so a repository is never written on every change
    return { backend, readOnly, autosave: false, usage: USAGE };
  }

  if (file) {
    const backend = new LocalFileBackend(file);
    return { backend, readOnly, autosave: options.autosave !== false, usage: USAGE };
  }

  throw new Error('No model to work on. Give --file <path> or --repo <owner/name>.\n' + USAGE);
}
