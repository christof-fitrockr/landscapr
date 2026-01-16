# How To: Workflow

This chapter guides you through the recommended workflow for using Landscapr with a remote GitHub repository. Following this process ensures your work is saved safely and synchronized with your team.

## 1. Setup: Connect to Repository
Before starting, ensure you are connected to your GitHub repository.

1.  Navigate to the **Repositories** page (Database icon in the top right).
2.  Enter your **GitHub Personal Access Token (PAT)**.
3.  Click **Connect**.
4.  Select the desired **Repository** from the list.
5.  Select the **File** you wish to work on (e.g., `data.json`) or enter a new filename to create one.
6.  Click **Load** to initialize your local workspace with the remote data.

## 2. The Golden Workflow
To minimize conflicts and ensure data integrity, follow this "Pull, Work, Push" cycle:

### Step 1: Pull (Before you start)
Always pull the latest changes from the server before you begin your session. This ensures you are building on top of the most recent work.
1.  Look at the **Sync** badge in the top navigation bar.
2.  If it says **Remote Newer** or **Diverged**, click the **Download (Pull)** button.
3.  Resolve any potential conflicts (see below) and confirm.

### Step 2: Work
Perform your tasks within the application:
-   Create or edit Journeys, Processes, and Capabilities.
-   Your changes are automatically saved to your browser's **Local Storage**.

### Step 3: Push (When you are done)
Once you have completed a logical unit of work (e.g., "Defined the Payment Process"), save your changes to the server.
1.  Look at the **Sync** badge. It should say **Local Newer** or **Diverged**.
2.  Click the **Upload (Push)** button.
3.  The **Merge Modal** will appear.
4.  Review your changes to ensure you are only committing what you intend.
5.  Enter a **Commit Message**. This is mandatory. Use a clear description like `feat: add payment process`.
6.  Click **Apply Merge** (or Save) to push your changes to GitHub.

## 3. The Merge Modal
The **Resolve Merge Conflicts** modal appears during Pull and Push operations if there are differences between your local data and the server. It allows you to granularly review and merge changes.

### Interface Overview
-   **Tabs:** Data is organized by type (Processes, Api Calls, etc.). Tabs with conflicts or changes show a badge count.
-   **Status Badges:**
    -   <span class="badge badge-danger">conflict</span>: The item exists in both places but has different values. You **must** choose which version to keep.
    -   <span class="badge badge-info">onlyRepo</span>: The item exists on the server but not locally (e.g., a colleague added it).
    -   <span class="badge badge-warning">onlyLocal</span>: The item exists locally but not on the server (e.g., you created it).
    -   <span class="badge badge-secondary">same</span>: The item is identical.

### Visual Diff
-   **Highlight Changes:** Check this box to see a side-by-side comparison of the JSON data.
-   **Green/Red Highlights:** Additions are green, removals are red, and changed values are highlighted.
-   **Show Changed Fields Only:** Hides unchanged properties to focus on what's different.

### Resolving Conflicts
For each item where a choice is needed:
1.  Review the differences.
2.  Select **Repo** to keep the server version (discarding your local change).
3.  Select **Local** to keep your version (overwriting the server).
4.  Use **Choose all Repo** or **Choose all Local** buttons to bulk-select for the current tab.

### Committing
When pushing, a **Commit Message** field appears at the bottom. You must provide a message to explain your changes for the project history.
