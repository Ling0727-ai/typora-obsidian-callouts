#!/usr/bin/env python3
"""Offline installer. Only the framework step may run with elevated privileges."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent.parent
VERSION = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
LOADER = '<script src="./plugin/index.js" defer="defer"></script>'
BLOCK = re.compile(r'/\* BEGIN TYPORA OBSIDIAN CALLOUTS \*/.*?/\* END TYPORA OBSIDIAN CALLOUTS \*/\r?\n?', re.S)
LEGACY = re.compile(r'/\* BEGIN OBSIDIAN CALLOUTS \*/.*?/\* END OBSIDIAN CALLOUTS \*/\r?\n?', re.S)


def read(path):
    return path.read_text(encoding="utf-8-sig") if path.exists() else ""


def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        handle.write(content)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def stamp():
    return datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")


def defaults(system=sys.platform, home=None, environ=None):
    home = Path(home or Path.home())
    env = os.environ if environ is None else environ
    config = home / ".config/typora_plugin"  # Upstream uses this path on every OS.
    if system == "darwin":
        return [Path("/Applications/Typora.app"), home / "Applications/Typora.app"], home / "Library/Application Support/abnerworks.Typora/themes", config
    if system == "win32":
        apps = [Path(env[k]) / "Typora" for k in ("ProgramFiles", "ProgramFiles(x86)", "LOCALAPPDATA") if env.get(k)]
        return apps, Path(env.get("APPDATA", str(home / "AppData/Roaming"))) / "Typora/themes", config
    apps = [Path(p) for p in ("/usr/share/typora", "/opt/typora", "/usr/lib/typora", "/opt/Typora")]
    themes = Path(env.get("XDG_CONFIG_HOME", str(home / ".config"))) / "Typora/themes"
    return apps, themes, config


def locate(candidates):
    suffixes = ("", "resources", "resources/app", "Contents/Resources/TypeMark")
    for base in candidates:
        for suffix in suffixes:
            directory = (base / suffix).resolve()
            for name in ("window.html", "index.html"):
                html = directory / name
                if html.is_file() and (name == "window.html" or directory.name == "TypeMark"):
                    return directory, html
    raise ValueError("Typora not found. Pass --typora-path with the installation or resources directory.")


def table(text, section):
    return re.search(r'^\[' + re.escape(section) + r'\][ \t]*\r?\n(?P<body>.*?)(?=^\[|\Z)', text, re.M | re.S)


def boolean(text, section):
    found = table(text, section)
    value = re.search(r'^ENABLE[ \t]*=[ \t]*(true|false)\b', found["body"], re.M) if found else None
    return value[1] if value else None


def set_boolean(text, section, value):
    found = table(text, section)
    line = "ENABLE = " + value + "\n" if value else ""
    if found:
        body = re.sub(r'^ENABLE[ \t]*=[^\r\n]*(?:\r?\n|$)', "", found["body"], flags=re.M)
        return text[:found.start()] + "[" + section + "]\n" + line + body + text[found.end():]
    return text.rstrip() + "\n\n[" + section + "]\n" + line if value else text


def managed_import(text, asset):
    rest = BLOCK.sub("", LEGACY.sub("", text))
    return '/* BEGIN TYPORA OBSIDIAN CALLOUTS */\n@import url("./obsidian-callouts/' + asset + '");\n/* END TYPORA OBSIDIAN CALLOUTS */\n' + rest


def validate_layout(resources, html_path):
    html = read(html_path)
    if html_path.name == "index.html":
        # WKWebView cannot load the Electron/Node framework by itself. Reuse an
        # explicitly installed macOS bridge; do not install services or alter signing.
        bridge = resources / "plugin/loader.js"
        if not bridge.is_file() or not re.search(r'<script\b[^>]*\bsrc=[\'"]\./plugin/loader\.js[\'"]', html):
            raise ValueError("macOS requires an existing compatible WKWebView bridge (plugin/loader.js). See docs/platforms.md. No files changed.")
        if not (resources / "plugin/global/core/index.js").is_file():
            raise ValueError("macOS bridge framework is incomplete; install the bridge first.")
        return html, None
    for source in ("appsrc/window/frame.js", "app/window/frame.js"):
        frame = '<script src="./' + source + '" defer="defer"></script>'
        if frame in html:
            return html, frame
    raise ValueError("Unsupported Typora HTML layout; injection stopped. No files changed.")


def verified_archive():
    manifest = json.loads(read(ROOT / "vendor/manifest.json"))
    archive = ROOT / "vendor" / manifest["asset"]
    if digest(archive) != manifest["sha256"]:
        raise ValueError("Bundled framework SHA-256 mismatch.")
    return archive


def framework(resources, html_path):
    html, frame = validate_layout(resources, html_path)
    archive = verified_archive()
    plugin = resources / "plugin"
    if plugin.exists() and not (plugin / "index.js").is_file():
        raise ValueError("Unrecognized plugin directory. Inspect it before installing.")
    patches = [(ROOT / "patches" / name / "index.js", plugin / name / "index.js") for name in ("callouts", "obsidian_images")]
    needs_loader = frame is not None and LOADER not in html
    needs_patches = any(not target.is_file() or digest(source) != digest(target) for source, target in patches)
    if not needs_loader and not needs_patches:
        return
    # Check access before extracting/copying anything. Do not broaden permissions.
    with tempfile.NamedTemporaryFile(prefix=".callout-probe-", dir=resources):
        pass
    if not plugin.exists():
        with tempfile.TemporaryDirectory(prefix="typora-callouts-") as stage:
            with ZipFile(archive) as zf:
                base = Path(stage).resolve()
                for item in zf.infolist():
                    target = (base / item.filename.replace("\\", "/")).resolve()
                    if base not in target.parents or (item.external_attr >> 16) & 0o170000 == 0o120000:
                        raise ValueError("Unsafe path in framework archive.")
                zf.extractall(stage)
            staged = Path(stage) / "plugin"
            if not (staged / "index.js").is_file():
                raise ValueError("Invalid framework archive.")
            shutil.copy2(ROOT / "config/settings.user.toml", staged / "global/settings/settings.user.toml")
            shutil.copytree(staged, plugin)
    for source, target in patches:
        if target.is_file() and digest(target) == digest(source):
            continue
        if target.exists():
            shutil.copy2(target, str(target) + ".before-update-" + stamp() + ".bak")
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    if needs_loader:
        shutil.copy2(html_path, str(html_path) + ".callouts-" + stamp() + ".bak")
        write(html_path, html.replace(frame, frame + LOADER, 1))


def ensure_framework(resources, html_path, no_elevate=False):
    try:
        framework(resources, html_path)
    except PermissionError:
        if no_elevate or sys.platform == "win32" or not shutil.which("sudo"):
            raise PermissionError("No write access to Typora. Use the Windows installer or grant access to the application directory.")
        # Re-execute only the program-file step. User config stays in this process.
        subprocess.run(["sudo", sys.executable, str(Path(__file__).resolve()), "--framework-only", "--typora-path", str(resources), "--no-elevate"], check=True)


def install(args):
    apps, theme_default, config_default = defaults()
    resources, html = locate([args.typora_path] if args.typora_path else apps)
    validate_layout(resources, html)  # Reject macOS without a bridge before user-file writes.
    themes = (args.theme_dir or theme_default).expanduser().resolve()
    config = (args.user_config_dir or config_default).expanduser().resolve()
    if not re.fullmatch(r'[a-zA-Z0-9_-]+', args.dark_theme):
        raise ValueError("--dark-theme must be a theme filename without .css.")
    state_dir = config / "obsidian-callouts"
    state_path = state_dir / "install-state.json"
    settings_path = config / "settings.user.toml"
    old = json.loads(read(state_path)) if state_path.exists() else None
    if old and (Path(old["ThemeDir"]).resolve() != themes or old["DarkTheme"] != args.dark_theme):
        raise ValueError("Installation target changed. Uninstall the old styles first.")
    settings = read(settings_path) if settings_path.exists() else read(resources / "plugin/global/settings/settings.user.toml") or read(ROOT / "config/settings.user.toml")
    state = old or dict(SettingsExisted=settings_path.exists(), OriginalGlobal=boolean(settings, "global"), OriginalCallouts=boolean(settings, "callouts"))
    if "OriginalImages" not in state:
        state["OriginalImages"] = boolean(settings, "obsidian_images")
    # macOS's native lexer and fs bridge differ. Opt in explicitly to image experiments.
    images = args.enable_images or html.name != "index.html"
    for section, enabled in (("global", True), ("callouts", True), ("obsidian_images", images)):
        settings = set_boolean(settings, section, "true" if enabled else "false")
    if not re.search(r'^NAME\s*=', table(settings, "obsidian_images")["body"], re.M):
        settings = settings.replace("[obsidian_images]", '[obsidian_images]\nNAME = "Obsidian Images"')
    ensure_framework(resources, html, args.no_elevate)
    backup = state_dir / "backups" / stamp()
    backup.mkdir(parents=True)
    for source, name in ((themes / "base.user.css", "base.user.css"), (themes / (args.dark_theme + ".user.css"), "dark.user.css"), (settings_path, "settings.user.toml")):
        if source.exists():
            shutil.copy2(source, backup / name)
    for asset in ("callouts.css", "callouts-dark.css"):
        target = themes / "obsidian-callouts" / asset
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / "styles" / asset, target)
    for name, asset in (("base.user.css", "callouts.css"), (args.dark_theme + ".user.css", "callouts-dark.css")):
        target = themes / name
        write(target, managed_import(read(target), asset))
    write(settings_path, settings)
    state.update(Version=VERSION, ThemeDir=str(themes), DarkTheme=args.dark_theme, SettingsHash=digest(settings_path), BackupDir=old.get("BackupDir", str(backup)) if old else str(backup))
    write(state_path, json.dumps(state, ensure_ascii=False, indent=2) + "\n")
    print("Installed. Save your work and restart Typora.")
    print("Settings:", settings_path)
    print("Backup:", backup)
    if html.name == "index.html":
        print("macOS is experimental; image adapter:", "enabled (experimental)" if images else "disabled")


def uninstall(args):
    config = (args.user_config_dir or defaults()[2]).expanduser().resolve()
    state_path = config / "obsidian-callouts/install-state.json"
    if not state_path.exists():
        raise ValueError("No installation state found; no files changed.")
    state = json.loads(read(state_path))
    for name in ("base.user.css", state["DarkTheme"] + ".user.css"):
        target = Path(state["ThemeDir"]) / name
        if target.exists():
            write(target, BLOCK.sub("", read(target)))
    settings_path = config / "settings.user.toml"
    if settings_path.exists():
        if digest(settings_path) != state["SettingsHash"]:
            print("Settings changed after installation; retained. Disable callouts/obsidian_images manually if desired.")
        elif state["SettingsExisted"]:
            text = read(settings_path)
            for section, key in (("global", "OriginalGlobal"), ("callouts", "OriginalCallouts"), ("obsidian_images", "OriginalImages")):
                if key in state:
                    text = set_boolean(text, section, state[key])
            write(settings_path, text)
        else:
            settings_path.unlink()
    state_path.unlink()
    print("Imports removed and switches restored when unchanged. Shared framework and backups retained. Restart Typora.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--typora-path", type=Path)
    parser.add_argument("--theme-dir", type=Path)
    parser.add_argument("--user-config-dir", type=Path)
    parser.add_argument("--dark-theme", default="night")
    parser.add_argument("--enable-images", action="store_true", help="Opt in to experimental image support on macOS")
    parser.add_argument("--uninstall", action="store_true", help="Remove styles and restore module switches")
    parser.add_argument("--repair", action="store_true", help="Repair only the program-file loader and patches")
    parser.add_argument("--framework-only", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--no-elevate", action="store_true", help="Fail rather than invoking sudo")
    args = parser.parse_args()
    if hasattr(os, "geteuid") and os.geteuid() == 0 and not args.framework_only:
        parser.error("Run as your normal user; the installer elevates only the program-file step.")
    try:
        if args.uninstall:
            uninstall(args)
        elif args.repair or args.framework_only:
            apps = defaults()[0]
            resources, html = locate([args.typora_path] if args.typora_path else apps)
            ensure_framework(resources, html, args.no_elevate or args.framework_only)
            print("Framework loader and patches are current. Restart Typora.")
        else:
            install(args)
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        print("Installation failed:", error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
