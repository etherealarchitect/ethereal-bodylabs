#!/usr/bin/env python3
"""
End-to-end smoke tests that drive real Chromium against every auth and app
route to catch hydration mismatches and post-hydration runtime crashes that
SSR-only fetch tests miss.

Usage:
    SMOKE_BASE_URL=http://localhost:8080 python3 scripts/smoke-routes.py

Exits non-zero when any route triggers a page error, a console error, or a
React hydration-mismatch warning.
"""
from __future__ import annotations

import asyncio
import os
import re
import sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("SMOKE_BASE_URL", "http://localhost:8080").rstrip("/")
SCREENSHOTS = Path("/tmp/browser/smoke-routes")
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

PUBLIC_ROUTES = [
    "/", "/pricing", "/auth", "/auth/callback", "/forgot-password",
    "/reset-password", "/checkout/return", "/docs",
]
APP_ROUTES = [
    "/app", "/app/onboarding", "/app/profile", "/app/settings", "/app/billing",
    "/app/upgrade", "/app/upgrade/return", "/app/insights", "/app/reports",
    "/app/records", "/app/physique", "/app/photos/compare", "/app/nutrition",
    "/app/exercises", "/app/workouts", "/app/programs", "/app/doses",
    "/app/protocol", "/app/bloodwork", "/app/coach", "/app/admin",
    "/app/admin/ai-usage",
]
ROUTES = PUBLIC_ROUTES + APP_ROUTES

# Console noise we intentionally ignore (dev-only warnings, third-party).
IGNORE_MSG = re.compile(
    r"(Download the React DevTools|"
    r"vite.*hmr|"
    r"\[vite\]|"
    r"Service worker registration|"
    r"Failed to load resource:.*favicon|"
    r"Permissions-Policy)",
    re.IGNORECASE,
)
HYDRATION_RE = re.compile(
    r"(hydration failed|did not match|text content does not match|"
    r"minified react error #(418|423|425))",
    re.IGNORECASE,
)


async def check_route(context, path: str) -> list[str]:
    page = await context.new_page()
    errors: list[str] = []

    def on_console(msg):
        if msg.type not in ("error", "warning"):
            return
        text = msg.text
        if IGNORE_MSG.search(text):
            return
        if msg.type == "error" or HYDRATION_RE.search(text):
            errors.append(f"[console.{msg.type}] {text}")

    def on_pageerror(err):
        errors.append(f"[pageerror] {err}")

    page.on("console", on_console)
    page.on("pageerror", on_pageerror)

    url = f"{BASE}{path}"
    try:
        resp = await page.goto(url, wait_until="domcontentloaded", timeout=20000)
        if resp and resp.status >= 500:
            errors.append(f"[http] {resp.status} at {url}")
        # Let post-hydration effects settle.
        await page.wait_for_timeout(800)
    except Exception as exc:
        errors.append(f"[nav] {exc}")

    if errors:
        slug = path.strip("/").replace("/", "_") or "root"
        try:
            await page.screenshot(path=str(SCREENSHOTS / f"{slug}.png"), timeout=5000)
        except Exception:
            pass

    await page.close()
    return errors


async def main() -> int:
    failures: dict[str, list[str]] = {}
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 1800},
            ignore_https_errors=True,
        )
        for path in ROUTES:
            errs = await check_route(context, path)
            status = "OK" if not errs else f"FAIL ({len(errs)})"
            print(f"  {status:<10} {path}")
            if errs:
                failures[path] = errs
        await browser.close()

    if failures:
        print(f"\n{len(failures)} route(s) failed smoke test:\n")
        for path, errs in failures.items():
            print(f"  {path}")
            for e in errs:
                print(f"    - {e}")
        return 1
    print(f"\nAll {len(ROUTES)} routes passed smoke test.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
