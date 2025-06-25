# Scripts

This directory contains utility scripts for the project.

## Download LibSQL Binaries

The `download-libsql.js` script downloads LibSQL native modules for multiple platforms and extracts them to the `bundled_modules` directory.

### Usage

```bash
# Download the default version (0.5.0-pre.7)
npm run download-libsql

# Download a specific version
npm run download-libsql -- 0.5.0-pre.7
```

Or run directly:

```bash
node scripts/download-libsql.js [version]
```

### What it does

This script:

1. Downloads the prebuilt LibSQL binaries for each platform (macOS ARM64, macOS x64, Windows x64) from the Turso GitHub repository
2. Extracts the binaries to `bundled_modules/libsql/<platform>` directories
3. Cleans up temporary files

### Output structure

The script creates the following directory structure:

```
bundled_modules/
└── libsql/
    ├── darwin-arm64/
    │   └── index.node
    ├── darwin-x64/
    │   └── index.node
    └── win32-x64/
        └── index.node
```

This structure is used by the Conveyor configuration to bundle the LibSQL native modules in the appropriate locations. 