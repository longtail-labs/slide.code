#!/bin/bash

# Script to create a minimal node_modules structure with just the dist folders
# from packages and widgets for optimized bundling

# Make sure we're in the project root
cd "$(dirname "$0")"

# Create the target directory structure
mkdir -p node_modules_build/@slide.code

# Function to copy a package's dist folder
copy_package_dist() {
  local source_dir="$1"
  local package_dir="$2"
  local package_name=$(basename "$package_dir")
  
  # Check if dist folder exists
  if [ -d "$package_dir/dist" ]; then
    echo "Copying $package_name dist folder..."
    
    # Create the destination directory
    mkdir -p "node_modules_build/@slide.code/$package_name"
    
    # Copy the dist folder
    cp -r "$package_dir/dist" "node_modules_build/@slide.code/$package_name/"
    
    # If package.json exists and is needed (optional)
    if [ -f "$package_dir/package.json" ]; then
      if [ "$package_name" = "note" ]; then
        # For note package, remove dependencies and devDependencies
        echo "Removing dependencies and devDependencies from $package_name package.json..."
        jq 'del(.dependencies, .devDependencies)' "$package_dir/package.json" > "node_modules_build/@slide.code/$package_name/package.json"
      else
        # For other packages, copy as-is
        cp "$package_dir/package.json" "node_modules_build/@slide.code/$package_name/"
      fi
    fi
  else
    echo "Warning: $package_name does not have a dist folder, skipping"
  fi
}

# Clean existing node_modules_build
if [ -d "node_modules_build" ]; then
  echo "Cleaning existing node_modules_build directory..."
  rm -rf node_modules_build/@slide.code
  mkdir -p node_modules_build/@slide.code
fi

#Adding main dir
copy_package_dist "main" "apps/main"
copy_package_dist "core" "packages/core"
# copy_package_dist "ssr-client" "packages/ssr-client"
copy_package_dist "app" "widgets/app"

echo "Done! All dist folders have been copied to node_modules_build/@slide.code" 