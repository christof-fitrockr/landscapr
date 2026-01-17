# How To: Workflow

This chapter guides you through the recommended workflow for using Landscapr with a remote GitHub repository. Following this process ensures your work is saved safely and synchronized with your team.

## 1. Setup: Connect & Select Branch
Before starting work, ensure you are in the right context.

1.  Navigate to the **Repositories** page.
2.  Connect to your repository.
3.  **Create a New Branch** or select an existing feature branch.
    *   **Important:** Avoid working directly on the `main` branch to prevent overwriting stable data.
4.  **Load** the data file (e.g., `aftersales.json`) from that branch.

## 2. The Development Cycle

### Step 1: Work
Perform your tasks within the application:
-   Create or edit Journeys, Processes, and Capabilities.
-   Your changes are automatically saved to your browser's **Local Storage**.

### Step 2: Save (Push)
Once you have completed a logical unit of work:
1.  Go to the **Repositories** page.
2.  Verify you are on your feature branch.
3.  Click **Save Changes**.
4.  Enter a **Commit Message** (e.g., `feat: updated payment process`) and confirm.
    *   This pushes your local changes to the GitHub branch.

### Step 3: Create Pull Request
When your feature is complete and ready for review:
1.  On the Repositories page, click **Create Pull Request**.
2.  Provide a title and description.
3.  This signals to your team that your changes are ready to be merged into the main database.
4.  **Optional:** After creating the PR, the system will ask if you want to create a new branch immediately. This is recommended if you plan to start a new task right away.

## 3. Managing Branches & Tips for Business Users

### Switching to Main
If you want to view the latest stable version of the data (as it exists on the server), use the **Switch to Main** button.
*   This is useful to verify what is currently live.
*   **Note:** If you have unsaved local changes that conflict with the main branch, the Merge Resolver will appear to help you reconcile them.

### Git Basics for Non-Technical Users
*   **Main Branch:** Think of this as the "Golden Master" or "Production" version. It is usually read-only or protected.
*   **Feature Branch:** A personal copy where you make changes. Always work here.
*   **Pull Request (PR):** A formal request to merge your changes into the Main Branch. It allows for review and discussion.
*   **Commit:** A "Save" point in history. Frequent commits with clear messages help track your progress.

## 4. Quick Sync (Optional)
If you are working on a branch alone, you can use the **Sync Badges** in the top navigation bar for quick access:
-   **Download (Pull):** If the remote branch has updates.
-   **Upload (Push):** If you have local changes to save.

## 4. The Merge Modal
The **Resolve Merge Conflicts** modal appears during Load or Save operations if there are differences between your local data and the server.
-   **Highlight Changes:** Use this to visually compare JSON data.
-   **Green/Red:** Indicates additions or deletions.
-   **Resolve:** Choose "Local" (keep your work) or "Repo" (keep server work) for each conflict.
