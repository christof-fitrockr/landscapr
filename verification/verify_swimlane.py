
import asyncio
from playwright.async_api import async_playwright
import json
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"Page Error: {exc}"))

        # Navigate to login to set local storage
        try:
            print("Navigating to login page...")
            await page.goto("http://localhost:4200/#/login", timeout=60000)
        except Exception as e:
            print(f"Failed to load login page: {e}")
            await browser.close()
            return

        # Mock Data
        process_data = [{
            "id": "p1",
            "name": "Modern Swimlane Test",
            "role": 2, # Vehicle
            "description": "Testing the new modern look",
            "steps": [],
            "apiCallIds": ["api1"]
        }]

        api_data = [{
            "id": "api1",
            "name": "Check Status",
            "input": "VIN",
            "output": "Status",
            "implementedBy": ["app1"]
        }]

        app_data = [{
            "id": "app1",
            "name": "Backend System"
        }]

        user_data = {
            "username": "admin",
            "token": "fake-token",
            "admin": True,
            "success": True,
            "displayName": "Admin User"
        }

        # Inject into LocalStorage
        print("Injecting local storage...")
        await page.evaluate(f"""() => {{
            localStorage.setItem('currentUser', '{json.dumps(user_data)}');
            localStorage.setItem('ls_process', '{json.dumps(process_data)}');
            localStorage.setItem('ls_api', '{json.dumps(api_data)}');
            localStorage.setItem('ls_app', '{json.dumps(app_data)}');
        }}""")

        # RELOAD the page so AuthenticationService reads the new localStorage
        print("Reloading page to initialize Auth Service...")
        await page.reload()

        # Wait a bit for app to bootstrap
        await page.wait_for_timeout(2000)

        # Navigate to the swimlane view using Hash Syntax
        print("Navigating to Swimlane View...")
        await page.goto("http://localhost:4200/#/swimlane/view/p1")

        # Wait for canvas to be present
        try:
            print("Waiting for canvas...")
            # Increased timeout just in case
            await page.wait_for_selector("canvas", timeout=30000)
            print("Canvas found. Waiting for rendering...")
            # Give it a moment to render
            await asyncio.sleep(2)

            # Screenshot
            if not os.path.exists("verification"):
                os.makedirs("verification")

            await page.screenshot(path="verification/swimlane_modern.png")
            print("Screenshot saved to verification/swimlane_modern.png")

        except Exception as e:
            print(f"Error waiting for canvas: {e}")
            # Take a screenshot anyway to see what's wrong
            await page.screenshot(path="swimlane_error.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
