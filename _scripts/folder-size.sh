#!/bin/bash
# Usage: ./folder_size.sh [directory]
# If no directory is provided, the script uses the current directory.

TARGET_DIR="${1:-.}"

# Use find to list only directories in TARGET_DIR (one level deep),
# then calculate size in MB (du -sm) and sort in numerical reverse order.
find "$TARGET_DIR" -maxdepth 1 -mindepth 1 -type d -exec du -sm {} \; 2>/dev/null | \
sort -nr | \
while read size folder; do
    echo "$size MB - $folder"
done
