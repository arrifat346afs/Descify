import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

spec = importlib.util.spec_from_file_location(
    "metadata", Path(__file__).with_name("generate-linux-metadata.py")
)
metadata = importlib.util.module_from_spec(spec)
spec.loader.exec_module(metadata)


class MetadataTests(unittest.TestCase):
    def test_optional_publisher_does_not_block_version_metadata(self):
        for publisher in (None, ""):
            with self.subTest(publisher=publisher), tempfile.TemporaryDirectory() as directory, patch.object(
                metadata, "OUTPUT", Path(directory)
            ), patch.dict("os.environ", {
                "TAURI_CONFIG": json.dumps({"bundle": {"publisher": publisher}}),
                "SOURCE_DATE_EPOCH": "0",
            }):
                # A null Merge Patch removes the key, reproducing the CI failure.
                metadata.generate()
                version = metadata.configuration()["version"]
                desktop = (Path(directory) / "Descify.desktop").read_text()
                self.assertIn(f"X-AppImage-Version={version}\n", desktop)
                component = ET.parse(Path(directory) / "com.descify.app.metainfo.xml").getroot()
                self.assertIsNone(component.find("developer_name"))
                self.assertEqual(component.find("releases/release").get("version"), version)

    def test_version_override_reaches_both_formats_and_xml_is_escaped(self):
        overrides = {"version": "9.8.7-test.1", "bundle": {
            "publisher": "Example & Partners", "shortDescription": "Images < metadata"
        }}
        with tempfile.TemporaryDirectory() as directory, patch.object(
            metadata, "OUTPUT", Path(directory)
        ), patch.dict("os.environ", {"TAURI_CONFIG": json.dumps(overrides),
                                     "SOURCE_DATE_EPOCH": "0"}):
            metadata.generate()
            desktop = (Path(directory) / "Descify.desktop").read_text()
            self.assertIn("X-AppImage-Version=9.8.7-test.1\n", desktop)
            self.assertIn("Version=1.0\n", desktop)
            xml_path = Path(directory) / "com.descify.app.metainfo.xml"
            component = ET.parse(xml_path).getroot()
            self.assertEqual(component.find("releases/release").get("version"), overrides["version"])
            self.assertEqual(component.findtext("developer_name"), "Example & Partners")
            self.assertEqual(component.findtext("summary"), "Images < metadata")
            # Keep URLs compatible with Ubuntu 22.04's AppStream validator.
            self.assertEqual(component.findtext("url[@type='help']"), metadata.REPOSITORY)
            self.assertTrue({url.get("type") for url in component.findall("url")}
                            <= {"homepage", "help", "bugtracker"})
            first = xml_path.read_bytes()
            metadata.generate()
            self.assertEqual(first, xml_path.read_bytes())

    def test_version_can_reference_a_json_file(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "version.json"
            path.write_text(json.dumps({"version": "8.7.6"}))
            with patch.dict("os.environ", {"TAURI_CONFIG": json.dumps({"version": str(path)})}):
                self.assertEqual(metadata.configuration()["version"], "8.7.6")

    def test_rejects_desktop_key_injection(self):
        with patch.dict("os.environ", {"TAURI_CONFIG": json.dumps({"version": "1.0\nExec=bad"})}):
            with self.assertRaises(ValueError):
                metadata.configuration()

    def test_rejects_stale_installed_paths_after_rename(self):
        with patch.dict("os.environ", {"TAURI_CONFIG": json.dumps({"identifier": "org.example.other"})}):
            with self.assertRaises(ValueError):
                metadata.configuration()


if __name__ == "__main__":
    unittest.main()
