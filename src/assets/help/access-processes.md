# How to Access the Processes?

## Landscapr Account Settings
Ensure you have your Landscapr credentials ready.

## Create and Authorize Account

### Create an account on Github
1. Invite User to **VWAftersalesPlatform**.
2. Grant Access rights (read or write) to **aftersales-processes** repository.

### Generate the Personal Access Token
1. Click your profile picture (top right) → **Settings**.
2. On the left sidebar, click **Developer settings** (at the very bottom).
3. Select **Personal access tokens** → **Tokens (classic)**.
4. Click **Generate new token** → **Generate new token (classic)**.
5. **Note**: Give it a name (e.g., "Landscapr").
6. **Scopes**: Select `repo`.
7. Click **Generate token** and copy it immediately.

### Authorize for SSO (The "Magic" Step)
Even with 2FA enabled on your account, the token is currently "blind" to your organization's private data.

1. Stay on the **Tokens (classic)** list page (where your new token is listed).
2. Locate your new token and click the **Configure SSO** button next to it.
3. A list of organizations you belong to will appear.
4. Find the organization that enforces SSO/2FA and click **Authorize**.
5. You will be prompted to sign in to your organization’s identity provider.
6. Once you complete the external login, you will see a green "Authorized" badge next to the organization name.

## Open Landscapr and Add the Personal Access Token
1. Open [www.landscapr.de](https://www.landscapr.de) and enter your credentials.
2. Go to **Repositories** in the top bar (DB Icon).
3. Enter your **Personal Access Token** and click **Connect**.
4. Select `aftersales-processes` from the list of repositories.
5. Select `aftersales.json` and click on **Load**.
