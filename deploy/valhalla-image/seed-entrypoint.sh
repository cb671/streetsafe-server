#!/bin/sh
set -eu

seed_dir="/opt/valhalla-seed"
target_dir="/custom_files"

mkdir -p "$target_dir"

copy_if_missing() {
  src="$1"
  dest="$2"

  if [ -f "$src" ] && [ ! -s "$dest" ]; then
    cp "$src" "$dest"
  fi
}

if [ -f "$seed_dir/valhalla_tiles.tar" ] && [ ! -s "$target_dir/valhalla_tiles.tar" ]; then
  rm -rf "$target_dir/valhalla_tiles"
  cp "$seed_dir/valhalla_tiles.tar" "$target_dir/valhalla_tiles.tar"
fi

copy_if_missing "$seed_dir/valhalla.json" "$target_dir/valhalla.json"
copy_if_missing "$seed_dir/admins.sqlite" "$target_dir/admins.sqlite"
copy_if_missing "$seed_dir/timezones.sqlite" "$target_dir/timezones.sqlite"
copy_if_missing "$seed_dir/default_speeds.json" "$target_dir/default_speeds.json"
copy_if_missing "$seed_dir/file_hashes.txt" "$target_dir/file_hashes.txt"
copy_if_missing "$seed_dir/united-kingdom-latest.osm.pbf" "$target_dir/united-kingdom-latest.osm.pbf"

exec /valhalla/scripts/docker-entrypoint.sh "$@"
