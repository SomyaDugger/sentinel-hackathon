#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sentinel IVMS — Visual ANPR Detector & Snapshot Generator
==========================================================
Generates realistic surveillance camera snapshots using OpenCV/NumPy:
  - Dark-toned road scene with vehicle silhouette
  - Green ANPR bounding boxes around vehicle and license plate
  - Police HUD overlay: Camera name, District, Timestamp, Confidence
  - Saves as high-quality JPEG into snapshots/ directory

Can be used standalone or called from simulate_live_breach.py.
"""

import io
import os
import sys
import time
from datetime import datetime

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')  # type: ignore

import numpy as np

try:
    import cv2
except ImportError:
    print("  ❌ opencv-python-headless not installed.")
    print("  💡 Run: pip install opencv-python-headless numpy")
    sys.exit(1)

# Snapshots output directory (relative to project root)
SNAPSHOTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'snapshots')


def generate_snapshot(
    plate: str,
    camera_name: str = "SG Highway Junction",
    district: str = "Ahmedabad",
    confidence: float = 0.97,
    filename: str | None = None,
) -> str:
    """
    Generate a realistic ANPR surveillance snapshot and save to snapshots/.

    Returns the relative URL path (e.g. /snapshots/breach_GJ01AB1234_17277...jpg).
    """
    os.makedirs(SNAPSHOTS_DIR, exist_ok=True)

    if not filename:
        filename = f"breach_{plate}_{int(time.time())}.jpg"
    output_path = os.path.join(SNAPSHOTS_DIR, filename)

    # ── Create 640x480 dark surveillance frame ───────────────────────────
    h, w = 480, 640
    frame = np.zeros((h, w, 3), dtype=np.uint8)

    # Dark asphalt background with slight gradient
    for y in range(h):
        shade = int(20 + (y / h) * 15)
        frame[y, :] = (shade, shade, shade + 3)

    # Add sensor noise/grain for realism
    noise = np.random.randint(0, 8, (h, w, 3), dtype=np.uint8)
    frame = cv2.add(frame, noise)

    # ── Road markings ────────────────────────────────────────────────────
    # Center dashed line
    for i in range(0, w, 40):
        cv2.line(frame, (i, h // 2 + 60), (i + 20, h // 2 + 60), (55, 55, 50), 2)
    # Edge lines
    cv2.line(frame, (0, h - 80), (w, h - 80), (45, 45, 40), 1)
    cv2.line(frame, (0, h // 2 - 40), (w, h // 2 - 40), (45, 45, 40), 1)

    # ── Vehicle silhouette ───────────────────────────────────────────────
    vx, vy, vw, vh = 200, 160, 240, 170

    # Vehicle body (dark shape)
    pts_body = np.array([
        [vx + 10, vy + vh],
        [vx, vy + vh - 30],
        [vx + 20, vy + 40],
        [vx + 60, vy],
        [vx + vw - 60, vy],
        [vx + vw - 20, vy + 40],
        [vx + vw, vy + vh - 30],
        [vx + vw - 10, vy + vh],
    ], np.int32)
    cv2.fillPoly(frame, [pts_body], (42, 42, 48))

    # Windshield
    pts_wind = np.array([
        [vx + 65, vy + 5],
        [vx + vw - 65, vy + 5],
        [vx + vw - 30, vy + 45],
        [vx + 30, vy + 45],
    ], np.int32)
    cv2.fillPoly(frame, [pts_wind], (30, 35, 40))
    cv2.polylines(frame, [pts_wind], True, (55, 60, 65), 1)

    # Headlights (bright spots)
    cv2.circle(frame, (vx + 20, vy + vh - 50), 8, (140, 160, 180), -1)
    cv2.circle(frame, (vx + vw - 20, vy + vh - 50), 8, (140, 160, 180), -1)

    # Wheels
    cv2.ellipse(frame, (vx + 40, vy + vh), (20, 10), 0, 0, 180, (20, 20, 22), -1)
    cv2.ellipse(frame, (vx + vw - 40, vy + vh), (20, 10), 0, 0, 180, (20, 20, 22), -1)

    # ── License plate ────────────────────────────────────────────────────
    px, py, pw, ph = vx + 70, vy + vh - 45, 100, 28
    # Plate background (yellowish-white like Indian plates)
    cv2.rectangle(frame, (px, py), (px + pw, py + ph), (185, 195, 210), -1)
    cv2.rectangle(frame, (px, py), (px + pw, py + ph), (140, 150, 160), 1)
    # Plate text
    font = cv2.FONT_HERSHEY_SIMPLEX
    text_size = cv2.getTextSize(plate, font, 0.45, 1)[0]
    tx = px + (pw - text_size[0]) // 2
    ty = py + (ph + text_size[1]) // 2
    cv2.putText(frame, plate, (tx, ty), font, 0.45, (10, 10, 10), 1, cv2.LINE_AA)

    # ── Green ANPR bounding boxes ────────────────────────────────────────
    green = (0, 255, 0)
    # Vehicle bounding box
    cv2.rectangle(frame, (vx - 5, vy - 5), (vx + vw + 5, vy + vh + 10), green, 2)
    # Corner brackets on vehicle box
    blen = 18
    for cx, cy in [(vx - 5, vy - 5), (vx + vw + 5, vy - 5),
                   (vx - 5, vy + vh + 10), (vx + vw + 5, vy + vh + 10)]:
        dx = blen if cx == vx - 5 else -blen
        dy = blen if cy == vy - 5 else -blen
        cv2.line(frame, (cx, cy), (cx + dx, cy), green, 3)
        cv2.line(frame, (cx, cy), (cx, cy + dy), green, 3)

    # Plate bounding box
    cv2.rectangle(frame, (px - 3, py - 3), (px + pw + 3, py + ph + 3), green, 2)

    # Detection label above vehicle box
    label = f"VEHICLE {confidence:.0%}"
    cv2.rectangle(frame, (vx - 5, vy - 25), (vx + 135, vy - 5), green, -1)
    cv2.putText(frame, label, (vx, vy - 10), font, 0.45, (0, 0, 0), 1, cv2.LINE_AA)

    # Plate label
    cv2.rectangle(frame, (px - 3, py - 18), (px + pw + 3, py - 3), green, -1)
    cv2.putText(frame, "LICENSE PLATE", (px + 5, py - 6), font, 0.35, (0, 0, 0), 1, cv2.LINE_AA)

    # ── HUD Overlay — Top Bar ────────────────────────────────────────────
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, 60), (0, 0, 0), -1)
    frame = cv2.addWeighted(overlay, 0.7, frame, 0.3, 0)

    hud_green = (0, 220, 0)
    hud_dim = (0, 150, 0)
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cv2.putText(frame, f"CAM: {camera_name}", (10, 22), font, 0.5, hud_green, 1, cv2.LINE_AA)
    cv2.putText(frame, f"District: {district}", (10, 45), font, 0.4, hud_dim, 1, cv2.LINE_AA)
    cv2.putText(frame, ts, (w - 210, 22), font, 0.5, hud_green, 1, cv2.LINE_AA)
    cv2.putText(frame, f"ANPR CONF: {confidence:.0%}", (w - 175, 45), font, 0.4, hud_dim, 1, cv2.LINE_AA)

    # Recording indicator (red dot)
    cv2.circle(frame, (w - 230, 17), 5, (0, 0, 255), -1)
    cv2.putText(frame, "REC", (w - 222, 22), font, 0.35, (0, 0, 200), 1, cv2.LINE_AA)

    # ── HUD Overlay — Bottom Bar ─────────────────────────────────────────
    overlay2 = frame.copy()
    cv2.rectangle(overlay2, (0, h - 45), (w, h), (0, 0, 0), -1)
    frame = cv2.addWeighted(overlay2, 0.7, frame, 0.3, 0)

    cv2.putText(frame, f"DETECTED: {plate}", (10, h - 15), font, 0.55, (0, 255, 0), 1, cv2.LINE_AA)
    cv2.putText(frame, "SENTINEL IVMS v1.0", (w - 190, h - 15), font, 0.4, (0, 120, 0), 1, cv2.LINE_AA)
    cv2.putText(frame, "GUJARAT STATE POLICE", (w - 195, h - 32), font, 0.35, (0, 100, 0), 1, cv2.LINE_AA)

    # ── Save as JPEG ─────────────────────────────────────────────────────
    cv2.imwrite(output_path, frame, [cv2.IMWRITE_JPEG_QUALITY, 92])

    url_path = f"/snapshots/{filename}"
    return url_path


def main():
    """Generate a test snapshot from the command line."""
    import argparse

    parser = argparse.ArgumentParser(description="Generate ANPR surveillance snapshot")
    parser.add_argument("plate", nargs="?", default="GJ01AB1234", help="License plate")
    parser.add_argument("--camera", default="SG Highway Junction", help="Camera name")
    parser.add_argument("--district", default="Ahmedabad", help="District")
    parser.add_argument("--confidence", type=float, default=0.97, help="Confidence score")
    args = parser.parse_args()

    print(f"\n  📸 Generating ANPR snapshot for {args.plate}...")
    url = generate_snapshot(args.plate, args.camera, args.district, args.confidence)
    full_path = os.path.join(SNAPSHOTS_DIR, os.path.basename(url))
    print(f"  ✅ Saved: {full_path}")
    print(f"  🔗 URL:   {url}")
    print()


if __name__ == "__main__":
    main()
