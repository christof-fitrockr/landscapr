from playwright.sync_api import Page, expect, sync_playwright

def verify_footer_version(page: Page):
    # 1. Arrange: Go to the home page.
    page.goto("http://localhost:4200")

    # 2. Act: Scroll to the bottom to see the footer.
    # (Actually standard footer is usually visible or just needs scrolling)

    # 3. Assert: Check for the version text.
    # The text should start with "Version" and contain a date like "2025-"
    version_text = page.locator("footer").get_by_text("Version 2025-")

    expect(version_text).to_be_visible()

    # Get the text content to print it out (for debugging log)
    print(f"Found footer text: {version_text.first.text_content()}")

    # 4. Screenshot: Capture the footer area
    footer = page.locator("footer")
    footer.screenshot(path="/home/jules/verification/footer_version.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_footer_version(page)
        finally:
            browser.close()
