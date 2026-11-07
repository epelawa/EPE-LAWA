#!/bin/sh
# Dev server launcher for EPE LAWA main web app.
# --webpack is deliberate: Turbopack crashes on this filesystem with
# "Invalid symlink: Invalid argument (os error 22)" when reading the pnpm store.
set -e
cd "$(dirname "$0")/../frontend/apps/main"
exec ./node_modules/.bin/next dev --webpack --hostname 0.0.0.0 --port 3000
