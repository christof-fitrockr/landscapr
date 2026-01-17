from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Login bypass
    page.add_init_script("""
        localStorage.setItem('currentUser', JSON.stringify({
            token: 'fake-token',
            admin: true,
            success: true,
            displayName: 'Test User',
            username: 'testuser'
        }));
    """)

    # Mock GitHub API
    def handle_user(route):
        route.fulfill(json={"login": "testuser"})

    def handle_repos(route):
        route.fulfill(json=[
            {"name": "test-repo", "default_branch": "main", "owner": {"login": "testuser"}}
        ])

    def handle_contents(route):
        route.fulfill(json=[
             {"name": "landscapr.json", "path": "landscapr.json", "type": "file", "sha": "abc", "content": "e30="} # {}
        ])

    def handle_branches(route):
        route.fulfill(json=[
            {"name": "main"},
            {"name": "feature-1"}
        ])

    def handle_ref(route):
        route.fulfill(json={
            "ref": "refs/heads/main",
            "object": {"sha": "sha-main"}
        })

    def handle_create_branch(route):
        route.fulfill(json={"ref": "refs/heads/new-branch"})

    page.route("https://api.github.com/user", handle_user)
    page.route("https://api.github.com/user/repos", handle_repos)
    page.route("https://api.github.com/repos/testuser/test-repo/contents/", handle_contents)
    page.route("https://api.github.com/repos/testuser/test-repo/contents?ref=main", handle_contents)
    page.route("https://api.github.com/repos/testuser/test-repo/contents?ref=feature-1", handle_contents)
    page.route("https://api.github.com/repos/testuser/test-repo/contents/landscapr.json", handle_contents)
    page.route("https://api.github.com/repos/testuser/test-repo/contents/landscapr.json?ref=main", handle_contents)
    page.route("https://api.github.com/repos/testuser/test-repo/contents/landscapr.json?ref=feature-1", handle_contents)
    page.route("https://api.github.com/repos/testuser/test-repo/branches", handle_branches)
    page.route("https://api.github.com/repos/testuser/test-repo/git/ref/heads/main", handle_ref)

    page.goto("http://localhost:4200/")
    try:
        page.wait_for_selector("app-root", timeout=10000)
    except:
        print("Timeout waiting for app-root")

    # Navigate to Repositories
    page.goto("http://localhost:4200/#/repositories")

    # Set PAT and reload
    page.evaluate("localStorage.setItem('github_pat', 'fake-pat')")
    page.reload()

    # Wait for repo list
    try:
        print("Waiting for repo-item...")
        page.wait_for_selector(".repo-item", timeout=5000)
        print("Clicking repo...")
        page.click("text=test-repo")

        # Verify Collapsible Header
        page.wait_for_selector("text=Repository: test-repo", timeout=5000)

        print("Waiting for file-item...")
        page.wait_for_selector(".file-item", timeout=5000)
        print("Clicking file...")
        page.click(".file-item") # Use CSS selector

        # Verify Workspace
        print("Waiting for Workspace...")
        page.wait_for_selector(".card-header:has-text('Workspace')", timeout=5000)
        print("Workspace found!")

        # Should show warning because default branch is main
        page.wait_for_selector(".text-danger:has-text('You are on the main branch')", timeout=5000)

        page.screenshot(path="/home/jules/verification/repo_main_branch.png")

        # Switch branch
        print("Switching branch...")
        page.click("button.dropdown-toggle")
        page.click("text=feature-1")

        # Should hide warning
        page.wait_for_timeout(1000)
        page.screenshot(path="/home/jules/verification/repo_feature_branch.png")

        # Click Save Changes (Simple Mode)
        print("Clicking Save...")
        page.click("text=Save Changes")

        # Should show Simple Mode Commit Dialog
        print("Waiting for Commit Dialog...")
        page.wait_for_selector("text=Ready to Commit", timeout=5000)
        page.screenshot(path="/home/jules/verification/simple_commit_dialog.png")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="/home/jules/verification/error.png")

    browser.close()

with sync_playwright() as p:
    run(p)
