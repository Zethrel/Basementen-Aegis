/**
 * Basementen Aegis - Application State & Persistence
 * The shared config/history state object plus its localStorage load/save
 * (including the one-time legacy key migration).
 */

// Application State
export const state = {
    cipher: 'caesar',
    mode: 'encode',
    retainPunctuation: true,
    showProcess: true,
    history: []
};

/**
 * One-time migration from the pre-rebrand localStorage keys, so existing
 * users keep their settings and history under the Basementen Aegis names.
 */
function migrateLegacyStorage() {
    const migrations = [
        ['cipher_craft_state', 'aegis_state'],
        ['cipher_craft_history', 'aegis_history']
    ];
    for (const [oldKey, newKey] of migrations) {
        const oldValue = localStorage.getItem(oldKey);
        if (oldValue !== null) {
            if (localStorage.getItem(newKey) === null) {
                localStorage.setItem(newKey, oldValue);
            }
            localStorage.removeItem(oldKey);
        }
    }
}

/**
 * Load state from localStorage
 */
export function loadSavedState() {
    migrateLegacyStorage();

    const saved = localStorage.getItem('aegis_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state.cipher = parsed.cipher || 'caesar';
            state.mode = parsed.mode || 'encode';
            state.retainPunctuation = parsed.retainPunctuation !== undefined ? parsed.retainPunctuation : true;
            state.showProcess = parsed.showProcess !== undefined ? parsed.showProcess : true;
        } catch (e) {
            console.error("Error reading saved state", e);
        }
    }
    
    const savedHistory = localStorage.getItem('aegis_history');
    if (savedHistory) {
        try {
            state.history = JSON.parse(savedHistory);
        } catch (e) {
            console.error("Error loading history", e);
            state.history = [];
        }
    }
}

/**
 * Save current config state to localStorage
 */
export function saveConfigState() {
    const config = {
        cipher: state.cipher,
        mode: state.mode,
        retainPunctuation: state.retainPunctuation,
        showProcess: state.showProcess
    };
    localStorage.setItem('aegis_state', JSON.stringify(config));
}
