/**
 * The way in for "here is how it works - model it".
 *
 * A prompt is what an assistant offers its user as a ready-made instruction, so
 * describing something and getting a model out of it is one step rather than a
 * conversation about which tool to call in which order.
 */

const KINDS = {
  everything: 'everything the description carries: journeys, processes and their steps, functions, and the systems, capabilities and data they name',
  process: 'the process and its steps, with the functions each step calls',
  journey: 'the journey and its steps, with the process behind each step',
  functions: 'the functions and API calls, with the systems that provide them and the data they carry',
  landscape: 'the systems, capabilities and data objects, and how they relate'
};

export const PROMPTS = [
  {
    name: 'model_from_description',
    title: 'Model this description',
    description: 'Turn a description of how something works into processes, process steps, journeys and functions.',
    arguments: [
      { name: 'description', description: 'How it works, in your own words - a paragraph, a list of steps, a meeting note', required: true },
      { name: 'kind', description: `What to model: ${Object.keys(KINDS).join(', ')}. Everything by default.`, required: false }
    ],
    build: ({ description, kind }) => {
      const focus = KINDS[kind] || KINDS.everything;
      return text(`Model this in Landscapr.

Here is the description:

"""
${description || ''}
"""

Model ${focus}.

Go about it like this:

1. Look at what is already there before you add anything: landscapr_overview, and
   landscapr_search for the words the description uses. Something that exists is reused,
   not modelled a second time under a slightly different name.
2. Read the description and decide what the elements are:
   - a **process** is something the organisation performs, named as an activity ("Book an appointment")
   - a **step** of a process is one thing it does, and it calls a **function**
   - a **journey** is the path a customer walks; each of its steps points at a process
   - a **function** is what actually executes a step, and belongs to a **system**
   - a **capability** is what the business is able to do, independent of how
   - a **data object** is what flows through it
3. Say where the description is silent rather than inventing detail. A step whose function
   nobody has built yet is named anyway and becomes a declared gap - that is what the gap
   view is for. Where the description makes clear that a person does the work on purpose,
   set the process' supportPlan to manualByDesign.
4. Write descriptions in the words of the description you were given, not in generic filler.
5. Call landscapr_draft with dryRun first, show what it would create and reuse, and only then
   apply it.
6. Afterwards report what was created and where the gaps are, and say that landscapr_save
   still has to commit it when the model lives in a repository.`);
    }
  },

  {
    name: 'extend_from_description',
    title: 'Extend what is modelled',
    description: 'Take a description of a change and work it into the model that already exists, without overwriting it.',
    arguments: [
      { name: 'description', description: 'What changed or what is new, in your own words', required: true },
      { name: 'element', description: 'The process, journey or function it is about, if you already know', required: false }
    ],
    build: ({ description, element }) => text(`Work this into the Landscapr model.

Here is what is new or has changed:

"""
${description || ''}
"""

${element ? `It is about "${element}". Read it first with landscapr_get, so you see what it already carries and who points at it.\n` : 'Find what it is about first - landscapr_search over the words it uses, then landscapr_get on the elements you find.\n'}
Then:

1. Say plainly what the description changes about the model as it stands: what is new, what is
   different, what is now gone.
2. Add what is new with landscapr_draft - it reuses what exists and fills blanks rather than
   overwriting. Where a flow that somebody modelled by hand really has to be rewritten, say so
   and use replaceFlows, or write it deliberately with landscapr_set_process_flow.
3. Change what is different with landscapr_update, and take away what is gone with
   landscapr_unlink - or landscapr_delete when the element itself is gone, after a dryRun that
   shows what it would detach.
4. Finish with landscapr_validate, and say what still has to be decided by a person.`)
  }
];

function text(body) {
  return [{ role: 'user', content: { type: 'text', text: body } }];
}

export function listPrompts() {
  return PROMPTS.map(({ name, title, description, arguments: args }) => ({ name, title, description, arguments: args }));
}

export function getPrompt(name, args = {}) {
  const prompt = PROMPTS.find(entry => entry.name === name);
  if (!prompt) {
    throw new Error(`Unknown prompt "${name}". Known: ${PROMPTS.map(entry => entry.name).join(', ')}.`);
  }
  const missing = (prompt.arguments || []).filter(argument => argument.required && !String(args[argument.name] || '').trim());
  if (missing.length) {
    throw new Error(`"${name}" needs ${missing.map(argument => argument.name).join(', ')}.`);
  }
  return { description: prompt.description, messages: prompt.build(args) };
}
