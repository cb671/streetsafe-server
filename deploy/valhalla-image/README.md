# Render Valhalla Image

This image bakes the local `valhalla-data` assets into a dedicated Valhalla
container for Render.

It solves the Render bootstrap loop you hit with the upstream image:

- Render needs one successful deploy before shell access works for an external image.
- The stock image was failing before it could serve because the mounted disk had bad or incomplete tiles.
- This wrapper image seeds `/custom_files` from known-good local files, then hands off to Valhalla's normal entrypoint.

## What gets bundled

The build script copies these files from `valhalla-data` into the image:

- `valhalla.json`
- `valhalla_tiles.tar`
- `admins.sqlite`
- `timezones.sqlite`
- `default_speeds.json`
- `file_hashes.txt`
- the single `*.osm.pbf` file in `valhalla-data`, renamed to `united-kingdom-latest.osm.pbf` inside the image

On container startup, the wrapper:

- creates `/custom_files` if needed
- copies missing seed files into `/custom_files`
- replaces a bad or partial `valhalla_tiles/` directory with the bundled `valhalla_tiles.tar` when the tarball is missing
- starts Valhalla using the original `/valhalla/scripts/docker-entrypoint.sh`

## Build and push

Run the PowerShell helper from the repo root:

```powershell
.\scripts\build-render-valhalla-image.ps1 -ImageTag your-registry/streetsafe-valhalla:2026-06-27
```

Add `-Push` if you want the script to push right after building:

```powershell
.\scripts\build-render-valhalla-image.ps1 -ImageTag your-registry/streetsafe-valhalla:2026-06-27 -Push
```

## Render setup

1. Point the `streetsafe-valhalla` service at the pushed custom image.
2. Keep the service port at `8002` internally and the service address at `streetsafe-valhalla:10000`.
3. You can keep the persistent disk mounted at `/custom_files`.
4. After the first healthy deploy, the seeded files on the image and the persisted files on disk will agree.

If you want to refresh the data later, rebuild and push a new image tag from the updated local `valhalla-data` folder.
