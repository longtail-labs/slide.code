# Polka





## Future + Concerns + Considerations

Tbh, I wasn't stoked to use Electron. If you asked me when I started out to build this app, I was 100% against using it. I think I went through it very similar to the Stack browser (https://www.ika.im/posts/tech-behind-stack-browser).

The biggest concern with Electron right now for me is that it's using the WebView tag, which has many issues and is not recommended to use. Benig the bad boi I am I went with it anythings, thinking in the short term the pros outweighed the cons (I couldn't realistically get the UI I wanted otherwise).


* Flutter
* Tauri
* Rust
* Swift
* Kotlin
* Compose Multiplatform
* https://electrobun.dev/docs/guides/Architecture/Webview%20Tag



## Credits

- Electron Vite Builder template.

## Development

### Setup

To set up the development environment:

```bash
npm run setup
```

This script will:
1. Install dependencies
2. Download LibSQL binaries for all platforms

### LibSQL Native Modules

The app uses LibSQL for local database functionality. The native modules are automatically downloaded during setup.

If you need to update or re-download the LibSQL binaries:

```bash
# Download default version
npm run download-libsql

# Download specific version
npm run download-libsql -- 0.5.0-pre.7
```