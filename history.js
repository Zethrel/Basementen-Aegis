/**
 * Basementen Aegis - Transaction History
 * The general (plaintext) history panel: debounced auto-save, rendering,
 * and restore. Basementen operations are routed to the encrypted vault
 * log instead (saveBasementenTransaction in vault.js).
 */

import { state, saveConfigState } from './state.js';
import { elements } from './dom.js';
import { getFriendlyCipherName } from './registry.js';
import { vaultSession, lockBasementenSession, saveBasementenTransaction } from './vault.js';
import { setupUIFromState, runConversion } from './app.js';

// Debounce helper for auto-saving history
let historySaveTimeout = null;

/**
 * Handle debounced history saving (auto-saves after typing stops)
 */
export function triggerHistoryAutoSave() {
    if (historySaveTimeout) clearTimeout(historySaveTimeout);
    
    historySaveTimeout = setTimeout(() => {
        const input = elements.textInput.value.trim();
        const output = elements.textOutput.value.trim();
        
        if (input && output) {
            saveToHistory(input, output);
        }
    }, 2000); // Save after 2 seconds of inactivity
}

/**
 * Add a record to history array and persist in localStorage
 */
export function saveToHistory(input, output) {
    if (!input || !output) return;

    if (state.cipher === 'basementen') {
        // Status messages ("[DECRYPTION FAILED...", "LOCKED: ...") are not
        // transactions; don't write them to the vault log.
        if (output.startsWith('[') || output.startsWith('LOCKED:')) return;
        // Log the key that actually produced this result: in decode mode
        // that's the key recovered from the matched log entry, not the
        // currently active composition key.
        const keyUsed = state.mode === 'decode' ? vaultSession.decryptedKey : vaultSession.key;
        if (vaultSession.unlocked && keyUsed) {
            saveBasementenTransaction(input, output, state.mode, keyUsed, null, true);
        }
        return;
    }
    
    // Avoid duplicate adjacent saves (e.g. if copy and auto-save trigger on same content)
    if (state.history.length > 0) {
        const last = state.history[0];
        if (last.input === input && last.output === output && last.cipher === state.cipher && last.mode === state.mode) {
            return;
        }
    }

    const newItem = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        cipher: state.cipher,
        mode: state.mode,
        input: input,
        output: output
    };

    // Prepend to list
    state.history.unshift(newItem);
    
    // Cap at 15 items
    if (state.history.length > 15) {
        state.history.pop();
    }

    localStorage.setItem('aegis_history', JSON.stringify(state.history));
    renderHistory();
}

/**
 * Draw history elements inside list panel
 */
export function renderHistory() {
    elements.historyItems.innerHTML = '';
    
    if (state.history.length === 0) {
        elements.historyItems.innerHTML = `
            <div class="placeholder-history">No history found. Transactions will be saved locally.</div>
        `;
        return;
    }

    state.history.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'history-item';

        const details = document.createElement('div');
        details.className = 'history-details';

        const meta = document.createElement('div');
        meta.className = 'history-meta';
        
        const badge = document.createElement('span');
        badge.className = `history-badge ${item.mode}`;
        badge.textContent = item.mode;

        const cipherName = document.createElement('span');
        cipherName.className = 'history-cipher-name';
        cipherName.textContent = getFriendlyCipherName(item.cipher);

        const time = document.createElement('span');
        time.className = 'history-time';
        time.textContent = formatTimestamp(item.timestamp);

        meta.appendChild(badge);
        meta.appendChild(cipherName);
        meta.appendChild(time);

        const io = document.createElement('div');
        io.className = 'history-io';
        io.innerHTML = `
            <span class="history-io-text" title="${escapeHtml(item.input)}">${escapeHtml(item.input)}</span>
            <i data-lucide="arrow-right"></i>
            <span class="history-io-text" title="${escapeHtml(item.output)}">${escapeHtml(item.output)}</span>
        `;

        details.appendChild(meta);
        details.appendChild(io);

        const actions = document.createElement('div');
        actions.className = 'history-actions';

        // Load item button
        const btnRestore = document.createElement('button');
        btnRestore.className = 'icon-btn';
        btnRestore.title = "Restore this transaction";
        btnRestore.innerHTML = `<i data-lucide="folder-input"></i>`;
        btnRestore.addEventListener('click', () => {
            // Restoring switches cipher outside the sidebar flow; make sure
            // leaving The Basementen through this path also locks it.
            if (state.cipher === 'basementen' && item.cipher !== 'basementen') {
                lockBasementenSession();
            }
            elements.textInput.value = item.input;
            state.cipher = item.cipher;
            state.mode = item.mode;
            saveConfigState();
            setupUIFromState();
            runConversion();
            // Scroll up to text area
            elements.textInput.scrollIntoView({ behavior: 'smooth' });
        });

        // Delete item button
        const btnDel = document.createElement('button');
        btnDel.className = 'icon-btn';
        btnDel.title = "Delete record";
        btnDel.innerHTML = `<i data-lucide="trash"></i>`;
        btnDel.addEventListener('click', () => {
            state.history = state.history.filter(h => h.id !== item.id);
            localStorage.setItem('aegis_history', JSON.stringify(state.history));
            renderHistory();
        });

        actions.appendChild(btnRestore);
        actions.appendChild(btnDel);

        itemDiv.appendChild(details);
        itemDiv.appendChild(actions);
        elements.historyItems.appendChild(itemDiv);
    });

    if (window.lucide) window.lucide.createIcons();
}

/**
 * Format a history timestamp for display. New entries store ISO strings
 * (date + time); entries saved before that change hold a bare time-of-day
 * string that doesn't parse as a Date, so it's shown as-is.
 */
export function formatTimestamp(ts) {
    const parsed = Date.parse(ts);
    if (isNaN(parsed)) return ts;
    return new Date(parsed).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' });
}


// Escape helper for HTML injection safety
function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

