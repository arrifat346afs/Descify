# Linux package metadata

`src-tauri/tauri.conf.json` owns the application version, name, identifier,
description, category, homepage and license. The Linux configuration supplies
the publisher; if it is absent or empty, the optional AppStream developer name
is omitted without blocking version metadata generation. Linux packaging runs
`scripts/generate-linux-metadata.py` through `build.beforeBundleCommand` in
`tauri.linux.conf.json`. This hook runs for both `tauri build` and `tauri bundle`.
Python 3 is required on Linux packaging hosts.

Generated files live in ignored `src-tauri/generated/linux/`. Do not edit or
commit them. The generator reads the base and Linux configurations and applies
Tauri's `TAURI_CONFIG` overrides, including version overrides. A version pointing
to a JSON file is resolved relative to `src-tauri`, like Tauri's configuration.

- The desktop template keeps Tauri's executable, icon and category substitutions
  and adds `X-AppImage-Name` and `X-AppImage-Version`.
- Desktop `Version=1.0` denotes the desktop entry specification, not Descify's
  version. The application version appears only in `X-AppImage-Version` and
  the AppStream release metadata.
- Tauri's AppImage bundler builds its desktop entry through the Debian staging
  path, using `bundle.linux.deb.desktopTemplate`. The AppDir root desktop entry
  points to `usr/share/applications/Descify.desktop`.
- AppStream metadata is installed as
  `usr/share/metainfo/com.descify.app.metainfo.xml`. It identifies the app and
  its desktop launcher, publisher, project license, website, source repository,
  issue tracker and release version. The launcher resolves the packaged icon.
- The AppStream release date uses `SOURCE_DATE_EPOCH`, when set, or the source
  commit's date. It is not a separately maintained release calendar.
- `developer_name` is retained for compatibility with Ubuntu 22.04's AppStream
  validator. Newer validators may emit informational notices about this older
  tag and missing optional developer/content-rating information.
- The repository URL uses the supported `help` type because its README contains
  the user documentation. Ubuntu 22.04's validator rejects the newer
  `vcs-browser` URL type; the website and issue tracker retain their own types.

The Debian and RPM packages receive the same metadata. The repository URL is
maintained in the generator because Tauri has no repository bundle property.
If the application is renamed or recategorized, update the installed paths and
category mapping; generation deliberately fails instead of shipping stale IDs.

## Build and verify

Install `desktop-file-utils`, `appstream`, `xvfb`, `xauth`, `xdotool` and
`dbus-x11` on Ubuntu, in addition to the normal Tauri build dependencies.

```sh
python3 -m unittest discover -s scripts -p 'test_linux_metadata.py'
bun tauri build --bundles appimage
```

Supply the existing Tauri signing environment for a release build. For a local
unsigned check, use Tauri's `--no-sign` option; do not publish that test artifact.

```sh
python3 scripts/verify-appimage.py /absolute/path/to/Descify_VERSION_ARCH.AppImage
dbus-run-session -- xvfb-run -a python3 scripts/verify-appimage.py /absolute/path/to/Descify_VERSION_ARCH.AppImage --launch
```

The verifier extracts the actual AppImage into a temporary directory, validates
every desktop entry (including the root entry), checks versions against Tauri's
configuration, validates AppStream and checks its identity/URLs/publisher and
the packaged icon. `--launch` runs the AppImage using its extract-and-run mode
without requiring FUSE, in a temporary XDG profile, and waits for a visible
Descify window. Run that option on an isolated X display as shown above. This
is a startup smoke test, not a test of every application feature or of FUSE.

The release workflow runs these checks on Ubuntu. Tauri action uploads draft
release artifacts before the verification step; a failed check leaves the
workflow failed and the release in draft. Do not publish a failed draft.

## Updater and third-party limitations

Metadata is embedded before packaging and signing. No script rewrites the final
AppImage, changes its filename, or modifies the existing updater endpoint,
public key, signature generation or updater artifacts. Descify's built-in
updater remains independent of Gear Lever.

Version discovery is different from finding and downloading newer releases.
This change does not add AppImage update information (`.upd_info`) or a zsync
feed. Managers requiring those mechanisms still need a separate update source;
the desktop version and AppStream URLs alone do not implement that protocol.
Managers can also cache old metadata and may require re-importing the newly
built AppImage. Older AppImages are not retroactively changed.

References:
- https://docs.appimage.org/reference/desktop-integration.html
- https://docs.appimage.org/packaging-guide/optional/appstream.html
- https://docs.appimage.org/packaging-guide/optional/updates.html
- https://v2.tauri.app/reference/config/

## Local verification for this change

- Four generator regression tests passed (version overrides, file-based
  versions, XML escaping/reproducibility, invalid input and rename protection).
- Tauri built a debug Debian package with the generated desktop and AppStream
  files; `desktop-file-validate` and `appstreamcli validate --no-net` passed.
- The AppImage build reached the pre-bundle hook but could not download Tauri's
  AppRun helper because GitHub DNS resolution is unavailable in the execution
  environment. Final AppImage extraction and launch have **not** been verified
  locally. Run the workflow or the commands above on a network-enabled host.
- The updater configuration and `createUpdaterArtifacts` were compared against
  the original configuration and are unchanged. No signed update was installed
  as part of this check.
