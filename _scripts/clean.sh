#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting project cleanup...${NC}"

# Function to remove directories or files with a specific message
remove_items() {
  local pattern=$1
  local type=$2
  local count=0
  
  echo -e "${YELLOW}Removing $type...${NC}"
  
  # Find and count items
  items=$(find . -name "$pattern" -not -path "*/node_modules/*" -not -path "*/\.git/*")
  
  # Remove items if found
  if [ -n "$items" ]; then
    echo "$items" | while read item; do
      if [ -e "$item" ]; then
        rm -rf "$item"
        echo "  Removed: $item"
        count=$((count + 1))
      fi
    done
    echo -e "${GREEN}Removed $count $type${NC}"
  else
    echo -e "  No $type found to remove"
  fi
  
  echo ""
}

# Remove all specified files and directories
remove_items "node_modules" "node_modules directories"
remove_items "dist" "dist directories"
remove_items "tsconfig.tsbuildinfo" "tsconfig.tsbuildinfo files"
remove_items "package-lock.json" "package-lock.json files"

echo -e "${GREEN}Cleanup completed successfully!${NC}"
echo -e "${YELLOW}You can now run 'npm install' for a fresh installation.${NC}" 