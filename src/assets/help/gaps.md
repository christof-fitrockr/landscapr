# Process Gaps

The gap view answers one question in front of an audience: **where does the customer journey
depend on a person because no function supports it, and what do we have to build to make it
seamless?**

It reads the model you already have. Nothing here is entered twice - a process, its steps, the
functions those steps call and the systems behind them are enough.

## How a gap is worked out

Every process is broken down into the things it does. A step is one of those things, and so is a
function that is assigned to the process without being called from a step. A step that points at a
subprocess counts as **one** thing and takes that subprocess' verdict, so a process is never
dominated by the number of steps its children happen to have.

Each of them is then put in one of five states:

| State | What it means |
|-------|---------------|
| **Live** | A function runs it and a system provides that function |
| **Planned** | A function exists and is *Planned* or *In development* |
| **Declared gap** | The model names a function with the status *Gap*, or names one that no system implements |
| **Not modelled** | Nothing at all - a person does it and nobody wrote that down |
| **Manual by design** | A person does it on purpose, so it is counted out |

A process then gets a verdict of its own:

- **Seamless** - every counted step is live
- **Planned** - nothing is open, but some steps wait for a function that is being built
- **Gap** - at least one step is a declared gap or is not modelled
- **By design** - the process is marked as manual by design, or does nothing that counts

Three colours carry the message: green works, blue is planned, red is open. A declared gap and one
that nobody wrote down share the red - they differ in whether the model knows about them, which the
icon and the word say, never the colour on its own.

## What the view shows

- **Seamless today** - the share of steps that run on a live function. One number to open with.
- **The four tiles** - processes with a gap, functions to build, journeys affected, and how many
  processes are manual by design and therefore counted out.
- **Support mix** - every counted step of the model, split into seamless, planned and open.
- **Coverage board** - one tile per process, grouped by the journey that walks through it. Each tile
  carries its verdict, its coverage and how many of its steps are live. Click a tile to open it.
- **Functions we have to build** - the roadmap. Steps that wait for the same function become one
  entry, because building it once closes all of them. A step with no function in the model gets an
  entry of its own, since nobody has decided yet what that function is.

## Turning a finding into a plan

The panel on the right shows the selected process step by step, so you can point at exactly where
the break is. From there:

- **Mark as planned** moves a function the model already carries from *Gap* to *Planned*.
- **Plan a function** writes the missing function into the model as a planned one and hooks it onto
  the step that has none. From that moment the roadmap and the target picture carry it - nobody has
  to remember it separately.
- **Manual by design** says that a person does this on purpose. The process stops counting as a gap
  and is shown apart, so the score is not dragged down by something nobody intends to change.
- **Priority and horizon** record how urgent the gap is, when it should be closed, who drives it and
  why it matters. The roadmap is sorted by that.

Everything you change here is an ordinary change to the model: it lands on your draft and is
published with the next version, like any other edit.

## Comparing with a target picture

**Compare with target picture** puts today next to the state the plan describes. Two comparisons are
available:

- *Functions that are already planned* - what the coverage becomes once everything that is currently
  *Planned* or *In development* is live. No target picture needed.
- A **target picture** by name - the model as that plan describes it, analysed exactly like today.

The line underneath says what share is not planned anywhere yet. That is usually the part worth
talking about.

## Presenting it

**Presentation mode** hides the filters, the roadmap and the panel, and scales the headline and the
board up for a beamer. `Esc` leaves it again.
