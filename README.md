# 🌊 FocusFlow - Chrome Extension

**Declutter any page, tame your tabs, and browse faster – one click.**

FocusFlow is a Manifest V3 Chrome extension that makes browsing calmer and cleaner across any public website. It helps you focus on what matters by removing distractions, managing tabs intelligently, and monitoring page performance.

## ✨ Features

### 1. **Page Declutter Button**
- Single click hides common distractions:
  - Sidebars and navigation panels
  - Floating banners and ads
  - Cookie notices and consent popups
  - Autoplay videos
  - Social media widgets
  - Newsletter popups
- Toggle on/off with one click
- Remembers your preference per website
- Works on dynamically loaded content

### 2. **Smart Tab Parking**
- Automatically detects when you have 10+ tabs open
- One-click parking of inactive tabs (not viewed for 30+ minutes)
- Safely stores parked tabs for easy restoration
- Never deletes data - everything is reversible
- Shows count of parked tabs in the popup

### 3. **Performance Badge**
- Displays page "heaviness" score based on:
  - Number of scripts
  - Tracker domains (iframes)
  - Image count
- Quick actions to:
  - Pause heavy scripts
  - Mute all media
- Color-coded indicators (green/orange/red)

## 🚀 Installation Instructions

### Load Unpacked Extension (Development)

1. **Download or clone this repository**
   ```bash
   git clone <repository-url>
   cd focusflow-extension
   ```

2. **Open Chrome Extensions page**
   - Navigate to `chrome://extensions/`
   - Or: Menu → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the extension**
   - Click "Load unpacked"
   - Select the `extension` folder from this project
   - The FocusFlow icon should appear in your toolbar

5. **Pin the extension (optional)**
   - Click the puzzle piece icon in Chrome toolbar
   - Find FocusFlow and click the pin icon

## 📖 How to Use

### Page Declutter
1. Navigate to any website
2. Click the FocusFlow icon in your toolbar
3. Toggle "Page Declutter" on
4. Watch distractions disappear!
5. Toggle off to restore the original page

### Tab Parking
1. Open 10+ tabs in your browser
2. Click the FocusFlow icon
3. Click "Park Inactive Tabs" to save and close old tabs
4. Click "Restore Parked" to bring them back anytime

### Performance Monitoring
1. Open any webpage
2. Click the FocusFlow icon
3. View the performance score (0-100)
4. Use "Pause Heavy Scripts" or "Mute Media" for faster browsing

### Settings
1. Click the FocusFlow icon
2. Click "⚙️ Settings" at the bottom
3. Customize:
   - Declutter aggressiveness (Low/Medium/High)
   - Tab threshold for parking suggestions
   - Inactive time before parking (minutes)

## 🧪 Test Sites

FocusFlow works great on these popular websites:

1. **News Sites**
   - cnn.com - Removes sidebars and video players
   - bbc.com - Hides cookie notices and ads
   - nytimes.com - Cleans up article pages

2. **Social Media**
   - twitter.com/x.com - Removes trending sidebar
   - reddit.com - Hides side panels
   - linkedin.com - Cleans up feed distractions

3. **Shopping**
   - amazon.com - Removes recommendation sidebars
   - ebay.com - Hides promotional banners
   - etsy.com - Cleans up product pages

4. **Tech & Documentation**
   - stackoverflow.com - Removes sidebar ads
   - medium.com - Hides popups and banners
   - github.com - Minimal impact (already clean)

5. **General**
   - wikipedia.org - Removes donation banners
   - youtube.com - Hides recommendations (when applicable)

## 🛡️ Edge Cases Handled

### Single Page Applications (SPAs)
- Uses MutationObserver to detect dynamically added elements
- Automatically applies declutter rules to new content
- Works on React, Vue, Angular apps

### Lazy-Loaded Content
- Monitors DOM changes continuously
- Applies rules to content loaded on scroll
- Debounced for performance (500ms delay)

### Responsive Sites
- Declutter rules work across all screen sizes
- Preserves original display properties
- Reversible without page reload

### Protected Content
- Never hides main content areas
- Focuses on peripheral distractions
- Safe defaults prevent over-hiding

## 📁 Project Structure

```
extension/
├── manifest.json          # Extension configuration (Manifest V3)
├── popup.html            # Main popup interface
├── popup.css             # Popup styling
├── popup.js              # Popup logic
├── content.js            # Content script (runs on web pages)
├── background.js         # Service worker (tab management)
├── options.html          # Settings page
├── options.css           # Settings page styling
├── options.js            # Settings page logic
└── icons/                # Extension icons
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## 🔧 Technical Details

- **Manifest Version**: V3 (latest Chrome standard)
- **Permissions**: activeTab, tabs, storage, sessions, scripting
- **Bundle Size**: <5KB (no external dependencies)
- **Framework**: Vanilla JavaScript (no React/Vue/etc.)
- **Styling**: Pure CSS with Grid/Flexbox
- **Browser Support**: Chrome 88+, Edge 88+

## 🎨 Design Principles

- **Zero-config**: Works immediately after installation
- **Minimal UI**: Single toolbar button + clean popup
- **Visual feedback**: Animations, checkmarks, progress indicators
- **Safe defaults**: Never deletes data, always reversible
- **Performance**: Lightweight, no external dependencies

## 🐛 Troubleshooting

### Extension not working on a site
- Some sites may use unique class names
- Try adjusting declutter aggressiveness in Settings
- Report issues for popular sites

### Tabs not parking
- Ensure you have 10+ tabs open
- Check inactive threshold in Settings
- Pinned and active tabs are never parked

### Performance score shows "--"
- Page may still be loading
- Try refreshing the popup
- Some sites block content script injection

## 🚢 Chrome Web Store Submission

This extension is ready for Chrome Web Store submission:
- ✅ Manifest V3 compliant
- ✅ All required icons included
- ✅ Privacy-friendly (no external requests)
- ✅ Clear permissions justification
- ✅ Professional UI/UX
- ✅ Comprehensive documentation

## 📝 License

MIT License - Feel free to modify and distribute

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

---

**Made with 💜 for a calmer, cleaner web**
