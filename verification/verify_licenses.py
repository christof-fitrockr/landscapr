from playwright.sync_api import Page, expect, sync_playwright

def verify_licenses_page(page: Page):
    # 1. Arrange: Go to the application homepage.
    page.goto("http://localhost:4200/")

    # 2. Act: Find the "Licenses" link in the footer and click it.
    licenses_link = page.get_by_role("link", name="Licenses")
    licenses_link.click()

    # 3. Assert: Confirm the navigation was successful and content is present.
    # Wait for the heading to be visible
    expect(page.get_by_role("heading", name="Licenses")).to_be_visible()

    # Check for presence of "Publisher:" text which indicates license data is loaded
    expect(page.get_by_text("Publisher:", exact=False).first).to_be_visible()

    # Check for a specific license that we know exists from the generated file, e.g., @angular/core
    expect(page.get_by_text("@angular/core", exact=False).first).to_be_visible()

    # 4. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="verification/licenses-page.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_licenses_page(page)
        finally:
            browser.close()
