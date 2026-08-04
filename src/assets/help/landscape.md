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
