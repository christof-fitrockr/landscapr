# Process

Processes define the business logic, workflows, and operational steps that power your organization. They can be broken down into subprocesses and linked to technical functions (API Calls).

## Process List
The list view displays all defined processes. You can search, filter, and sort. Click a process to edit it.

## Process Editor
The Process Editor is divided into several tabs:

### Base
Configure the fundamental properties of the process:
- **Name & Description:** Basic identity.
- **Status:** Set to "Draft" or "Validated".
- **Tags & Role:** Categorize the process.
- **Implemented By:** Link the process to the **Systems** (Applications) that implement it.
- **Input/Output:** Define data or artifacts that go in and out of this process.

### Subprocesses & Functions
This tab allows you to define the flow of the process by adding steps.
- **Add Process:** Insert an existing process as a subprocess step.
- **Add Function:** Insert an API Call (Function) as a step.
- **Create New:** Quickly create a new Process or Function definition and add it immediately.
- **Reorder:** Drag and drop steps to define their sequence.
- **Overview:** Each step shows a summary card. You can click to jump to that subprocess or function.

### Flow & Swimlane Views
- **Flow:** A visual representation of the process steps.
- **Swimlane:** A diagram showing the process steps arranged by the Roles or Systems responsible for them. This is generated automatically based on the "Role" or "Implemented By" properties of the steps.

### Used By
This tab shows a reverse lookup of where this process is used. It lists other processes or journeys that include this process as a step.
