# Journeys

Journeys represent the end-to-end paths that customers or users take when interacting with your organization. They help you visualize the sequence of steps, touchpoints, and the underlying processes that support them.

## Journey List
The **Journey List** view shows all existing journeys.
- Use the **Search** bar to filter journeys by name.
- Click **Create** to start a new journey.
- Click **View/Edit** (pencil icon) on a journey to open the **Journey Editor**.

## Journey Editor
The Journey Editor is a powerful visual tool for mapping out journeys.

### Toolbar
The toolbar at the top provides access to:
- **Navigation:** Buttons to return to the List or Base settings.
- **Tools:**
    - **Select (Pointer):** Click to select nodes or edges. Drag to move them.
    - **Process (Cube):** Click on the canvas to add a Process step. You can link this step to an existing Process definition.
    - **Decision (Diamond):** Click on the canvas to add a Decision point (gateway).
    - **Group (Box):** Click and drag to create a visual grouping container.
    - **Connector (Line):** Click a source node, then click a target node to draw a connecting line (edge).
    - **Customer Expectation (Smiley):** Click a journey step to capture what the customer expects there and which result they actually get.
- **Experience Layer:**
    - **Show / Hide (Eye):** Toggles the experience layer that is drawn above the journey.
    - **Customer:** Filters the layer down to a single customer or persona, so you see the result of one individual customer.
- **Edit Actions:**
    - **Undo/Redo:** Standard undo/redo functionality for your changes.
    - **Comments:** Toggle the comments panel to view or add notes specific to this journey.
    - **Export:** Export the current journey diagram to PowerPoint.

### Canvas Interaction
- **Pan:** Right-click and drag, or Shift + Click and drag to move around the canvas.
- **Zoom:** Use the mouse wheel to zoom in and out.
- **Selection:** Click a node or edge to select it. Selected items usually show resize handles or other controls.
- **Delete:** Select an item and press the `Delete` key to remove it.

### Node Configuration
- **Process Steps:** When a process step is selected, you can choose which underlying **Process** it represents using the dropdown in the toolbar. This links the visual step to the detailed process definition.
- **Draft Status:** Processes that are not yet validated are shown with a dashed border and a "DRAFT" label.

## Experience Layer
Above the journey diagram LandscapR draws an **experience layer**. It turns the technical flow into an
experience management view: for every journey step you capture the promise you make to the customer and
what the customer really gets.

Each expectation card carries:
- **Title:** The expectation in the words of the customer.
- **Expectation:** What the customer expects at this step.
- **Result:** The outcome the customer actually gets.
- **Fulfilment:** `Exceeded`, `Met`, `Partly`, `Missed` or `Unknown`. The fulfilment colours the card and
  positions the step on the **experience curve** that runs through the whole layer - the visual gap between
  promise and reality.
- **Customer / Persona:** The individual customer or segment the result belongs to. Use the **Customer**
  filter in the toolbar to show the experience curve of a single customer.
- **Measure, Target, Actual:** The KPI that proves the result, e.g. `Waiting time: 6 min / < 2 min`.

Working with the layer:
- **Add / Edit:** Activate the smiley tool and click a journey step, or double click an existing card.
- **Select / Delete:** Click a card to select it and press `Delete` to remove it. Deleting a journey step
  also removes the expectation attached to it.
- **Anchoring:** Every card is anchored to its journey step by a dashed line, so expectations move along
  when you rearrange the journey.
- **Export:** The experience layer is part of the PowerPoint export of the journey.

## Comments
The Comments panel allows you to collaborate or leave reminders. Comments are saved with the journey and can be edited or deleted.
