#!/usr/bin/env python3
"""Generate metadata before Tauri bundles/signs Linux packages (stdlib only)."""
import json
import os
from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
TAURI = ROOT / "src-tauri"
OUTPUT = TAURI / "generated/linux"
REPOSITORY = "https://github.com/arrifat346afs/Descify"


def merge(base, override):
    # Tauri uses JSON Merge Patch for configuration overrides.
    for key, value in override.items():
        if value is None:
            base.pop(key, None)
        elif isinstance(value, dict):
            if not isinstance(base.get(key), dict):
                base[key] = {}
            merge(base[key], value)
        else:
            base[key] = value
    return base


def configuration():
    config = json.loads((TAURI / "tauri.conf.json").read_text())
    merge(config, json.loads((TAURI / "tauri.linux.conf.json").read_text()))
    merge(config, json.loads(os.environ.get("TAURI_CONFIG", "{}")))
    version = config["version"]
    version_file = TAURI / version
    if version_file.is_file():
        config["version"] = json.loads(version_file.read_text())["version"]
    for value in (config["version"], config["identifier"]):
        if not value or any(c in value for c in "\r\n\\{}"):
            raise ValueError("Invalid version or application identifier")
    # These installed paths are declared in tauri.linux.conf.json.
    if config["identifier"] != "com.descify.app" or config["productName"] != "Descify":
        raise ValueError("Update Linux installed metadata paths when renaming Descify")
    if config["bundle"]["category"] != "GraphicsAndDesign":
        raise ValueError("Update the AppStream category mapping when changing the bundle category")
    return config


def generate():
    config = configuration()
    bundle = config["bundle"]
    OUTPUT.mkdir(parents=True, exist_ok=True)
    # Let Tauri render its own executable, icon, category and escaped command.
    # Version= is the desktop specification version, NOT the application version.
    desktop = """[Desktop Entry]
Version=1.0
Type=Application
Name={{{name}}}
Comment={{{comment}}}
Exec={{{exec}}}
Icon={{{icon}}}
Terminal=false
Categories={{{categories}}}
StartupWMClass=Descify
X-AppImage-Name=Descify
""" + f"X-AppImage-Version={config['version']}\n"
    (OUTPUT / "Descify.desktop").write_text(desktop)

    component = ET.Element("component", type="desktop-application")

    def field(parent, tag, value, **attributes):
        ET.SubElement(parent, tag, **attributes).text = value

    field(component, "id", config["identifier"])
    field(component, "metadata_license", "CC0-1.0")
    field(component, "project_license", bundle["license"])
    field(component, "name", config["productName"])
    field(component, "summary", bundle["shortDescription"])
    description = ET.SubElement(component, "description")
    field(description, "p", bundle["longDescription"])
    # developer_name also works with Ubuntu 22.04's AppStream validator.
    if bundle.get("publisher"):
        field(component, "developer_name", bundle["publisher"])
    field(component, "url", bundle["homepage"], type="homepage")
    # Ubuntu 22.04's AppStream rejects vcs-browser. The repository README
    # provides the user documentation, so expose it as a supported help link.
    field(component, "url", REPOSITORY, type="help")
    field(component, "url", REPOSITORY + "/issues", type="bugtracker")
    field(component, "launchable", "Descify.desktop", type="desktop-id")
    categories = ET.SubElement(component, "categories")
    field(categories, "category", "Graphics")
    # Use the source commit date, or SOURCE_DATE_EPOCH for reproducible builds.
    epoch = os.environ.get("SOURCE_DATE_EPOCH")
    if epoch is None:
        epoch = subprocess.check_output(
            ["git", "log", "-1", "--format=%ct"], cwd=ROOT, text=True
        ).strip()
    date = datetime.fromtimestamp(int(epoch), timezone.utc).date().isoformat()
    releases = ET.SubElement(component, "releases")
    ET.SubElement(releases, "release", version=config["version"], date=date)
    ET.indent(component)
    ET.ElementTree(component).write(
        OUTPUT / f"{config['identifier']}.metainfo.xml",
        encoding="utf-8", xml_declaration=True,
    )
    print(f"Generated Linux metadata for {config['productName']} {config['version']}")


if __name__ == "__main__":
    generate()
