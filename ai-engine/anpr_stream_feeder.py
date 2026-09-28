#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sentinel IVMS — ANPR Stream Feeder
===================================
Simulates real-time ANPR camera ingestion by processing frames and sending
detected license plates to the Sentinel backend via POST /api/detections.

Modes:
  1. Simulated queue (default) — cycles through Gujarat vehicles at ~2 FPS
  2. MP4 video file — reads frames from a local video
  3. RTSP stream — reads from a live camera feed

Usage:
  python anpr_stream_feeder.py                          # simulated queue
  python anpr_stream_feeder.py --video traffic.mp4      # from video file
  python anpr_stream_feeder.py --rtsp rtsp://10.10.1.1  # from RTSP

CPU budget: processes 1 frame every 500ms (~2 FPS), targeting <25% CPU
on an Intel Core i3.
"""

import argparse
import io
import json
import random
import sys
import time
from datetime import datetime

# Fix Windows console encoding for Unicode characters
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')  # type: ignore

import requests

# ── Configuration ────────────────────────────────────────────────────────
API_URL = "http://localhost:3000/api/detections"
FRAME_INTERVAL = 0.5  # 500ms = 2 FPS

# Gujarat vehicle plates (mix of watchlist and non-watchlist vehicles)
GUJARAT_PLATES = [
    # Watchlist targets (seeded in DB)
    "GJ01AB1234",  # Stolen Vehicle — Critical
    "GJ05CD5678",  # Wanted Person Vehicle — High
    "GJ03EF9012",  # Stolen Vehicle — High
    "GJ06GH3456",  # Wanted Person Vehicle — Critical
    "GJ18JK7890",  # Suspicious Vehicle — Medium
    # Normal traffic (not in watchlist)
    "GJ27AA9999",
    "GJ01BB2233",
    "GJ05CC4455",
    "GJ03DD6677",
    "GJ18EE8899",
    "GJ12FF1122",
    "GJ15GG3344",
    "GJ27HH5566",
    "GJ01JJ7788",
    "GJ05KK9900",
]

# Camera IDs from seeded Gujarat cameras (use first 5 for simulation)
CAMERA_IDS: list[str] = []


def discover_cameras() -> list[str]:
    """Fetch available camera IDs from the backend."""
    try:
        resp = requests.get("http://localhost:3000/api/cameras", timeout=5)
        data = resp.json()
        if data.get("success") and data.get("data"):
            ids = [cam["id"] for cam in data["data"]]
            print(f"  ✅ Discovered {len(ids)} cameras from backend")
            return ids
    except Exception as e:
        print(f"  ⚠️  Could not discover cameras: {e}")
    return []


def send_detection(camera_id: str, plate: str, confidence: float) -> dict:
    """POST a detection to the Sentinel backend."""
    payload = {
        "camera_id": camera_id,
        "license_plate": plate,
        "confidence": round(confidence, 2),
        "snapshot_url": f"/snapshots/anpr_{int(time.time())}_{plate}.jpg",
    }
    try:
        resp = requests.post(API_URL, json=payload, timeout=5)
        return resp.json()
    except requests.exceptions.ConnectionError:
        return {"success": False, "error": "Backend not reachable"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def simulate_queue(camera_ids: list[str], max_detections: int = 0):
    """Run simulated ANPR detections from a rotating plate queue."""
    print("\n  🎥 Mode: Simulated Gujarat Traffic Queue")
    print(f"  📡 Target: {API_URL}")
    print(f"  ⏱️  Frame interval: {FRAME_INTERVAL}s (~2 FPS)")
    print(f"  🚗 Vehicle pool: {len(GUJARAT_PLATES)} plates")
    print(f"  📷 Camera pool: {len(camera_ids)} cameras")
    print("  " + "─" * 50)
    print()

    count = 0
    while True:
        plate = random.choice(GUJARAT_PLATES)
        camera_id = random.choice(camera_ids)

        # Realistic confidence: 0.78–0.99
        confidence = round(random.uniform(0.78, 0.99), 2)

        result = send_detection(camera_id, plate, confidence)
        count += 1
        ts = datetime.now().strftime("%H:%M:%S")

        if result.get("success"):
            data = result.get("data", {})
            is_match = data.get("is_watchlist_match", False)
            if is_match:
                wl = data.get("watchlist", {})
                print(
                    f"  🚨 [{ts}] #{count} MATCH! {plate} → "
                    f"{wl.get('entity_type', '?')} ({wl.get('alert_priority', '?')}) "
                    f"| {confidence:.0%} conf | cam:{camera_id[:8]}…"
                )
            else:
                print(
                    f"  ✅ [{ts}] #{count} {plate} — no match "
                    f"| {confidence:.0%} conf | cam:{camera_id[:8]}…"
                )
        else:
            err = result.get("error", "Unknown error")
            if isinstance(err, dict):
                err = err.get("message", str(err))
            print(f"  ❌ [{ts}] #{count} {plate} — ERROR: {err}")

        if max_detections and count >= max_detections:
            print(f"\n  📊 Completed {count} detections. Stopping.")
            break

        time.sleep(FRAME_INTERVAL)


def process_video(path: str, camera_ids: list[str]):
    """Read frames from a video file and simulate ANPR detections."""
    try:
        import cv2
    except ImportError:
        print("  ❌ opencv-python-headless not installed. Run: pip install -r requirements.txt")
        sys.exit(1)

    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        print(f"  ❌ Cannot open video: {path}")
        sys.exit(1)

    fps = cap.get(cv2.CAP_PROP_FPS)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"\n  🎬 Mode: Video File — {path}")
    print(f"  📐 FPS: {fps:.1f} | Total frames: {total}")
    print(f"  ⏱️  Processing 1 frame every {FRAME_INTERVAL}s\n")

    frame_idx = 0
    count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_idx += 1
        # Skip frames to maintain ~2 FPS processing
        skip = max(1, int(fps * FRAME_INTERVAL))
        if frame_idx % skip != 0:
            continue

        # Simulated ANPR result (in production: YOLO + PaddleOCR)
        plate = random.choice(GUJARAT_PLATES)
        confidence = round(random.uniform(0.80, 0.98), 2)
        camera_id = random.choice(camera_ids)

        result = send_detection(camera_id, plate, confidence)
        count += 1
        ts = datetime.now().strftime("%H:%M:%S")

        if result.get("success"):
            data = result.get("data", {})
            match_str = "🚨 MATCH" if data.get("is_watchlist_match") else "✅ Pass"
            print(f"  {match_str} [{ts}] Frame {frame_idx}: {plate} | {confidence:.0%}")
        else:
            print(f"  ❌ [{ts}] Frame {frame_idx}: {plate} — send failed")

        time.sleep(FRAME_INTERVAL)

    cap.release()
    print(f"\n  📊 Processed {count} detections from {frame_idx} frames.")


def main():
    parser = argparse.ArgumentParser(description="Sentinel ANPR Stream Feeder")
    parser.add_argument("--video", type=str, help="Path to MP4 video file")
    parser.add_argument("--rtsp", type=str, help="RTSP stream URL")
    parser.add_argument(
        "--count", type=int, default=0, help="Max detections (0 = unlimited)"
    )
    args = parser.parse_args()

    print()
    print("  ╔══════════════════════════════════════════════╗")
    print("  ║   SENTINEL IVMS — ANPR Stream Feeder v1.0   ║")
    print("  ╚══════════════════════════════════════════════╝")
    print()

    # Discover cameras from backend
    camera_ids = discover_cameras()
    if not camera_ids:
        print("  ⚠️  No cameras found. Using fallback IDs.")
        print("  💡 Make sure the backend is running on localhost:3000")
        sys.exit(1)

    if args.video:
        process_video(args.video, camera_ids)
    elif args.rtsp:
        process_video(args.rtsp, camera_ids)
    else:
        simulate_queue(camera_ids, max_detections=args.count)


if __name__ == "__main__":
    main()
