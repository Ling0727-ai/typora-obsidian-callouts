"""Isolated filesystem checks. No real Typora installation or GUI is used."""
import argparse
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("installer", ROOT / "scripts/install.py")
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)
spec_build = importlib.util.spec_from_file_location("builder", ROOT / "scripts/build.py")
builder = importlib.util.module_from_spec(spec_build)
spec_build.loader.exec_module(builder)


class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="typora installer spaces-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.resources = self.root / "Typora/resources"
        self.themes = self.root / "themes"
        self.config = self.root / "config"
        self.args = argparse.Namespace(typora_path=self.resources, theme_dir=self.themes, user_config_dir=self.config, dark_theme="night", enable_images=False, no_elevate=True)
        self.html = self.resources / "window.html"
        self.frame = '<script src="./appsrc/window/frame.js" defer="defer"></script>'
        installer.write(self.html, "<html><body>" + self.frame + "</body></html>")

    def fake_framework(self):
        installer.write(self.resources / "plugin/index.js", "// existing framework")

    def test_archive_hash(self):
        self.assertTrue(installer.verified_archive().is_file())

    def test_defaults(self):
        home = self.root / "home"
        _, themes, config = installer.defaults("linux", home, {"XDG_CONFIG_HOME": str(home / "xdg")})
        self.assertEqual(themes, home / "xdg/Typora/themes")
        self.assertEqual(config, home / ".config/typora_plugin")
        self.assertEqual(installer.defaults("darwin", home, {})[1], home / "Library/Application Support/abnerworks.Typora/themes")
        self.assertEqual(installer.defaults("win32", home, {"APPDATA": str(home / "roaming")})[1], home / "roaming/Typora/themes")

    def test_fresh_archive_install_and_uninstall(self):
        installer.install(self.args)
        self.assertTrue((self.resources / "plugin/global/core/index.js").is_file())
        settings = installer.read(self.config / "settings.user.toml")
        for section in ("global", "callouts", "obsidian_images"):
            self.assertEqual(installer.boolean(settings, section), "true")
        for name in ("callouts", "obsidian_images"):
            self.assertEqual(installer.digest(ROOT / "patches" / name / "index.js"), installer.digest(self.resources / "plugin" / name / "index.js"))
        installer.uninstall(self.args)
        self.assertFalse((self.config / "settings.user.toml").exists())
        self.assertTrue((self.resources / "plugin/index.js").is_file())

    def test_existing_settings_idempotency_and_upgrade(self):
        self.fake_framework()
        settings = '[global]\nENABLE = false\n[callouts]\nENABLE = false\n[window_tab]\nENABLE = true\nCUSTOM = "retain"\n[obsidian_images]\nENABLE = false\n'
        installer.write(self.config / "settings.user.toml", settings)
        installer.write(self.themes / "base.user.css", "body { --keep: 1; }\n")
        installer.install(self.args)
        # Simulate a 0.1.x install-state record (no OriginalImages field).
        state_path = self.config / "obsidian-callouts/install-state.json"
        state = json.loads(installer.read(state_path))
        state.pop("OriginalImages")
        installer.write(state_path, json.dumps(state))
        first_settings = installer.read(self.config / "settings.user.toml")
        installer.install(self.args)
        base = installer.read(self.themes / "base.user.css")
        self.assertEqual(base.count("BEGIN TYPORA OBSIDIAN CALLOUTS"), 1)
        self.assertTrue(base.startswith("/* BEGIN"))
        self.assertIn("--keep", base)
        self.assertEqual(installer.read(self.html).count(installer.LOADER), 1)
        self.assertIn('CUSTOM = "retain"', first_settings)
        # Repeated install preserves the original stored switches.
        installer.install(self.args)
        installer.uninstall(self.args)
        restored = installer.read(self.config / "settings.user.toml")
        self.assertEqual(installer.boolean(restored, "global"), "false")
        self.assertEqual(installer.boolean(restored, "callouts"), "false")
        self.assertEqual(installer.boolean(restored, "window_tab"), "true")

    def test_uninstall_preserves_user_edits(self):
        self.fake_framework()
        installer.install(self.args)
        settings = self.config / "settings.user.toml"
        changed = installer.read(settings) + "\n# user changed\n"
        installer.write(settings, changed)
        installer.write(self.themes / "base.user.css", installer.read(self.themes / "base.user.css") + "p { --later: 1; }")
        installer.uninstall(self.args)
        self.assertEqual(installer.read(settings), changed)
        self.assertIn("--later", installer.read(self.themes / "base.user.css"))

    def test_unknown_layout_no_side_effects(self):
        installer.write(self.html, "<html>unknown layout</html>")
        with self.assertRaisesRegex(ValueError, "Unsupported"):
            installer.install(self.args)
        self.assertFalse(self.config.exists())
        self.assertFalse((self.resources / "plugin").exists())
        self.assertEqual(installer.read(self.html), "<html>unknown layout</html>")

    def test_legacy_layout_and_repair(self):
        self.fake_framework()
        self.frame = self.frame.replace("appsrc/", "app/")
        installer.write(self.html, self.frame)
        installer.install(self.args)
        installer.write(self.html, self.frame)
        installer.write(self.resources / "plugin/callouts/index.js", "// older patch")
        installer.framework(self.resources, self.html)
        self.assertIn(installer.LOADER, installer.read(self.html))
        self.assertTrue(list(self.resources.glob("plugin/callouts/*.bak")))
        self.assertEqual(installer.digest(self.resources / "plugin/callouts/index.js"), installer.digest(ROOT / "patches/callouts/index.js"))

    def test_macos_requires_bridge_and_keeps_it(self):
        self.html.unlink()
        self.resources = self.root / "Typora.app/Contents/Resources/TypeMark"
        self.args.typora_path = self.root / "Typora.app"
        self.html = self.resources / "index.html"
        installer.write(self.html, '<body><script src="./plugin/loader.js" defer></script></body>')
        with self.assertRaisesRegex(ValueError, "WKWebView bridge"):
            installer.install(self.args)
        self.assertFalse(self.config.exists())
        self.fake_framework()
        installer.write(self.resources / "plugin/loader.js", "// existing bridge")
        installer.write(self.resources / "plugin/global/core/index.js", "// existing core")
        html_before = installer.read(self.html)
        installer.install(self.args)
        self.assertEqual(installer.read(self.html), html_before)
        self.assertEqual(installer.read(self.resources / "plugin/loader.js"), "// existing bridge")
        self.assertEqual(installer.boolean(installer.read(self.config / "settings.user.toml"), "obsidian_images"), "false")
        self.args.enable_images = True
        installer.install(self.args)
        self.assertEqual(installer.boolean(installer.read(self.config / "settings.user.toml"), "obsidian_images"), "true")

    def test_elevation_limited_to_framework(self):
        with patch.object(installer, "framework", side_effect=PermissionError), patch.object(installer.shutil, "which", return_value="/usr/bin/sudo"), patch.object(installer.sys, "platform", "linux"), patch.object(installer.subprocess, "run") as run:
            installer.ensure_framework(self.resources, self.html)
            argv = run.call_args.args[0]
            self.assertEqual(argv[0], "sudo")
            self.assertIn("--framework-only", argv)
            self.assertNotIn("--user-config-dir", argv)

    def test_package_contents_and_modes(self):
        for platform in ("windows", "linux", "macos-experimental"):
            package = builder.build(platform, self.root / "dist")
            with ZipFile(package) as zf:
                prefix = package.stem + "/"
                for item in ("VERSION", "install.cmd", "install.sh", "Install.command", "scripts/install.py", "vendor/typora-plugin-1.19.14.zip"):
                    self.assertIn(prefix + item, zf.namelist())
                self.assertEqual((zf.getinfo(prefix + "Install.command").external_attr >> 16) & 0o777, 0o755)
                self.assertFalse(any("__pycache__" in p for p in zf.namelist()))
                if platform == "macos-experimental":
                    self.assertIn(b"EXPERIMENTAL", zf.read(prefix + "INSTALL.txt"))
            self.assertTrue(Path(str(package) + ".sha256").read_text().startswith(installer.digest(package)))


if __name__ == "__main__":
    unittest.main(verbosity=2)
