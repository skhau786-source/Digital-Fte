#!/usr/bin/env python3
"""
AUTO-FTE Master Automated Test Suite Runner
══════════════════════════════════════════
Executes all phase-wise automated test suites sequentially:
  - Phase 1: Security Hardening & Zero-Bypass Auth Bridge
  - Phase 2: Live Store Onboarding & Real OAuth Connection
  - Phase 3: AI Post Generator & Task Scheduler Modals
  - Phase 4: Dynamic Analytics Engine & SQL Aggregations
  - Phase 5: Anti-Hallucination Agent Guardrails & Telemetry

Outputs a structured executive scorecard.
"""

import sys
import time
import subprocess
import os

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

PHASE_DIRS = [
    ("Phase 1: Security & Auth Bridge", "tests/phase1_security_auth"),
    ("Phase 2: Stores & OAuth", "tests/phase2_stores_oauth"),
    ("Phase 3: AI Modals & Scheduling", "tests/phase3_modals_ai"),
    ("Phase 4: Dynamic Analytics Engine", "tests/phase4_analytics"),
    ("Phase 5: Agent Guardrails & Telemetry", "tests/phase5_agents_guardrails"),
    ("Phase 6: New User Clean State & Store OAuth", "tests/phase6_new_user_isolation"),
    ("Phase 7: Storefront Support Agent (Claude)", "tests/phase7_support_agent"),
]


def print_banner():
    print("\n" + "=" * 72)
    print(" [AUTO-FTE] Enterprise Master Test Suite Runner")
    print("=" * 72)


def run_phase(title: str, directory: str):
    print(f"\n▶ Running: {title} [{directory}]...")
    start_time = time.time()
    cmd = [sys.executable, "-m", "pytest", directory, "-v", "--no-header"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    duration = time.time() - start_time

    # Parse pytest output
    passed = 0
    failed = 0
    for line in res.stdout.splitlines():
        if " PASSED" in line:
            passed += 1
        elif " FAILED" in line:
            failed += 1

    success = (res.returncode == 0) and (failed == 0)
    status_str = "[PASS]" if success else "[FAIL]"
    print(f"  Result: {status_str} | {passed} passed, {failed} failed ({duration:.2f}s)")
    if not success:
        print("\n--- Failure Log ---")
        print(res.stdout)
        print(res.stderr)
        print("-------------------\n")

    return {
        "title": title,
        "passed": passed,
        "failed": failed,
        "duration": duration,
        "success": success,
    }


def main():
    print_banner()
    results = []
    total_start = time.time()

    for title, directory in PHASE_DIRS:
        res = run_phase(title, directory)
        results.append(res)

    total_duration = time.time() - total_start
    total_passed = sum(r["passed"] for r in results)
    total_failed = sum(r["failed"] for r in results)
    all_succeeded = all(r["success"] for r in results)

    print("\n" + "=" * 72)
    print(" MASTER TEST SUITE EXECUTION SUMMARY")
    print("=" * 72)
    print(f"{'Phase':<42} | {'Status':<8} | {'Passed':<6} | {'Time':<6}")
    print("-" * 72)
    for r in results:
        status_label = "PASS" if r["success"] else "FAIL"
        print(f"{r['title']:<42} | {status_label:<8} | {r['passed']:<6} | {r['duration']:.2f}s")
    print("-" * 72)
    overall_status = "ALL TESTS PASSED (Target 9.5+/10 Verified)" if all_succeeded else "SOME TESTS FAILED"
    print(f"{'TOTAL':<42} | {'PASSED' if all_succeeded else 'FAILED':<8} | {total_passed:<6} | {total_duration:.2f}s")
    print("=" * 72)
    print(f"Overall Evaluation Verdict: {overall_status}\n")

    if not all_succeeded:
        sys.exit(1)


if __name__ == "__main__":
    main()
