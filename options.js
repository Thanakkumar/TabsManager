// Options page script for FocusFlow extension

// DOM elements
const declutterAggressiveness = document.getElementById('declutterAggressiveness');
const tabThreshold = document.getElementById('tabThreshold');
const inactiveMinutes = document.getElementById('inactiveMinutes');
const saveBtn = document.getElementById('saveBtn');
const saveStatus = document.getElementById('saveStatus');
const resetSettings = document.getElementById('resetSettings');

// Load saved settings
async function loadSettings() {
    const settings = await chrome.storage.local.get([
        'declutterAggressiveness',
        'tabThreshold',
        'inactiveMinutes'
    ]);

    declutterAggressiveness.value = settings.declutterAggressiveness || 'medium';
    tabThreshold.value = settings.tabThreshold || 10;
    inactiveMinutes.value = settings.inactiveMinutes || 30;
}

// Save settings
async function saveSettings() {
    const settings = {
        declutterAggressiveness: declutterAggressiveness.value,
        tabThreshold: parseInt(tabThreshold.value),
        inactiveMinutes: parseInt(inactiveMinutes.value)
    };

    await chrome.storage.local.set(settings);

    // Show save confirmation
    saveStatus.textContent = '✓ Settings saved';
    saveStatus.classList.add('show');

    setTimeout(() => {
        saveStatus.classList.remove('show');
    }, 2000);
}

// Reset to defaults
async function resetToDefaults() {
    if (confirm('Reset all settings to defaults?')) {
        const defaults = {
            declutterAggressiveness: 'medium',
            tabThreshold: 10,
            inactiveMinutes: 30
        };

        await chrome.storage.local.set(defaults);
        await loadSettings();

        saveStatus.textContent = '✓ Reset to defaults';
        saveStatus.classList.add('show');

        setTimeout(() => {
            saveStatus.classList.remove('show');
        }, 2000);
    }
}

// Event listeners
saveBtn.addEventListener('click', saveSettings);
resetSettings.addEventListener('click', resetToDefaults);

// Load settings on page load
loadSettings();
