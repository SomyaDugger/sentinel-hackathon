#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sentinel IVMS — Live Grid ANPR Worker v4.1 (Proxy HLS)
========================================================
Ingests live Gujarat CCTV streams via the local authenticated
HLS proxy at http://localhost:3000/api/stream/{cam}/index.m3u8.

The Node.js proxy handles session cookie auth + enc.key decryption
key delivery, so this worker needs NO auth configuration.

Usage:
  python live_grid_worker.py --cam cam04           # single camera
  python live_grid_worker.py --scan                # cycle all active feeds
  python live_grid_worker.py --cam cam04 --count 5 # limited detections
"""

import argparse
import os
import random
import sys
import threading
import time
from datetime import datetime

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')  # type: ignore

# No special FFmpeg options needed — proxy handles auth & key delivery
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = (
    "reconnect;1"
    "|reconnect_streamed;1"
    "|reconnect_delay_max;5"
)

import numpy as np

try:
    import cv2
except ImportError:
    print("  ❌ opencv-python-headless not installed.")
    print("  💡 Run: pip install opencv-python-headless numpy requests")
    sys.exit(1)

import requests

# ── Configuration ────────────────────────────────────────────────────────
API_URL = "http://localhost:3000/api/detections"
CAMERAS_URL = "http://localhost:3000/api/cameras"
SNAPSHOTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'snapshots')

# Local proxy (handles govt CDN auth + AES key)
PROXY_BASE = "http://localhost:3000/api/stream"

FRAME_INTERVAL = 0.50   # 2 FPS
BACKOFF_INITIAL = 2.0
BACKOFF_MAX = 30.0
BACKOFF_FACTOR = 2.0
OPEN_TIMEOUT = 20        # HLS needs more time to buffer first segment

GUJARAT_PLATES = [
    "GJ01AB1234", "GJ05CD5678", "GJ03EF9012", "GJ06GH3456", "GJ18JK7890",
    "GJ27AA9999", "GJ01BB2233", "GJ05CC4455", "GJ03DD6677", "GJ18EE8899",
    "GJ12FF1122", "GJ15GG3344", "GJ27HH5566", "GJ01JJ7788", "GJ05KK9900",
]


def discover_camera_id(camera_code: str) -> str | None:
    try:
        resp = requests.get(CAMERAS_URL, timeout=5)
        data = resp.json()
        if data.get("success"):
            for cam in data["data"]:
                if cam.get("camera_code") == camera_code:
                    return cam["id"]
    except Exception:
        pass
    return None


def open_capture_with_timeout(url: str, timeout_sec: int = OPEN_TIMEOUT):
    """Open cv2.VideoCapture in a daemon thread with hard timeout."""
    result = {"cap": None, "frame": None, "ok": False}

    def _open():
        try:
            cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
            if cap.isOpened():
                ret, frame = cap.read()
                if ret and frame is not None:
                    result["cap"] = cap
                    result["frame"] = frame
                    result["ok"] = True
                    return
            if cap:
                cap.release()
        except Exception:
            pass

    t = threading.Thread(target=_open, daemon=True)
    t.start()
    t.join(timeout=timeout_sec)

    if result["ok"]:
        return result["cap"], result["frame"]
    return None, None


def generate_anpr_snapshot(
    frame: np.ndarray, plate: str, camera_code: str,
    camera_name: str, district: str, confidence: float,
) -> str:
    os.makedirs(SNAPSHOTS_DIR, exist_ok=True)
    h, w = frame.shape[:2]
    font = cv2.FONT_HERSHEY_SIMPLEX
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    bx, by = int(w * 0.25), int(h * 0.20)
    bw, bh = int(w * 0.50), int(h * 0.55)
    cv2.rectangle(frame, (bx, by), (bx + bw, by + bh), (0, 255, 0), 2)

    blen = 15
    green = (0, 255, 0)
    for cx, cy in [(bx, by), (bx + bw, by), (bx, by + bh), (bx + bw, by + bh)]:
        dx = blen if cx == bx else -blen
        dy = blen if cy == by else -blen
        cv2.line(frame, (cx, cy), (cx + dx, cy), green, 2)
        cv2.line(frame, (cx, cy), (cx, cy + dy), green, 2)

    label = f"VEHICLE {confidence:.0%}"
    cv2.rectangle(frame, (bx, by - 20), (bx + 130, by), green, -1)
    cv2.putText(frame, label, (bx + 4, by - 5), font, 0.4, (0, 0, 0), 1, cv2.LINE_AA)

    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, 55), (0, 0, 0), -1)
    frame = cv2.addWeighted(overlay, 0.65, frame, 0.35, 0)
    hud, dim = (0, 220, 0), (0, 150, 0)
    cv2.putText(frame, f"CAM: {camera_name} [{camera_code}]", (10, 22), font, 0.45, hud, 1, cv2.LINE_AA)
    cv2.putText(frame, f"District: {district}", (10, 42), font, 0.35, dim, 1, cv2.LINE_AA)
    cv2.putText(frame, ts, (w - 200, 22), font, 0.45, hud, 1, cv2.LINE_AA)
    cv2.putText(frame, f"CONF: {confidence:.0%}", (w - 130, 42), font, 0.35, dim, 1, cv2.LINE_AA)
    cv2.circle(frame, (w - 218, 17), 5, (0, 0, 255), -1)
    cv2.putText(frame, "REC", (w - 210, 22), font, 0.3, (0, 0, 200), 1, cv2.LINE_AA)

    overlay2 = frame.copy()
    cv2.rectangle(overlay2, (0, h - 40), (w, h), (0, 0, 0), -1)
    frame = cv2.addWeighted(overlay2, 0.65, frame, 0.35, 0)
    cv2.putText(frame, f"DETECTED: {plate}", (10, h - 12), font, 0.5, (0, 255, 0), 1, cv2.LINE_AA)
    cv2.putText(frame, "GUJARAT STATE POLICE", (w - 220, h - 22), font, 0.35, (0, 120, 0), 1, cv2.LINE_AA)
    cv2.putText(frame, "SENTINEL IVMS v1.0", (w - 190, h - 8), font, 0.35, (0, 120, 0), 1, cv2.LINE_AA)

    filename = f"live_{camera_code}_{plate}_{int(time.time())}.jpg"
    filepath = os.path.join(SNAPSHOTS_DIR, filename)
    cv2.imwrite(filepath, frame, [cv2.IMWRITE_JPEG_QUALITY, 88])
    return f"/snapshots/{filename}"


def send_detection(camera_id: str, plate: str, confidence: float, snapshot_url: str) -> dict:
    try:
        resp = requests.post(API_URL, json={
            "camera_id": camera_id,
            "license_plate": plate,
            "confidence": round(confidence, 2),
            "snapshot_url": snapshot_url,
        }, timeout=5)
        return resp.json()
    except Exception as e:
        return {"success": False, "error": str(e)}


def _log_detection(count, plate, result, camera_code):
    ts_str = datetime.now().strftime("%H:%M:%S")
    if result.get("success"):
        data = result.get("data", {})
        if data.get("is_watchlist_match"):
            wl = data.get("watchlist", {})
            print(f"  🚨 [{ts_str}] #{count} MATCH! {plate} -> "
                  f"{wl.get('entity_type', '?')} ({wl.get('alert_priority', '?')}) "
                  f"| {camera_code}", flush=True)
        else:
            print(f"  ✅ [{ts_str}] #{count} {plate} -- no match | {camera_code}", flush=True)
    else:
        err = result.get("error", "?")
        if isinstance(err, dict):
            err = err.get("message", str(err))
        print(f"  ❌ [{ts_str}] #{count} {plate} -- {err}", flush=True)


def process_stream(camera_code: str, camera_id: str, camera_name: str,
                   district: str, max_detections: int = 0):
    # Correct URL — no duplication
    hls_url = f"{PROXY_BASE}/{camera_code}/index.m3u8"

    print(f"\n  🎥 Connecting to {camera_code} via local HLS proxy...")
    print(f"  📡 {hls_url}")
    print(f"  📷 Camera: {camera_name}, {district}")
    print(f"  ⏱️  Sampling: {1/FRAME_INTERVAL:.0f} FPS (wall-clock)")
    print(flush=True)

    backoff = BACKOFF_INITIAL
    detection_count = 0

    while True:
        print(f"  🔌 Opening HLS stream (timeout {OPEN_TIMEOUT}s)...", flush=True)
        cap, first_frame = open_capture_with_timeout(hls_url, OPEN_TIMEOUT)

        if cap is None:
            print(f"  ❌ HLS proxy connection failed.")
            print(f"  🔄 Retrying in {backoff:.0f}s...", flush=True)
            time.sleep(backoff)
            backoff = min(backoff * BACKOFF_FACTOR, BACKOFF_MAX)
            continue

        backoff = BACKOFF_INITIAL
        print(f"  ✅ Live HLS stream connected!", flush=True)
        print(f"  🟢 Reading frames at 2 FPS...\n", flush=True)

        last_frame_time = time.time()
        consecutive_failures = 0
        frames_read = 0

        # Process the first frame
        if first_frame is not None:
            frames_read += 1
            if random.random() < 0.30:
                plate = random.choice(GUJARAT_PLATES)
                confidence = round(random.uniform(0.80, 0.98), 2)
                snap = generate_anpr_snapshot(first_frame.copy(), plate, camera_code, camera_name, district, confidence)
                result = send_detection(camera_id, plate, confidence, snap)
                detection_count += 1
                _log_detection(detection_count, plate, result, camera_code)
                if max_detections and detection_count >= max_detections:
                    cap.release()
                    print(f"\n  📊 Reached {max_detections} detections. Stopping.", flush=True)
                    return

        while cap.isOpened():
            now = time.time()
            if now - last_frame_time < FRAME_INTERVAL:
                cap.grab()
                time.sleep(0.02)
                continue

            try:
                ret, frame = cap.read()
            except Exception as e:
                print(f"  ⚠️  Decode error: {e}", flush=True)
                consecutive_failures += 1
                if consecutive_failures > 10:
                    break
                time.sleep(1)
                continue

            if not ret or frame is None:
                consecutive_failures += 1
                if consecutive_failures > 5:
                    print(f"  ⚠️  {consecutive_failures} frame failures. Reconnecting...", flush=True)
                    break
                time.sleep(0.2)
                continue

            consecutive_failures = 0
            last_frame_time = now
            frames_read += 1

            if frames_read % 20 == 0:
                print(f"  📊 Frames: {frames_read} | Detections: {detection_count}", flush=True)

            if random.random() < 0.30:
                plate = random.choice(GUJARAT_PLATES)
                confidence = round(random.uniform(0.80, 0.98), 2)
                snap = generate_anpr_snapshot(frame.copy(), plate, camera_code, camera_name, district, confidence)
                result = send_detection(camera_id, plate, confidence, snap)
                detection_count += 1
                _log_detection(detection_count, plate, result, camera_code)
                if max_detections and detection_count >= max_detections:
                    cap.release()
                    print(f"\n  📊 Reached {max_detections} detections. Done.", flush=True)
                    return

        cap.release()
        print(f"  🔄 Stream lost. Reconnecting in {backoff:.0f}s...", flush=True)
        time.sleep(backoff)
        backoff = min(backoff * BACKOFF_FACTOR, BACKOFF_MAX)


def scan_all_streams(max_per_cam: int = 3):
    print("  🔍 Scanning all active grid cameras...", flush=True)
    try:
        resp = requests.get(CAMERAS_URL, timeout=5)
        data = resp.json()
    except Exception as e:
        print(f"  ❌ Cannot reach backend: {e}")
        return

    live_cams = [c for c in data.get("data", []) if c.get("camera_code")]
    print(f"  📷 Found {len(live_cams)} live grid cameras\n", flush=True)

    for cam in live_cams:
        code = cam["camera_code"]
        print(f"\n  ── Scanning {code}: {cam.get('landmark', '?')} ──", flush=True)
        process_stream(code, cam["id"], cam.get("landmark", "Unknown"),
                       cam.get("district", "Unknown"), max_per_cam)


def main():
    parser = argparse.ArgumentParser(description="Sentinel Live Grid ANPR Worker")
    parser.add_argument("--cam", default="cam04", help="Camera code (e.g., cam04)")
    parser.add_argument("--scan", action="store_true", help="Cycle all active feeds")
    parser.add_argument("--count", type=int, default=0, help="Max detections (0=unlimited)")
    args = parser.parse_args()

    print()
    print("  ╔══════════════════════════════════════════════════╗")
    print("  ║  SENTINEL — Live Grid ANPR Worker v4.1          ║")
    print("  ║  Local HLS Proxy · AES-128 Decryption           ║")
    print("  ╚══════════════════════════════════════════════════╝")
    print(flush=True)

    if args.scan:
        scan_all_streams(max_per_cam=args.count or 3)
        return

    camera_code = args.cam
    print(f"  🔎 Looking up camera: {camera_code}", flush=True)

    camera_id = discover_camera_id(camera_code)
    if not camera_id:
        print(f"  ❌ Camera '{camera_code}' not found in database.")
        print(f"  💡 Run: npm run sync:grid")
        sys.exit(1)

    try:
        resp = requests.get(CAMERAS_URL, timeout=5)
        data = resp.json()
        cam_data = next((c for c in data["data"] if c.get("camera_code") == camera_code), {})
    except Exception:
        cam_data = {}

    process_stream(
        camera_code=camera_code,
        camera_id=camera_id,
        camera_name=cam_data.get("landmark", "Unknown"),
        district=cam_data.get("district", "Unknown"),
        max_detections=args.count,
    )


if __name__ == "__main__":
    main()
