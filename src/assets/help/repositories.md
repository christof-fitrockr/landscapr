# Repositories & Data Sync

The **Repositories** page is the control center for data synchronization. It allows you to connect Landscapr to a GitHub repository, manage branches, and synchronize your work.

## 1. Connect to GitHub
To start, you must authenticate with GitHub:
1.  Enter your **Personal Access Token (PAT)** in the input field.
2.  Click **Connect**.
3.  Once connected, a list of available repositories will appear on the left.
4.  Select the repository you want to work with (e.g., `aftersales-processes`).

## 2. Select a File
After selecting a repository, the file list will populate.
1.  Select the data file you wish to edit (usually a `.json` file like `aftersales.json`).
2.  Click the **Load** button to fetch the file content from GitHub and load it into your local Landscapr workspace.
    *   **Note:** If you have unsaved local changes, you may be prompted to resolve conflicts before loading completes.

## 3. Branch Management
Landscapr supports a branch-based workflow to ensure stability.
-   **Current Branch:** displayed in the "Workspace" card.
-   **Switch Branch:** Use the dropdown menu to switch to an existing branch.
-   **New Branch:** Click **New Branch** to create a feature branch.
    *   **Best Practice:** Never work directly on the `main` or `master` branch. Always create a new branch (e.g., `feature/payment-process`) for your changes.

## 4. Saving Changes (Push)
When you have finished editing in the application:
1.  Return to the **Repositories** page.
2.  Ensure you are on the correct branch.
3.  Click **Save Changes**.
4.  **Merge Resolver:** If there are differences between your local data and the remote branch, the Merge Resolver will open.
    *   Review the changes.
    *   Enter a **Commit Message** (required).
    *   Click **Apply** to push your changes to GitHub.

## 5. Pull Requests
Once your changes are saved to a feature branch, you can propose merging them into the main branch.
1.  Click **Create Pull Request**.
2.  Enter a Title and Description for your changes.
3.  Click **Create**.
4.  Your team can now review the Pull Request on GitHub.
5.  **Open Pull Requests:** A list of open PRs is displayed at the bottom of the page for quick access.

## 6. Local Data Operations
If you do not use GitHub, you can manage data manually:
-   **Download Local:** Saves the current application state as a JSON file to your computer.
-   **Upload Local:** Replaces the current application state with data from a JSON file on your computer.
