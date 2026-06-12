#!/bin/sh
# Bumps the cache-busting version on all versioned assets in index.html.
# Run after any change to statics/style.css or statics/main.js.
set -e
cd "$(dirname "$0")/.."
v=$(date +%Y%m%d%H%M)
sed -i "s|\(statics/style\.css?v=\)[0-9A-Za-z]*|\1$v|; s|\(statics/main\.js?v=\)[0-9A-Za-z]*|\1$v|" index.html
echo "assets bumped to v=$v"
grep -o 'statics/[a-zA-Z.]*?v=[0-9A-Za-z.]*' index.html
