# Bento Homescreen Chrome Extension

A modern, bento-style Chrome new tab extension for frequently visited websites.

## Features

- **Top bar layout**:
  - **Your sections** title on the top-left.
  - **Launcher search bar** centered at the top.
  - **Add app** and **Edit styles** buttons on the top-right.
- **Search dropdown behavior**:
  - Suggestions only appear as a dropdown while the user is actively typing a query.
- **Draggable section workspace**:
  - Drag and drop sections to reorder their position.
  - Sections keep bento-style size variants for visual variety.
- **App cards inside sections** with icon-over-title layout.
- **Delayed remove action** on each app card:
  - Delete **X** appears in the card’s top-right after hovering for ~1 second.
- **App manager**:
  - Add apps with name, URL, section name, and optional icon URL.
  - Remove apps from section cards.
- **Visual customization**:
  - Gradient, solid, or image background.
  - Container color.
  - Accent color.
  - Text color.
- Persists data using `chrome.storage.local` (with localStorage fallback for preview outside extension context).

## Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder (`chrome-homescreen`)

Then open a new tab to view the homescreen.
