FROM ghcr.io/valhalla/valhalla-scripted:latest

COPY deploy/valhalla-image/seed-entrypoint.sh /usr/local/bin/seed-entrypoint.sh
COPY custom_files/ /opt/valhalla-seed/

RUN chmod +x /usr/local/bin/seed-entrypoint.sh

# The bundled files let Render reach one successful deploy, while still
# supporting a mounted disk at /custom_files for persistence afterwards.
ENV build_admins=False \
    build_time_zones=False \
    build_elevation=False \
    build_tar=True \
    serve_tiles=True \
    use_tiles_ignore_pbf=True \
    update_existing_config=True \
    force_rebuild=False

WORKDIR /custom_files
ENTRYPOINT ["/usr/local/bin/seed-entrypoint.sh"]
CMD ["build_tiles"]
