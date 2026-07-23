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
    carryText: false,
    showProcess: true,
    fullSteps: false
};

/**
 * One-time migration from the pre-rebrand localStorage keys, so existing
 * users keep their settings under the Basementen Aegis names. Also removes
 * storage left behind by the retired plaintext history panel.
 */
function migrateLegacyStorage() {
    const migrations = [
        ['cipher_craft_state', 'aegis_state']
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

    // The "Recent Transactions" panel was removed; clear its stored data.
    localStorage.removeItem('aegis_history');
    localStorage.removeItem('cipher_craft_history');
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
            state.cipher = migrateCipherId(parsed.cipher) || 'caesar';
            state.mode = parsed.mode || 'encode';
            state.retainPunctuation = parsed.retainPunctuation !== undefined ? parsed.retainPunctuation : true;
            state.carryText = parsed.carryText !== undefined ? parsed.carryText : false;
            state.showProcess = parsed.showProcess !== undefined ? parsed.showProcess : true;
            state.fullSteps = parsed.fullSteps !== undefined ? parsed.fullSteps : false;
        } catch (e) {
            console.error("Error reading saved state", e);
        }
    }

}

// Retired registry ids are mapped to their successors so old saved state
// keeps loading correctly.
function migrateCipherId(id) {
    // Scandi Caesar merged into Caesar (alphabet dropdown) — same algorithm.
    if (id === 'scandicaesar') return 'caesar';
    // The Basementen vault was removed; fall back to a valid cipher.
    // (Any encrypted basementen_* localStorage entries are left untouched
    // rather than silently destroyed.)
    if (id === 'basementen') return 'caesar';
    return id;
}

/**
 * Save current config state to localStorage
 */
export function saveConfigState() {
    const config = {
        cipher: state.cipher,
        mode: state.mode,
        retainPunctuation: state.retainPunctuation,
        carryText: state.carryText,
        showProcess: state.showProcess,
        fullSteps: state.fullSteps
    };
    localStorage.setItem('aegis_state', JSON.stringify(config));
}
