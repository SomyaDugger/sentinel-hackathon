#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sentinel IVMS — Live Breach Simulator
=======================================
When executed, immediately fires a simulated detection of a wanted suspect
vehicle at a specific camera checkpoint, proving real-time live alert
generation and GIS mapping during hackathon demonstrations.

Now also generates a realistic ANPR snapshot via visual_detector.py.

Usage:
  python simulate_live_breach.py                    # default: GJ01AB1234
  python simulate_live_breach.py GJ06GH3456         # specific plate
  python simulate_live_breach.py --burst 5          # rapid 5 detections
"""

import io
import json
import os
import sys
import time

# Fix Windows console encoding for Unicode characters
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')  # type: ignore

import requests

# Import the visual detector for snapshot generation
sys.path.insert(0, os.path.dirname(__file__))
try:
    from visual_detector import generate_snapshot
    HAS_VISUAL = True
except ImportError:
    HAS_VISUAL = False

API_URL = "http://localhost:3000/api/detections"
CAMERAS_URL = "http://localhost:3000/api/cameras"

# Pre-configured suspect vehicles (must exist in watchlist)
SUSPECT_VEHICLES = {
    "GJ01AB1234": {
        "desc": "White Maruti Swift Dzire — Stolen from Satellite, Ahmedabad",
        "priority": "Critical",
    },
    "GJ06GH3456": {
        "desc": "Black Mahindra Scorpio — Vadodara Highway Robbery",
        "priority": "Critical",
    },
    "GJ05CD5678": {
        "desc": "Hyundai Creta — Surat Narcotics Suspect",
        "priority": "High",
    },
    "GJ03EF9012": {
        "desc": "Grey Tata Nexon EV — Inter-state Stolen (Rajasthan)",
        "priority": "High",
    },
}


def get_cameras() -> list[dict]:
    """Fetch cameras from backend."""
    try:
        resp = requests.get(CAMERAS_URL, timeout=5)
        data = resp.json()
        if data.get("success"):
            return data["data"]
    except Exception as e:
        print(f"\n  ❌ Cannot reach backend: {e}")
        print("  💡 Start the backend: cd 'sentinel hackathon' && npm run dev\n")
        sys.exit(1)
    return []


def fire_detection(camera: dict, plate: str, confidence: float = 0.97, snapshot_url: str | None = None) -> dict:
    """Send a single detection to the backend."""
    payload = {
        "camera_id": camera["id"],
        "license_plate": plate,
        "confidence": confidence,
        "snapshot_url": snapshot_url or f"/snapshots/breach_{plate}_{int(time.time())}.jpg",
    }
    resp = requests.post(API_URL, json=payload, timeout=5)
    return resp.json()


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Sentinel IVMS — Live Breach Simulator"
    )
    parser.add_argument(
        "plate",
        nargs="?",
        default="GJ01AB1234",
        help="License plate to simulate (default: GJ01AB1234)",
    )
    parser.add_argument(
        "--burst",
        type=int,
        default=1,
        help="Number of rapid detections to fire (default: 1)",
    )
    parser.add_argument(
        "--camera-index",
        type=int,
        default=0,
        help="Camera index to use (0 = first discovered camera)",
    )
    parser.add_argument(
        "--no-snapshot",
        action="store_true",
        help="Skip snapshot generation",
    )
    args = parser.parse_args()

    plate = args.plate.replace(" ", "").replace("-", "").upper()

    print()
    print("  ╔═══════════════════════════════════════════════════╗")
    print("  ║   🚨 SENTINEL IVMS — LIVE BREACH SIMULATOR 🚨    ║")
    print("  ╚═══════════════════════════════════════════════════╝")
    print()

    # Show suspect info if known
    suspect = SUSPECT_VEHICLES.get(plate)
    if suspect:
        print(f"  🎯 Target: {plate}")
        print(f"  📋 {suspect['desc']}")
        print(f"  ⚠️  Priority: {suspect['priority']}")
    else:
        print(f"  🎯 Target: {plate}")
        print(f"  📋 Custom plate (may or may not be in watchlist)")
    print()

    # Discover cameras
    cameras = get_cameras()
    if not cameras:
        print("  ❌ No cameras found in database.")
        sys.exit(1)

    cam_idx = min(args.camera_index, len(cameras) - 1)
    selected_camera = cameras[cam_idx]
    cam_name = selected_camera.get("landmark", "Unknown")
    cam_district = selected_camera.get("district", "Unknown")

    print(f"  📷 Checkpoint Camera: {cam_name}, {cam_district}")
    print(f"  📡 Camera ID: {selected_camera['id']}")
    print(f"  🔫 Firing {args.burst} detection(s)...")
    print()
    print("  " + "═" * 55)
    print()

    for i in range(args.burst):
        if i > 0:
            time.sleep(0.5)

        confidence = round(0.94 + (0.05 * (1 - i / max(args.burst, 1))), 2)

        # ── Generate visual snapshot ─────────────────────────────
        snapshot_url = None
        if HAS_VISUAL and not args.no_snapshot:
            try:
                print(f"  📸 Generating ANPR snapshot #{i + 1}...")
                snapshot_url = generate_snapshot(
                    plate=plate,
                    camera_name=cam_name,
                    district=cam_district,
                    confidence=confidence,
                    filename=f"breach_{plate}_{int(time.time())}_{i}.jpg",
                )
                print(f"  ✅ Snapshot saved: {snapshot_url}")
            except Exception as e:
                print(f"  ⚠️  Snapshot generation failed: {e}")
        elif not HAS_VISUAL:
            print("  ⚠️  visual_detector not available (install opencv-python-headless)")

        # ── Fire detection ───────────────────────────────────────
        result = fire_detection(selected_camera, plate, confidence, snapshot_url)

        if result.get("success"):
            data = result["data"]
            is_match = data.get("is_watchlist_match", False)

            if is_match:
                wl = data.get("watchlist", {})
                print(f"  🚨🚨🚨 BREACH CONFIRMED — Detection #{i + 1} 🚨🚨🚨")
                print(f"  ┌─────────────────────────────────────────────┐")
                print(f"  │ Plate:      {plate:<33}│")
                print(f"  │ Match:      ✅ WATCHLIST HIT                 │")
                print(f"  │ Priority:   {wl.get('alert_priority', '?'):<33}│")
                print(f"  │ Type:       {wl.get('entity_type', '?'):<33}│")
                print(f"  │ Source DB:  {wl.get('source_database', '?'):<33}│")
                print(f"  │ Case Ref:   {wl.get('case_reference', '?'):<33}│")
                print(f"  │ Confidence: {confidence:.0%}{' ' * 29}│")
                print(f"  │ Camera:     {cam_name:<33}│")
                print(f"  │ District:   {cam_district:<33}│")
                print(f"  │ Snapshot:   {(snapshot_url or 'N/A'):<33}│")
                print(f"  │ Time:       {data.get('detected_at', '?')[:19]:<33}│")
                print(f"  └─────────────────────────────────────────────┘")
            else:
                print(f"  ✅ Detection #{i + 1}: {plate} recorded (no watchlist match)")
        else:
            error = result.get("error", {})
            msg = error.get("message", str(error)) if isinstance(error, dict) else str(error)
            print(f"  ❌ Detection #{i + 1} FAILED: {msg}")

        print()

    print("  " + "═" * 55)
    print()
    print("  ✅ Simulation complete.")
    print("  👀 Check the Sentinel Command Center dashboard for live alerts.")
    print("  📊 Download CSV report: http://localhost:3000/api/reports/detections-csv")
    print()


if __name__ == "__main__":
    main()
