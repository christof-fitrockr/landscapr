/**
 * Where the model comes from and how a change gets back into it.
 *
 * With a file the change is written straight away. With a repository it is a
 * commit - and, if you ask for it, a pull request - so a change an assistant
 * makes travels the same reviewed path as a change made in the app.
 */
import { result } from '../tool-helpers.js';

export function repoTools(store) {
  return [
    {
      name: 'landscapr_reload',
      description:
        'Reads the model again from the file or the repository. Everything that was changed but not saved is thrown away. ' +
        'Use it when someone else has changed the model in the meantime.',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        const hadChanges = store.dirty;
        await store.load();
        return result({ reloaded: store.describeSource(), discardedUnsavedChanges: hadChanges, counts: store.counts() });
      }
    },

    {
      name: 'landscapr_save',
      description:
        'Writes the model back. With a repository this commits the file; give a branch to keep the change off the ' +
        'main line, and pullRequest to open it for review. Say in the message what changed and why.',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'The commit message, e.g. "model: add the onboarding journey"' },
          branch: { type: 'string', description: 'Branch to commit on. Created off the current branch when it does not exist.' },
          pullRequest: {
            type: 'object',
            description: 'Open a pull request for the branch',
            properties: {
              title: { type: 'string', description: 'Title of the pull request' },
              body: { type: 'string', description: 'What changed and why, for the reviewer' },
              base: { type: 'string', description: 'Branch to merge into, main by default' }
            }
          }
        }
      },
      handler: async ({ message, branch, pullRequest }) => {
        store.assertWritable();
        if (!store.dirty && store.backend.kind === 'github') {
          return result({ saved: false, reason: 'Nothing has changed since the model was read.' });
        }
        const saved = await store.save({ message, branch, pullRequest });
        return result({ saved: true, ...saved, source: store.describeSource() });
      }
    }
  ];
}
