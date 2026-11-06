# api/Dockerfile — local-development runtime for the Nexum PHP API.
#
# What this image provides:
#   - PHP 8.2 CLI (Debian bookworm base, for broadest build compatibility)
#   - The pecl "mongodb" extension, required to talk to MongoDB Atlas
#   - Composer 2.x
#
# What it deliberately does NOT do:
#   - Copy any project files or .env into the image. Source lives in a
#     bind-mount, so changes on your host take effect immediately.
#   - Bake in your MONGODB_URI. The .env stays on your host filesystem
#     and is read in-memory by PHP via phpdotenv at request time.
#   - Install anything on Windows outside Docker's own image store.
#
# Build (once, ~2–3 minutes on first pull):
#   docker build -t nexum-api ./api
#
# Run (every session):
#   docker run --rm -it -p 8000:8000 \
#     -v "${PWD}/api:/app" \
#     --name nexum-api nexum-api
#
# First run performs "composer install" inside the container; subsequent
# runs skip it because vendor/ already exists on the bind-mounted host
# directory. Stopping the container leaves zero traces on Windows beyond
# the local image and your own files.

FROM php:8.2-cli

# Build + runtime deps for the mongodb pecl extension.
# $PHPIZE_DEPS is a convention variable defined inside all official PHP
# images and expands to the build toolchain (gcc, make, autoconf, …).
# libssl-dev + pkg-config are what the mongodb build actually consumes.
# We remove the build tools after compiling to keep the image small.
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        $PHPIZE_DEPS \
        libssl-dev \
        pkg-config \
        unzip \
        git \
        ca-certificates \
    ; \
    # Pin to the last 1.x pecl release of mongodb — the "mongodb/mongodb"
    # ^1.19 Composer library requires ext-mongodb ^1.21.0. The newer
    # ext-mongodb 2.x line is only compatible with mongodb/mongodb 2.x.
    pecl install mongodb-1.21.1; \
    docker-php-ext-enable mongodb; \
    # Keep unzip, git, ca-certificates — Composer uses them at runtime.
    apt-get purge -y --auto-remove $PHPIZE_DEPS pkg-config; \
    rm -rf /var/lib/apt/lists/* /tmp/pear ~/.pearrc

# Composer 2.x, copied from the official image rather than piping a
# shell installer from the internet at build time.
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Small entrypoint: on first boot (no vendor/), run `composer install`
# automatically. Keeps the user workflow a single `docker run` command.
RUN printf '%s\n' \
    '#!/bin/sh' \
    'set -e' \
    'if [ ! -d /app/vendor ]; then' \
    '  echo "[nexum-api] installing Composer dependencies (first run)..."' \
    '  composer install --no-interaction --no-progress --prefer-dist' \
    'fi' \
    'exec "$@"' \
    > /usr/local/bin/nexum-entry.sh \
 && chmod +x /usr/local/bin/nexum-entry.sh

EXPOSE 8000
ENTRYPOINT ["/usr/local/bin/nexum-entry.sh"]
CMD ["php", "-S", "0.0.0.0:8000", "-t", "public"]
