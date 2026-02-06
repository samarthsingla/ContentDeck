# ContentDeck Chrome Extension

Save bookmarks to ContentDeck with one click.

## Installation

1. Generate icons (required):
   - Open https://realfavicongenerator.net/ or similar tool
   - Upload a 128x128 PNG with the ContentDeck logo (purple #6c63ff background with bookmark icon)
   - Download and extract to get icon16.png, icon48.png, icon128.png
   - Or use any image editor to create simple icons

2. Load extension:
   - Open Chrome → `chrome://extensions`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select this `extension` folder

3. Connect:
   - Click the ContentDeck extension icon
   - Enter your Supabase URL and anon key
   - Click Connect

## Usage

- Click the extension icon on any page to save it
- Add notes and tags before saving
- Use `Ctrl+Enter` to quick save
- Keyboard shortcut: `Alt+Shift+S` opens the popup

## Features

- Auto-detects source type (YouTube, Twitter, etc.)
- Pre-fills page title
- Tag management with keyboard support
- Stores credentials locally in Chrome
