#!/usr/bin/env python3
"""Build an offline ZIP for one platform using only Python's standard library."""
import argparse
import hashlib
from pathlib import Path
import re
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo

ROOT = Path(__file__).resolve().parent.parent


def build(platform, output):
    version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise ValueError("Invalid VERSION")
    name = "typora-obsidian-callouts-" + version + "-" + platform
    output.mkdir(parents=True, exist_ok=True)
    target = output / (name + ".zip")
    files = []
    for item in ("README.md", "README_CN_simplised.md", "VERSION", "package.json", "package-lock.json", "bin", "lib", "LICENSE", "THIRD_PARTY_NOTICES.md", "install.cmd", "install.sh", "Install.command", "scripts", "styles", "config", "examples", "vendor", "patches", "docs", "tests"):
        source = ROOT / item
        files.extend(p for p in source.rglob("*") if p.is_file() and "__pycache__" not in p.parts and p.suffix not in (".pyc", ".log")) if source.is_dir() else files.append(source)
    instructions = {
        "windows": "Windows: double-click install.cmd, then restart Typora.\n",
        "linux": "Linux: install Python 3.9+, open a terminal here and run: sh install.sh\nRun as your normal user. Only application-file writes may request sudo.\n",
        "macos-experimental": "macOS EXPERIMENTAL: requires Python 3.9+ and an existing compatible WKWebView bridge.\nRead docs/platforms.md before running Install.command or: sh install.sh\nCallouts only by default; the image adapter requires --enable-images.\nThis package does not install a bridge or claim native macOS Typora support.\n",
    }[platform]
    with ZipFile(target, "w", ZIP_DEFLATED, compresslevel=9) as archive:
        for source in sorted(files):
            relative = source.relative_to(ROOT).as_posix()
            info = ZipInfo(name + "/" + relative, (2026, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = (0o100755 if source.suffix in (".sh", ".command") else 0o100644) << 16
            info.compress_type = ZIP_DEFLATED
            archive.writestr(info, source.read_bytes())
        archive.writestr(name + "/INSTALL.txt", instructions + "\nSee README.md for update, uninstall and custom paths.\n")
    checksum = hashlib.sha256(target.read_bytes()).hexdigest()
    (output / (target.name + ".sha256")).write_text(checksum + "  " + target.name + "\n", encoding="ascii")
    print(target)
    print("SHA256:", checksum)
    return target


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--platform", required=True, choices=("windows", "linux", "macos-experimental"))
    parser.add_argument("--output-dir", type=Path, default=ROOT / "dist")
    args = parser.parse_args()
    build(args.platform, args.output_dir)
