# Repositories & Data Sync

The **Repositories** page is the central hub for managing data updates in Landscapr. It allows you to connect to a GitHub repository, edit data in a safe environment, and submit your changes for review.

## 1. Connect to GitHub
To start, you must authenticate with GitHub:
1.  Enter your **Personal Access Token (PAT)** in the input field.
2.  Click **Connect**.
3.  Once connected, a list of available repositories will appear on the left.
4.  Select the repository you want to work with.

## 2. Start Editing
By default, you are in **View Mode** (on the `main` branch). To make changes, you must start an editing session.
1.  Select the file you wish to work on from the file list.
2.  Click the **Load** button to bring the data into Landscapr.
3.  Click the **Start Edit Mode** button.
    *   This automatically creates a personal working branch for you (e.g., `username-2023-10-27...`).
    *   You are now safe to make changes without affecting the main database.

## 3. Saving Changes
As you work in the application (editing processes, capabilities, etc.), remember to save your progress back to your personal branch.
1.  Return to the **Repositories** page.
2.  Click **Save Changes**.
3.  If there are conflicts, a resolution window will appear. Otherwise, your changes are saved to your branch on GitHub.

## 4. Submit Changes
When you have finished all your updates and verified them:
1.  Click the **Submit Changes** button.
2.  Confirm the submission in the dialog.
3.  This creates a "Pull Request" sending your changes to the administrators for review.
4.  After submission, you can return to the main view to see the latest approved data.

## 5. Local Data Operations
If you do not use GitHub, you can manage data manually:
-   **Download Local:** Saves the current application state as a JSON file to your computer.
-   **Upload Local:** Replaces the current application state with data from a JSON file on your computer.
