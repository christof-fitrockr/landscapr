# Dashboard

The Dashboard is your landing page in Landscapr. It provides an immediate overview of the application's health and your data synchronization status.

## Status Overview
The dashboard displays the current state of your local data compared to the remote repository (if configured).
- **In Sync:** Your local data matches the remote repository.
- **Local Newer:** You have made changes that are not yet pushed to the remote.
- **Remote Newer:** There are updates on the remote repository that you should pull.
- **Diverged:** Both local and remote have changed. You may need to resolve conflicts.

## Quick Access
Use the navigation bar at the top to jump to the main sections of the application:
- **Journeys:** Customer paths and interactions.
- **Process:** Business workflows and logic.
- **Api Call:** Technical API definitions (Functions).
- **Capability:** Business capabilities map.
- **System:** Application inventory.

## Synchronization
If you have configured a repository in the **Repositories** section, you can use the sync controls (often located in the top navigation bar or on the dashboard) to:
- **Push:** Save your local changes to the remote GitHub repository.
- **Pull:** Load the latest changes from the remote GitHub repository.
