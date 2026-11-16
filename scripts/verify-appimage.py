#!/usr/bin/env python3
"""Validate the final, unmodified AppImage. --launch requires an isolated X display."""
import argparse
import configparser
import importlib.util
import os
from pathlib import Path
import signal
import subprocess
import tempfile
import time
import xml.etree.ElementTree as ET

spec = importlib.util.spec_from_file_location(
    "metadata", Path(__file__).with_name("generate-linux-metadata.py")
)
metadata = importlib.util.module_from_spec(spec)
spec.loader.exec_module(metadata)


def check(condition, message):
    if not condition:
        raise RuntimeError(message)


def verify(appimage, launch=False):
    config = metadata.configuration()
    with tempfile.TemporaryDirectory(prefix="descify-appimage-") as directory:
        work = Path(directory)
        subprocess.run([str(appimage), "--appimage-extract"], cwd=work,
                       stdout=subprocess.DEVNULL, check=True)
        root = work / "squashfs-root"
        desktops = sorted(root.rglob("*.desktop"))
        check(desktops, "No desktop entries packaged")
        check((root / "Descify.desktop").is_file(), "Missing root desktop entry")
        check((root / "usr/share/applications/Descify.desktop").is_file(),
              "Missing installed desktop entry")
        for path in desktops:
            subprocess.run(["desktop-file-validate", str(path)], check=True)
            parser = configparser.ConfigParser(interpolation=None, strict=True)
            parser.read(path)
            entry = parser["Desktop Entry"]
            check(entry["X-AppImage-Version"] == config["version"],
                  f"Version mismatch in {path}")
            check(entry["Name"] == config["productName"], f"Name mismatch: {path}")
            check(entry["Comment"] == config["bundle"]["shortDescription"],
                  f"Description mismatch: {path}")
            check("Graphics" in entry["Categories"].split(";"), "Missing category")
            check(entry.get("Exec") and entry.get("Icon"), "Missing command/icon")
            check(any((root / "usr/share/icons").rglob(entry["Icon"] + ".png")),
                  "Desktop icon not packaged")
            print(f"Validated {path.relative_to(root)}: {config['version']}")

        info = root / f"usr/share/metainfo/{config['identifier']}.metainfo.xml"
        subprocess.run(["appstreamcli", "validate", "--no-net", str(info)], check=True)
        component = ET.parse(info).getroot()
        check(component.findtext("id") == config["identifier"], "AppStream ID mismatch")
        check(component.find("releases/release").get("version") == config["version"],
              "AppStream version mismatch")
        check(component.findtext("launchable") == "Descify.desktop", "Wrong launchable")
        check(component.findtext("url[@type='homepage']") == config["bundle"]["homepage"],
              "Homepage mismatch")
        check(component.findtext("url[@type='vcs-browser']") == metadata.REPOSITORY,
              "Repository mismatch")
        check(component.findtext("developer_name") == (config["bundle"].get("publisher") or None),
              "Publisher mismatch")
        if launch:
            # Run under xvfb-run so an existing Descify window cannot satisfy this check.
            env = dict(os.environ, APPIMAGE_EXTRACT_AND_RUN="1", GDK_BACKEND="x11",
                       LIBGL_ALWAYS_SOFTWARE="1", WEBKIT_DISABLE_DMABUF_RENDERER="1")
            for key in ("XDG_CONFIG_HOME", "XDG_CACHE_HOME", "XDG_DATA_HOME", "XDG_STATE_HOME"):
                env[key] = str(work / key.lower())
            with (work / "launch.log").open("w+") as log:
                process = subprocess.Popen([str(appimage)], cwd=work, env=env,
                                           stdout=log, stderr=log, start_new_session=True)
                try:
                    deadline = time.monotonic() + 45
                    visible = False
                    while time.monotonic() < deadline and process.poll() is None:
                        result = subprocess.run(
                            ["xdotool", "search", "--onlyvisible", "--class", "[Dd]escify"],
                            capture_output=True, env=env,
                        )
                        if result.returncode == 0:
                            time.sleep(2)
                            visible = process.poll() is None
                            break
                        time.sleep(0.5)
                    log.seek(0)
                    check(visible, "AppImage did not show a window:\n" + log.read())
                    print("Launch smoke test passed: visible Descify window")
                finally:
                    if process.poll() is None:
                        os.killpg(process.pid, signal.SIGTERM)
                        try:
                            process.wait(timeout=5)
                        except subprocess.TimeoutExpired:
                            os.killpg(process.pid, signal.SIGKILL)
                            process.wait()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("appimage", type=Path)
    parser.add_argument("--launch", action="store_true")
    args = parser.parse_args()
    verify(args.appimage.resolve(strict=True), args.launch)
