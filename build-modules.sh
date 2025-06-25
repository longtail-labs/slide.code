#!/bin/bash
set -e

echo "📦 Creating optimized production node_modules_build..."

# Check if we have a package.json file
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found in current directory"
  exit 1
fi


# Clean node_modules_build if it exists
if [ -d "node_modules_build" ]; then
  echo "🧹 Cleaning existing node_modules_build..."
  rm -rf node_modules_build
fi

# Create the target directory structure
echo "📋 Creating node_modules_build structure..."
mkdir -p node_modules_build


# Run build-modules.sh to copy dist packages
echo "🔄 Running build-modules.sh to copy dist packages..."
if [ -f "./build-slide-modules.sh" ]; then
  bash ./build-slide-modules.sh
else
  echo "❌ Error: build-modules.sh not found"
  exit 1
fi

# Copy specific modules from node_modules.bk to node_modules_build
if [ -d "node_modules" ]; then
  echo "📋 Copying specific modules from node_modules.bk to node_modules_build..."
  
  # List of modules to copy
  # modules=("@libsql" "@neon-rs" "@trpc" "drizzle-orm" "js-base64" "libsql" "promise-limit" "ws" "zod" "koffi")
  modules=("koffi" "kuzu")
  
  # Copy each module
  for module in "${modules[@]}"; do
    if [ -d "node_modules/$module" ]; then
      echo "  - Copying $module..."
      cp -R "node_modules/$module" "node_modules_build/"
    else
      echo "  ⚠️ Module $module not found in node_modules.bk"
    fi
  done

else
  echo "⚠️ Warning: node_modules.bk not found, cannot copy modules"
fi

# if [ -d "node_modules_build/koffi/build/koffi" ]; then    
#   # Remove the koffi/build directory to save space
#   echo "  - Removing koffi/build directory from node_modules_build"
#   rm -rf "node_modules_build/koffi/build"
#   rm -rf "node_modules_build/koffi/doc"
#   rm -rf "node_modules_build/koffi/src"
#   rm -rf "node_modules_build/koffi/vendor"

#   echo "  ✅ Koffi platform binaries extracted and build directory removed"
# fi


echo "✅ Done! Build env set up."
# echo "   node_modules_build contains optimized production dependencies."
# echo "   Original node_modules has been restored." 