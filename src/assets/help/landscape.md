# Landscape

The **Landscape** is the global editor of LandscapR. It shows the whole business in one picture: what
customers expect, the journeys they run through, the processes behind them, the capabilities and functions
that deliver them, the data being processed and the systems everything runs on.

Every element in the landscape is the same element you edit in the specialised views - the landscape does
not hold a copy. Change something here and it changes everywhere.

## Layers
The canvas is split into one band per layer, from top to bottom:

| Layer | What it holds |
|---|---|
| Experience | Customer expectations captured in the experience layer of a journey |
| Journey | End to end paths of a customer |
| Process | The steps the organisation performs |
| Capability | What the business is able to do |
| Function | API calls and functions in use |
| Data | Business objects being processed |
| System | Applications that implement it |

Click a layer chip below the toolbar to hide or show that band.

## Business or IT
The same model answers different questions depending on who is asking. The **View** switch in the toolbar
turns the landscape from a business view into a technical one and back:

- **Business** starts with experience, journeys, processes and capabilities. The inspector answers who is
  affected: customer pain points, the expectations and journeys that depend on the element, the capabilities
  behind it and the measures attached to those expectations.
- **IT** starts with processes, capabilities, functions, data and systems. For the very same element the
  inspector answers what it runs on: functions used, data objects and system dependencies, plus the
  implementation status of a function.

Nothing is hidden permanently - the layer chips still show any band, so either side can peek into the
other's world. The choice is remembered per browser.

## Blast radius
**Blast radius** in the inspector answers the question an architect has to bring to the business: what
breaks if this element changes or is retired. LandscapR walks the model against the direction of
dependency and highlights everything that hangs on the element, grouped by layer, right up to the affected
customer journeys and expectations - including how many of the affected elements are customer facing.
Press `Escape` or close the panel to leave the view.

## Today and the target picture
LandscapR shows two kinds of model: the business **as it is today**, and any number of **target pictures** -
what it should look like at some point. The picker in the toolbar switches between them.

A target picture is not a second model. It is stored as the planned difference to today: which elements are
new, which fall away, which change. That has two consequences worth knowing:

- **Planning cannot damage reality.** While a target picture is open, nothing you do touches the model of
  today. Every edit - renaming, connecting, creating - lands in the plan.
- **The plan follows reality.** If a colleague changes something today that the plan does not touch, the
  target picture shows that change too. Only what is planned deviates.

Working with one:

- **New target picture** (plus button) creates one and opens it right away; the banner names it and counts
  what is planned.
- Elements are painted in the same language as a review: green with `+` for planned as new, amber with `*`
  for planned to change, dashed red with `−` for planned to fall away.
- **Plan to drop this element** in the inspector marks an element to disappear; it stays visible on purpose,
  because a target picture has to show what goes away. `Delete` on a selected element does the same.
- **Back to today** on a single element drops the plan for it and brings it back to today's state.
- **Compare with today** puts both states side by side in the review view, with the change summary and the
  attribute diffs.
- **Back to today** in the banner returns to reality; the target picture stays and can be opened again.
- The **pencil** opens the target picture itself: name, what it is about, target date (free text, so a quarter
  or a milestone name works) and status - `Draft` while it is being shaped, `Agreed` once it is decided.

### When the plan has happened
**Plan is reality** adopts the target picture: everything it describes becomes the model of today, in one go.
LandscapR asks first and says how many elements are new, changed and dropped.

Afterwards the target picture is not deleted. It switches to `Realised`, keeps what it planned and notes when
it was adopted, so the decision stays readable later. From then on it is drawn like any other model - it is
reality now, not a plan - and it can no longer be adopted a second time.

Target pictures are stored with the model, so they travel through export, import and the repository.

## Reviewing changes
Before a draft is submitted - and while a reviewer looks at a proposal - the landscape can show two states
of the model at once instead of one. **Review changes** on the Repositories page opens that view.

Every element then carries what happened to it:

| Look | Meaning |
|---|---|
| Solid green outline, green fill, `+` badge | Added in this proposal |
| Dashed red outline, red fill, `−` badge | Removed in this proposal |
| Amber outline, `*` badge | Changed in this proposal |
| Faded into the background | Untouched, shown only for orientation |

Relations follow the same language: a line that was newly connected is drawn green, a cut one dashed red.
Clicking a changed element shows in the inspector exactly which attributes moved - the old value struck
through in red, the new one in green - and which relations were connected or disconnected. The panel on the
left lists everything that changed, grouped by added, changed and removed. `Escape` or **Leave** ends the
review.

## Resolving differences
If somebody else changed the model while you were working, LandscapR does not ask you to read a text diff.
**Show on the canvas** in the differences dialog puts both versions on the landscape:

- Only the colliding elements stay in focus, everything else fades out. A colliding element pulses in violet.
- Clicking it shows both versions side by side, field by field: **your version** next to the **version in the
  repository**, with the differing rows highlighted.
- **Keep my version** or **Keep incoming version** decides per element; a green tick marks what is decided,
  and the banner counts what is still open.
- **Apply** becomes available once nothing is open. The resolved model is assembled from whole stored
  elements, never from patched text, so it cannot come out broken.

Deciding is per element - half of one version and half of the other is deliberately not offered.

## Reading the picture
- Each element is a card, coloured by its layer. A dashed border marks an element that is still in draft.
- Lines are relations that exist in the model, e.g. a journey step pointing to its process, a function
  pointing to its capability, or an element pointing to the system that implements it.
- A small dot in the corner of a card marks a position you placed by hand.

## Editing
- **Select tool:** Click an element to open the inspector on the right. Name, description, status, tags
  and the group of a data object are edited there and saved to the element itself.
- **Connector tool:** Click one element, then the other. LandscapR figures out which relation fits the two
  layers and writes it into the model - a process gets its function, a function its capability, an element
  its system, a journey a new step. Elements that cannot be related say so instead of silently doing nothing.
- **Create tools:** Pick one of the coloured layer buttons and click the canvas. The new element is created
  right away and opens in the inspector, ready to be renamed.
- **Removing a relation:** Select a line and press `Delete`, or use the unlink button next to the relation in
  the inspector. Relations that only follow from other elements - an expectation belonging to its journey,
  a data object referencing another - cannot be removed here.
- **Deleting elements** stays in the list views of each layer, so nothing gets lost by accident.
- **Open editor** in the inspector, or a double click on a card, jumps into the specialised editor of that
  element: the journey editor, the process flow, the data model or the base data form.

## Arranging
- **Drag** an element to place it by hand. Its position is stored with the landscape view and synchronised
  through your repository, so your team sees the same picture.
- **Fit** zooms so that the whole landscape is visible, **Arrange again** drops all manual positions and lets
  the automatic layer layout take over.
- Elements are ordered automatically so that lines between the bands cross as little as possible.
- Pan with the right mouse button, `Shift` + drag or by holding `Space`; zoom with the mouse wheel.

## Finding your way in a large model
- **Search** dims everything that does not match the text, so a name or a group stands out immediately.
- **Focus** dims everything that is not directly connected to the selected element - the fastest way to see
  what a single system, function or process is involved in.
