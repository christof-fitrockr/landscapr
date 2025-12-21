import json
import os
import time
from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()

        # Capture console
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"Browser Error: {exc}"))

        # Data Seeding
        user_data = {
            "token": "fake-token",
            "admin": True,
            "success": True,
            "displayName": "Test Admin",
            "username": "admin@test.com"
        }

        process_data = [{
            "id": "proc1",
            "repoId": "repo1",
            "name": "Test Process",
            "description": "A test process",
            "status": 0,
            "input": "",
            "output": "",
            "tags": [],
            "role": 0,
            "steps": [],
            "apiCallIds": [],
            "favorite": False,
            "implementedBy": []
        }]

        journey_data = [{
            "id": "j1",
            "repoId": "repo1",
            "name": "Test Journey",
            "items": [],
            "connections": [],
            "layout": {
                "nodes": [
                    {
                        "id": "node1",
                        "type": "process",
                        "label": "Test Process Node",
                        "x": 100,
                        "y": 100,
                        "width": 120,
                        "height": 60,
                        "processId": "proc1"
                    }
                ],
                "edges": [],
                "panX": 0,
                "panY": 0,
                "zoom": 1
            }
        }]

        print("Navigating to root to seed storage...")
        try:
            page.goto("http://localhost:4200/", timeout=10000)
        except:
            print("Initial navigation timeout")

        # Inject LocalStorage
        print("Injecting localStorage...")
        page.evaluate(f"""() => {{
            localStorage.setItem('currentUser', '{json.dumps(user_data)}');
            localStorage.setItem('ls_process', '{json.dumps(process_data)}');
            localStorage.setItem('ls_journey', '{json.dumps(journey_data)}');
        }}""")

        # RELOAD TO APPLY AUTH
        print("Reloading page...")
        page.reload()

        # Navigate to Journey
        target_url = "http://localhost:4200/#/journeys/editor/j1"
        print(f"Navigating to {target_url}...")
        page.goto(target_url)

        time.sleep(5)

        # Check body text
        body_text = page.inner_text("body")
        if "Login" in body_text and "Email" in body_text:
             print("Still on Login page!")
             return

        # Wait for the process node to appear
        try:
            print("Waiting for node rect...")
            # Target the RECT instead of text
            page.wait_for_selector('rect.node.process', timeout=10000)
            print("Journey loaded and node found.")
        except Exception as e:
            print("Failed to find process node on canvas.")
            raise e

        # Double click the node
        node_locator = page.locator('rect.node.process').first
        # Try triggering dblclick event explicitly via dispatchEvent
        print("Dispatching dblclick event...")
        node_locator.dispatch_event('dblclick')

        # Wait for Swimlane View directly
        try:
            print("Waiting for Swimlane View...")
            page.wait_for_selector('app-swimlane-view', timeout=10000)
            print("Swimlane View found in DOM.")
        except:
            print("Swimlane View failed to appear.")
            return

        # Give it a moment to render
        time.sleep(2)

        # Check for Canvas
        try:
            canvas = page.locator('app-swimlane-view canvas').first
            if canvas.is_visible():
                print("Canvas element is visible.")
                box = canvas.bounding_box()
                print(f"Canvas dimensions: {box['width']}x{box['height']}")
                if box['width'] > 0 and box['height'] > 0:
                    print("Canvas has valid dimensions.")
                else:
                    print("Canvas has 0 dimensions!")
            else:
                # Even if not "visible" (e.g. opacity 0), check bounds
                print("Canvas element is NOT visible (checking bounds anyway).")
                box = canvas.bounding_box()
                if box:
                    print(f"Canvas dimensions: {box['width']}x{box['height']}")
        except:
            print("Canvas element not found.")

        # Take screenshot
        os.makedirs("verification", exist_ok=True)
        page.screenshot(path="verification/modal_fixed.png")
        print("Screenshot saved to verification/modal_fixed.png")

        browser.close()

if __name__ == "__main__":
    verify()
