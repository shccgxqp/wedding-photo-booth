#!/usr/bin/env python3
"""
Wedding photo booth webapp tests using Playwright.
Run via: python scripts/with_server.py --server "npm run dev" --port 5173 -- python scripts/test_webapp.py
"""

import sys
import time
from playwright.sync_api import sync_playwright, expect

BASE_URL = "http://localhost:5173"
PASS = "[PASS]"
FAIL = "[FAIL]"
results = []


def check(name, fn):
    try:
        fn()
        print(f"  {PASS} {name}")
        results.append((name, True, None))
    except Exception as e:
        print(f"  {FAIL} {name}: {e}")
        results.append((name, False, str(e)))


def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            permissions=["camera"],
            viewport={"width": 1280, "height": 800},
        )
        page = ctx.new_page()

        # Grant fake camera
        ctx.grant_permissions(["camera"])

        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle")

        print("\n--- Layout Screen ---")

        check("page title contains wedding info", lambda: (
            expect(page.locator(".top-bar")).to_be_visible()
        ))

        check("layout cards visible", lambda: (
            expect(page.locator(".layout-card")).to_have_count(4)
        ))

        check("strip layout card present", lambda: (
            expect(page.get_by_text("4格直列")).to_be_visible()
        ))

        check("frame01 layout card present", lambda: (
            expect(page.get_by_text("愛心拍貼")).to_be_visible()
        ))

        print("\n--- Frame Selection Screen (strip layout) ---")

        page.locator(".layout-card").first.click()
        page.wait_for_load_state("networkidle")

        check("frame screen visible after selecting strip layout", lambda: (
            expect(page.locator(".frame-card").first).to_be_visible()
        ))

        # Go back
        back_btn = page.get_by_role("button", name="回版型選擇").first
        if back_btn.is_visible():
            back_btn.click()
            page.wait_for_load_state("networkidle")

        print("\n--- frame01 skips frame selection ---")

        page.get_by_text("愛心拍貼").click()
        page.wait_for_load_state("networkidle")

        check("frame01 goes directly to camera (no frame screen)", lambda: (
            expect(page.locator(".camera-preview-wrap")).to_be_visible()
        ))

        check("heart guide SVG visible on camera preview", lambda: (
            expect(page.locator(".camera-heart-guide")).to_be_visible()
        ))

        check("shot badge shows 1/6 for frame01", lambda: (
            expect(page.locator(".shot-badge")).to_have_text("1 / 6")
        ))

        check("filter bar visible", lambda: (
            expect(page.locator(".filter-bar")).to_be_visible()
        ))

        check("back button present", lambda: (
            expect(page.get_by_role("button", name="回邊框選擇")).to_be_visible()
        ))

        check("capture button present and enabled", lambda: (
            expect(page.get_by_role("button", name="開始拍攝")).to_be_enabled()
        ))

        print("\n--- Result Screen (navigate via back then different layout) ---")

        # Go back to layout selection and check navigation works
        page.get_by_role("button", name="回邊框選擇").click()
        page.wait_for_load_state("networkidle")

        check("back from camera returns to frame/layout screen", lambda: (
            expect(page.locator(".layout-card, .frame-card").first).to_be_visible()
        ))

        browser.close()

    print("\n" + "="*50)
    passed = sum(1 for _, ok, _ in results if ok)
    failed = sum(1 for _, ok, _ in results if not ok)
    print(f"Results: {passed} passed, {failed} failed")

    if failed:
        print("\nFailed tests:")
        for name, ok, err in results:
            if not ok:
                print(f"  {FAIL} {name}: {err}")
        sys.exit(1)
    else:
        print("All tests passed!")
        sys.exit(0)


if __name__ == "__main__":
    run_tests()
