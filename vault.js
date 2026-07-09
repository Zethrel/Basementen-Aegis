/**
 * Basementen Aegis - The Basementen Secure Cipher Core & Workflow
 * Vault/session management for the password-protected cipher: master
 * password setup/unlock, PBKDF2 key derivation, the encrypted transaction
 * log, and all Basementen-specific UI event handlers.
 */

import { elements } from './dom.js';
import { state, saveConfigState } from './state.js';
import { openModal, closeModal, registerModal, showToast, showConfirm } from './ui.js';
import { formatTimestamp, saveToHistory } from './history.js';
import { setupUIFromState, runConversion } from './app.js';

// In-memory vault session. Populated on unlock, cleared by
// lockBasementenSession(); nothing here ever touches localStorage.
export const vaultSession = {
    unlocked: false,
    key: '',            // active 40-char composition key (plaintext)
    txValid: false,     // transaction password verified for encode mode
    decryptedKey: null, // key recovered from a log entry in decode mode
    cryptoKey: null     // master-password-derived CryptoKey
};

// Lock the vault and clear every piece of key material held in memory.
// Must be called on ANY path that navigates away from The Basementen.
export function lockBasementenSession() {
    vaultSession.unlocked = false;
    vaultSession.key = '';
    vaultSession.cryptoKey = null;
    vaultSession.txValid = false;
    vaultSession.decryptedKey = null;
    autoSaveDraftId = null;
    autoSaveDraftContent = null;
    masterCheckCache = { pwd: null, isMaster: false };
    elements.basementenKeyStatus.textContent = 'Locked [Requires Verification]';
    elements.basementenKeyStatus.classList.add('locked');
}

// Hex conversion helpers
function bufToHex(buf) {
    return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function hexToBuf(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes.buffer;
}

/* --------------------------------------------------------------------------
   Password key derivation.

   New material uses Argon2id (memory-hard, via the vendored WASM build in
   argon2-worker.js). PBKDF2 remains as a decrypt-only legacy path: the
   master blob migrates to Argon2id on the next successful unlock, but old
   log entries can never be re-encrypted (each has its own password), so
   their stored `kdf` field keeps them decryptable forever.
   -------------------------------------------------------------------------- */

// RFC 9106 / OWASP-recommended strength: 64 MiB memory, 3 passes.
// If these ever change, introduce a new kdf tag (e.g. 'argon2id-v2') —
// existing blobs are bound to the parameters they were created with.
const ARGON2_PARAMS = { time: 3, mem: 65536, parallelism: 1, hashLen: 32 };

const KDF_STORAGE_KEY = 'basementen_kdf';

// Lazy singleton worker; requests are matched to responses by id.
let argon2Worker = null;
let argon2Seq = 0;
const argon2Pending = new Map();

function getArgon2Worker() {
    if (!argon2Worker) {
        argon2Worker = new Worker('argon2-worker.js');
        argon2Worker.onmessage = (e) => {
            const { id, hash, error } = e.data;
            const pending = argon2Pending.get(id);
            if (!pending) return;
            argon2Pending.delete(id);
            if (error) {
                pending.reject(new Error(error));
            } else {
                pending.resolve(hash);
            }
        };
    }
    return argon2Worker;
}

function argon2idHash(password, salt) {
    return new Promise((resolve, reject) => {
        const id = ++argon2Seq;
        argon2Pending.set(id, { resolve, reject });
        getArgon2Worker().postMessage({ id, pass: password, salt, ...ARGON2_PARAMS });
    });
}

// Decrypt-only legacy derivation for vaults created before the Argon2id switch.
async function deriveKeyPbkdf2(password, salt) {
    const baseKey = await window.crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits", "deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: salt, iterations: 600000, hash: "SHA-256" },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

// Derive an AES-GCM 256-bit key from a password. `kdf` selects the scheme
// the target blob was encrypted with; new encryptions always use the default.
async function deriveKeyFromPassword(password, salt, kdf = 'argon2id') {
    if (kdf === 'pbkdf2') {
        return deriveKeyPbkdf2(password, salt);
    }
    const hash = await argon2idHash(password, salt);
    return window.crypto.subtle.importKey(
        'raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
    );
}

// KDF the master blob (basementen_encrypted_key) is currently bound to.
function masterBlobKdf() {
    return localStorage.getItem(KDF_STORAGE_KEY) || 'pbkdf2';
}

// Generate secure random key (40 chars from 92-char printable pool for >256 bits entropy)
function generate256BitKey() {
    const pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?\u00e6\u00f8\u00e5\u00c6\u00d8\u00c5";
    const KEY_LENGTH = 40;
    // Rejection sampling: bytes >= this limit are discarded so every pool
    // character is equally likely (256 % pool.length !== 0 would otherwise
    // bias the first few characters of the pool).
    const maxUnbiased = 256 - (256 % pool.length);
    let key = '';
    while (key.length < KEY_LENGTH) {
        const randomBytes = new Uint8Array(KEY_LENGTH);
        window.crypto.getRandomValues(randomBytes);
        for (const byte of randomBytes) {
            if (byte < maxUnbiased && key.length < KEY_LENGTH) {
                key += pool[byte % pool.length];
            }
        }
    }
    return key;
}

// Verify if a password matches the master password
async function isMasterPassword(pwd) {
    const saltHex = localStorage.getItem('basementen_salt');
    const ivHex = localStorage.getItem('basementen_iv');
    const encryptedHex = localStorage.getItem('basementen_encrypted_key');
    if (!saltHex || !ivHex || !encryptedHex) return false;
    try {
        const salt = new Uint8Array(hexToBuf(saltHex));
        const iv = new Uint8Array(hexToBuf(ivHex));
        const ciphertext = hexToBuf(encryptedHex);
        const aesKey = await deriveKeyFromPassword(pwd, salt, masterBlobKdf());
        await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, ciphertext);
        return true;
    } catch (e) {
        return false;
    }
}

// Search database to find log entry that decrypts with this password
async function searchHistoryByPassword(pwd) {
    let history = [];
    const saved = localStorage.getItem('basementen_history');
    if (saved) {
        try {
            history = JSON.parse(saved);
        } catch (e) {}
    }
    
    for (const item of history) {
        try {
            const salt = new Uint8Array(hexToBuf(item.salt));
            const iv = new Uint8Array(hexToBuf(item.iv));
            const ciphertext = hexToBuf(item.encryptedPayload);
            const aesKey = await deriveKeyFromPassword(pwd, salt, item.kdf || 'pbkdf2');
            const decrypted = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv },
                aesKey,
                ciphertext
            );
            const payload = JSON.parse(new TextDecoder().decode(decrypted));
            return { item, decryptedKey: payload.key };
        } catch (e) {
            // Decryption failed for this item, continue to next
        }
    }
    return null;
}

// Auto-save draft tracking: successive auto-saves of the same composition
// session overwrite one vault entry instead of stacking a new encrypted
// entry per typing pause (which used to evict real transactions from the
// 20-entry log).
let autoSaveDraftId = null;
let autoSaveDraftContent = null;

// Cache the last master-password comparison so repeated saves with the same
// transaction password don't redo the 600k-iteration PBKDF2 derivation.
let masterCheckCache = { pwd: null, isMaster: false };

async function isMasterPasswordCached(pwd) {
    if (masterCheckCache.pwd === pwd) return masterCheckCache.isMaster;
    const isMaster = await isMasterPassword(pwd);
    masterCheckCache = { pwd, isMaster };
    return isMaster;
}

// Save transaction securely inside vault separate from general history log
export async function saveBasementenTransaction(input, output, mode, keyUsed, customName, isAutoSave = false) {
    const txPwd = elements.basementenTxPassword.value;
    if (!txPwd) {
        elements.basementenTxError.textContent = "Transaction not saved: Set a password to encrypt in vault.";
        elements.basementenTxError.style.color = '#f59e0b';
        return false;
    }

    if (txPwd.length < 10) {
        elements.basementenTxError.textContent = "Transaction not saved: Password must be at least 10 characters.";
        elements.basementenTxError.style.color = '#ef4444';
        return false;
    }

    const draftContent = `${mode}\n${txPwd}\n${input}\n${output}`;
    if (isAutoSave && draftContent === autoSaveDraftContent) {
        return true; // Nothing changed since the last auto-save.
    }

    const isMaster = await isMasterPasswordCached(txPwd);
    if (isMaster) {
        elements.basementenTxError.textContent = "Transaction not saved: Cannot match master password.";
        elements.basementenTxError.style.color = '#ef4444';
        return false;
    }

    try {
        elements.basementenTxError.textContent = "";

        // Encrypt the entire transaction payload (keyword + plaintext input/output) using
        // the transaction password. Nothing sensitive is stored outside this ciphertext.
        const txSalt = window.crypto.getRandomValues(new Uint8Array(16));
        const txIv = window.crypto.getRandomValues(new Uint8Array(12));
        const txAesKey = await deriveKeyFromPassword(txPwd, txSalt);

        const payload = JSON.stringify({ key: keyUsed, input, output });
        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: txIv },
            txAesKey,
            new TextEncoder().encode(payload)
        );

        let history = [];
        const saved = localStorage.getItem('basementen_history');
        if (saved) {
            try {
                history = JSON.parse(saved);
            } catch(e) {}
        }

        const newItem = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            name: customName || "Unnamed Transaction",
            mode: mode,
            kdf: 'argon2id',
            encryptedPayload: bufToHex(encrypted),
            salt: bufToHex(txSalt),
            iv: bufToHex(txIv)
        };

        if (history.length > 0 && history[0].id === autoSaveDraftId) {
            // Same composition session: overwrite the previous draft entry.
            // This also lets an explicit save absorb its own auto-saved draft.
            history[0] = newItem;
        } else {
            history.unshift(newItem);
            if (history.length > 20) {
                history.pop();
            }
        }

        if (isAutoSave) {
            autoSaveDraftId = newItem.id;
            autoSaveDraftContent = draftContent;
        } else {
            // An explicit save finalizes the session; the next auto-save
            // starts a fresh draft entry.
            autoSaveDraftId = null;
            autoSaveDraftContent = null;
        }

        localStorage.setItem('basementen_history', JSON.stringify(history));
        return true;
    } catch (err) {
        console.error("Error saving transaction to vault", err);
        return false;
    }
}

// Render secure key & transaction log
function renderBasementenLog() {
    elements.basementenLogRows.innerHTML = '';
    let history = [];
    const saved = localStorage.getItem('basementen_history');
    if (saved) {
        try {
            history = JSON.parse(saved);
        } catch (e) {}
    }
    if (history.length === 0) {
        elements.basementenLogRows.innerHTML = `
            <tr>
                <td colspan="4" class="log-empty">No transaction logs found.</td>
            </tr>
        `;
        return;
    }
    history.forEach(item => {
        const tr = document.createElement('tr');

        const tdTime = document.createElement('td');
        tdTime.textContent = formatTimestamp(item.timestamp);

        const tdName = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = `history-badge ${item.mode}`;
        badge.textContent = item.mode;
        tdName.appendChild(badge);
        const nameText = document.createTextNode(' ' + (item.name || 'Unnamed Transaction'));
        tdName.appendChild(nameText);

        const tdOutput = document.createElement('td');
        tdOutput.className = 'io-cell';
        const revealOutputBtn = document.createElement('span');
        revealOutputBtn.className = 'reveal-link';
        revealOutputBtn.textContent = "[Locked - Click to Reveal]";
        revealOutputBtn.addEventListener('click', () => {
            promptRevealPlaintext(item, tdOutput, 'output');
        });
        tdOutput.appendChild(revealOutputBtn);

        const tdKey = document.createElement('td');
        tdKey.className = 'key-cell';

        const revealBtn = document.createElement('span');
        revealBtn.className = 'reveal-link';
        revealBtn.textContent = "[Locked - Click to Reveal]";
        revealBtn.addEventListener('click', () => {
            promptRevealKey(item, tdKey);
        });
        tdKey.appendChild(revealBtn);

        tr.appendChild(tdTime);
        tr.appendChild(tdName);
        tr.appendChild(tdOutput);
        tr.appendChild(tdKey);
        elements.basementenLogRows.appendChild(tr);
    });
}

// Prompt and verify password to reveal a locked transaction key
function promptRevealKey(item, tdKey) {
    elements.basementenRevealModalTitle.textContent = "Reveal Secure Key";
    elements.basementenRevealModalDesc.textContent = "Please enter the unique Transaction Password for this log entry to decrypt and reveal the key.";
    openModal(elements.basementenRevealKeyModal);
    elements.basementenRevealKeyPwdInput.value = '';
    elements.basementenRevealKeyError.textContent = '';
    elements.basementenRevealKeyPwdInput.focus();

    elements.basementenRevealKeyForm.onsubmit = async (e) => {
        e.preventDefault();
        const pwd = elements.basementenRevealKeyPwdInput.value;
        try {
            const salt = new Uint8Array(hexToBuf(item.salt));
            const iv = new Uint8Array(hexToBuf(item.iv));
            const ciphertext = hexToBuf(item.encryptedPayload);

            const aesKey = await deriveKeyFromPassword(pwd, salt, item.kdf || 'pbkdf2');
            const decrypted = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                aesKey,
                ciphertext
            );

            const payload = JSON.parse(new TextDecoder().decode(decrypted));
            tdKey.innerHTML = '';
            tdKey.textContent = payload.key;
            tdKey.classList.add('revealed');

            closeModal(elements.basementenRevealKeyModal);
        } catch (err) {
            console.error(err);
            elements.basementenRevealKeyError.textContent = "Incorrect password. Key decryption failed.";
        }
    };
}

// Prompt and verify password to reveal a locked plaintext input/output
function promptRevealPlaintext(item, cell, field) {
    elements.basementenRevealModalTitle.textContent = "Reveal Plaintext Content";
    elements.basementenRevealModalDesc.textContent = "Please enter the unique Transaction Password for this log entry to decrypt and reveal the secret plaintext.";
    openModal(elements.basementenRevealKeyModal);
    elements.basementenRevealKeyPwdInput.value = '';
    elements.basementenRevealKeyError.textContent = '';
    elements.basementenRevealKeyPwdInput.focus();

    elements.basementenRevealKeyForm.onsubmit = async (e) => {
        e.preventDefault();
        const pwd = elements.basementenRevealKeyPwdInput.value;
        try {
            const salt = new Uint8Array(hexToBuf(item.salt));
            const iv = new Uint8Array(hexToBuf(item.iv));
            const ciphertext = hexToBuf(item.encryptedPayload);

            const aesKey = await deriveKeyFromPassword(pwd, salt, item.kdf || 'pbkdf2');
            const decrypted = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                aesKey,
                ciphertext
            );

            // Decryption succeeded! Reveal the requested plaintext field
            const payload = JSON.parse(new TextDecoder().decode(decrypted));
            const val = field === 'input' ? payload.input : payload.output;
            cell.innerHTML = '';
            cell.textContent = val;
            cell.title = val;
            cell.classList.add('revealed');

            closeModal(elements.basementenRevealKeyModal);
        } catch (err) {
            console.error(err);
            elements.basementenRevealKeyError.textContent = "Incorrect password. Verification failed.";
        }
    };
}

// Reveal Key Modal close listeners
elements.basementenRevealKeyClose.addEventListener('click', () => {
    closeModal(elements.basementenRevealKeyModal);
});
elements.basementenRevealKeyCancel.addEventListener('click', () => {
    closeModal(elements.basementenRevealKeyModal);
});

// Access controller flow
export async function handleBasementenAccess(previousCipher) {
    const hasKey = localStorage.getItem('basementen_encrypted_key');
    if (!hasKey) {
        showBasementenSetup(previousCipher);
    } else {
        if (!vaultSession.unlocked) {
            showBasementenUnlock(previousCipher);
        } else {
            // Already unlocked in session
            elements.basementenKeyStatus.textContent = 'Active [Secure 256-bit]';
            elements.basementenKeyStatus.classList.remove('locked');
            saveConfigState();
            setupUIFromState();
            runConversion();
        }
    }
}

// Simple, dependency-free heuristic password strength scorer (length + character-class
// variety only, not a real entropy estimate) - just nudges toward a stronger master
// password in the UI. The actual security boundary is the minimum-length check and PBKDF2.
function scorePasswordStrength(password) {
    if (password.length < 10) {
        return { percent: 20, label: 'Too short (min 10)', color: 'var(--color-danger)' };
    }

    let classes = 0;
    if (/[a-z]/.test(password)) classes++;
    if (/[A-Z]/.test(password)) classes++;
    if (/[0-9]/.test(password)) classes++;
    if (/[^A-Za-z0-9]/.test(password)) classes++;

    let score = classes;
    if (password.length >= 14) score++;
    if (password.length >= 20) score++;

    if (score <= 2) return { percent: 40, label: 'Weak', color: 'var(--color-danger)' };
    if (score === 3) return { percent: 60, label: 'Fair', color: 'var(--color-warning)' };
    if (score === 4) return { percent: 80, label: 'Good', color: '#84cc16' };
    return { percent: 100, label: 'Strong', color: 'var(--color-success)' };
}

function updatePasswordStrengthMeter(password) {
    if (!password) {
        elements.basementenPwdStrengthBar.style.width = '0%';
        elements.basementenPwdStrengthLabel.textContent = ' ';
        return;
    }
    const { percent, label, color } = scorePasswordStrength(password);
    elements.basementenPwdStrengthBar.style.width = `${percent}%`;
    elements.basementenPwdStrengthBar.style.background = color;
    elements.basementenPwdStrengthLabel.textContent = label;
}

// Wipe all Basementen state (master password, generated key, transaction history) from
// localStorage and fall back to a plain cipher. Used both by the always-available "Wipe &
// Reset" button and by the "Forgot your password?" recovery link in the unlock modal, since
// that's the only reachable escape hatch when someone can't remember their master password.
// Irreversible, so the confirm requires typing WIPE before it unlocks.
// Resolves true if the user confirmed and the wipe happened, false if they backed out.
async function wipeBasementenWorkspace(confirmMessage) {
    const ok = await showConfirm({
        title: 'Wipe & Reset The Basementen',
        message: confirmMessage,
        confirmLabel: 'Wipe Everything',
        danger: true,
        typePhrase: 'WIPE'
    });
    if (!ok) {
        return false;
    }

    localStorage.removeItem('basementen_encrypted_key');
    localStorage.removeItem('basementen_salt');
    localStorage.removeItem('basementen_iv');
    localStorage.removeItem('basementen_history');
    localStorage.removeItem(KDF_STORAGE_KEY);
    lockBasementenSession();

    state.cipher = 'caesar';
    saveConfigState();
    setupUIFromState();
    runConversion();
    return true;
}

// 10-second countdown security warning and setup form
function showBasementenSetup(previousCipher) {
    openModal(elements.basementenSetupModal);

    // Reset timer state
    let count = 10;
    const timerSpan = document.getElementById('setup-timer-val');
    const container = document.getElementById('setup-countdown-container');
    const form = elements.basementenSetupForm;

    timerSpan.textContent = count;
    container.style.display = 'block';
    form.style.opacity = '0.4';
    form.style.pointerEvents = 'none';
    elements.basementenSetupPwdInput.disabled = true;
    elements.basementenSetupConfirmInput.disabled = true;
    elements.basementenSetupSubmit.disabled = true;

    // Reset and wire up the live password strength meter
    elements.basementenSetupError.textContent = '';
    updatePasswordStrengthMeter('');
    elements.basementenSetupPwdInput.oninput = (e) => {
        updatePasswordStrengthMeter(e.target.value);
    };

    const interval = setInterval(() => {
        count--;
        timerSpan.textContent = count;
        if (count <= 0) {
            clearInterval(interval);
            container.style.display = 'none';
            form.style.opacity = '1';
            form.style.pointerEvents = 'auto';
            elements.basementenSetupPwdInput.disabled = false;
            elements.basementenSetupConfirmInput.disabled = false;
            elements.basementenSetupSubmit.disabled = false;
        }
    }, 1000);

    // Cancel (header X, Escape, or overlay click): abort setup and go back
    // to whatever cipher was active before The Basementen was selected.
    elements.basementenSetupCancel.onclick = () => {
        clearInterval(interval);
        elements.basementenSetupPwdInput.value = '';
        elements.basementenSetupConfirmInput.value = '';
        closeModal(elements.basementenSetupModal);
        state.cipher = previousCipher || 'caesar';
        saveConfigState();
        setupUIFromState();
        runConversion();
    };

    // Form submit listener
    form.onsubmit = async (e) => {
        e.preventDefault();
        elements.basementenSetupError.textContent = '';
        const password = elements.basementenSetupPwdInput.value;
        const confirm = elements.basementenSetupConfirmInput.value;

        if (password.length < 10) {
            elements.basementenSetupError.textContent = 'Password must be at least 10 characters.';
            return;
        }
        if (password !== confirm) {
            elements.basementenSetupError.textContent = 'Passwords do not match.';
            return;
        }

        try {
            // Generate a secure salt & AES key
            const salt = window.crypto.getRandomValues(new Uint8Array(16));
            const aesKey = await deriveKeyFromPassword(password, salt);

            // Generate initial random key
            const newKey = generate256BitKey();
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            
            // Encrypt key using derived AES Key
            const encrypted = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                aesKey,
                new TextEncoder().encode(newKey)
            );

            // Save credentials
            localStorage.setItem('basementen_salt', bufToHex(salt));
            localStorage.setItem('basementen_iv', bufToHex(iv));
            localStorage.setItem('basementen_encrypted_key', bufToHex(encrypted));
            localStorage.setItem(KDF_STORAGE_KEY, 'argon2id');

            // Set session state
            vaultSession.unlocked = true;
            vaultSession.key = newKey;
            vaultSession.cryptoKey = aesKey;
            // A master password now exists; drop any "not the master password"
            // verdicts cached from before it was set.
            masterCheckCache = { pwd: null, isMaster: false };

            // Update UI status
            elements.basementenKeyStatus.textContent = 'Active [Secure 256-bit]';
            elements.basementenKeyStatus.classList.remove('locked');

            // Clean inputs
            elements.basementenSetupPwdInput.value = '';
            elements.basementenSetupConfirmInput.value = '';
            
            closeModal(elements.basementenSetupModal);
            saveConfigState();
            setupUIFromState();
            runConversion();
            showToast('Master password saved and 256-bit keyword generated.', 'success');
        } catch (err) {
            console.error(err);
            showToast('Error setting up encryption key: ' + err.message, 'error', 6000);
        }
    };
}

// Re-encrypt the master key blob under an Argon2id-derived key (fresh salt
// and IV) and record the new KDF. Points vaultSession.cryptoKey at the new
// key so later re-encryptions (e.g. "Generate New Key") match the stored
// salt. Old log entries are untouched — their passwords aren't known here.
async function migrateMasterBlobToArgon2id(password, keyString) {
    try {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const aesKey = await deriveKeyFromPassword(password, salt, 'argon2id');
        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            aesKey,
            new TextEncoder().encode(keyString)
        );
        localStorage.setItem('basementen_salt', bufToHex(salt));
        localStorage.setItem('basementen_iv', bufToHex(iv));
        localStorage.setItem('basementen_encrypted_key', bufToHex(encrypted));
        localStorage.setItem(KDF_STORAGE_KEY, 'argon2id');
        vaultSession.cryptoKey = aesKey;
        // The master password's KDF changed, so cached comparisons are stale.
        masterCheckCache = { pwd: null, isMaster: false };
    } catch (err) {
        console.error('Argon2id master blob migration failed; keeping PBKDF2 blob for now.', err);
    }
}

// Unlock with master password verification
function showBasementenUnlock(previousCipher) {
    openModal(elements.basementenUnlockModal);
    elements.basementenUnlockPwdInput.value = '';
    elements.basementenUnlockError.textContent = '';
    elements.basementenUnlockPwdInput.focus();

    // Cancel lock: revert back to previous cipher
    elements.basementenUnlockCancel.onclick = () => {
        closeModal(elements.basementenUnlockModal);
        state.cipher = previousCipher || 'caesar';
        saveConfigState();
        setupUIFromState();
        runConversion();
    };

    // Forgotten password: this modal is the only place someone locked out can reach a reset,
    // since the normal "Wipe & Reset" button lives behind the very unlock screen they're stuck on.
    elements.basementenUnlockForgot.onclick = async () => {
        if (await wipeBasementenWorkspace("This will permanently erase your master password, generated key, and all saved transaction history for The Basementen. This cannot be undone.")) {
            closeModal(elements.basementenUnlockModal);
            showToast('The Basementen workspace has been wiped. Select the cipher again to set a new master password.', 'success', 5000);
        }
    };

    elements.basementenUnlockForm.onsubmit = async (e) => {
        e.preventDefault();
        const password = elements.basementenUnlockPwdInput.value;
        
        const saltHex = localStorage.getItem('basementen_salt');
        const ivHex = localStorage.getItem('basementen_iv');
        const encryptedHex = localStorage.getItem('basementen_encrypted_key');

        if (!saltHex || !ivHex || !encryptedHex) {
            elements.basementenUnlockError.textContent = "Error: System key missing. Please reset.";
            return;
        }

        try {
            const salt = new Uint8Array(hexToBuf(saltHex));
            const iv = new Uint8Array(hexToBuf(ivHex));
            const ciphertext = hexToBuf(encryptedHex);

            // Derive key with whatever KDF the stored blob was created under
            const kdf = masterBlobKdf();
            const aesKey = await deriveKeyFromPassword(password, salt, kdf);

            // Try to decrypt
            const decrypted = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                aesKey,
                ciphertext
            );

            // Successfully unlocked
            vaultSession.unlocked = true;
            vaultSession.key = new TextDecoder().decode(decrypted);
            vaultSession.cryptoKey = aesKey;

            // Legacy vault: upgrade the master blob to Argon2id now that the
            // password is known. On failure the PBKDF2 blob stays valid, so
            // the upgrade simply retries on a future unlock.
            if (kdf !== 'argon2id') {
                await migrateMasterBlobToArgon2id(password, vaultSession.key);
            }

            elements.basementenKeyStatus.textContent = 'Active [Secure 256-bit]';
            elements.basementenKeyStatus.classList.remove('locked');

            closeModal(elements.basementenUnlockModal);
            saveConfigState();
            setupUIFromState();
            runConversion();
        } catch (err) {
            console.error(err);
            elements.basementenUnlockError.textContent = "Incorrect password. Please try again.";
        }
    };
}

/**
 * Basementen-specific event listeners and modal registrations, bound once
 * from bindEvents() in app.js. Called between the mobile modal and confirm
 * modal registrations so modal stacking order is preserved.
 */
export function bindVaultEvents() {
    // The reveal modal opens on top of the log modal, so it registers after
    // it and wins the Escape key while visible.
    registerModal(elements.basementenSetupModal, () => elements.basementenSetupCancel.click());
    registerModal(elements.basementenUnlockModal, () => elements.basementenUnlockCancel.click());
    registerModal(elements.basementenLogModal, () => closeModal(elements.basementenLogModal));
    registerModal(elements.basementenRevealKeyModal, () => closeModal(elements.basementenRevealKeyModal));

    // Basementen Event Listeners
    elements.basementenGenKey.addEventListener('click', async () => {
        if (!vaultSession.unlocked || !vaultSession.cryptoKey) return;
        const ok = await showConfirm({
            title: 'Generate New Key',
            message: 'This will replace the active 256-bit key. New transactions will use the new key; previously saved transactions stay decryptable through the key log.',
            confirmLabel: 'Generate'
        });
        if (!ok) return;

        const newKey = generate256BitKey();
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            vaultSession.cryptoKey,
            new TextEncoder().encode(newKey)
        );
        localStorage.setItem('basementen_iv', bufToHex(iv));
        localStorage.setItem('basementen_encrypted_key', bufToHex(encrypted));
        vaultSession.key = newKey;
        elements.basementenKeyStatus.textContent = 'Active [Secure 256-bit]';
        elements.basementenKeyStatus.classList.remove('locked');
        showToast('New 256-bit key generated and encrypted.', 'success');
        runConversion();
    });

    elements.basementenViewLog.addEventListener('click', () => {
        if (!vaultSession.unlocked) return;
        renderBasementenLog();
        openModal(elements.basementenLogModal);
        if (window.lucide) window.lucide.createIcons();
    });

    elements.basementenResetPwd.addEventListener('click', async () => {
        if (await wipeBasementenWorkspace("This will permanently erase all transaction history, generated keys, and the master password for The Basementen. This cannot be undone.")) {
            showToast('The Basementen workspace has been fully wiped and reset.', 'success');
        }
    });

    elements.basementenLogClose.addEventListener('click', () => {
        closeModal(elements.basementenLogModal);
    });

    elements.basementenLogOk.addEventListener('click', () => {
        closeModal(elements.basementenLogModal);
    });

    elements.basementenClearLog.addEventListener('click', async () => {
        const ok = await showConfirm({
            title: 'Clear Log History',
            message: 'This permanently deletes every saved transaction and its encrypted key. Any ciphertext whose key only exists in this log becomes undecryptable. This cannot be undone.',
            confirmLabel: 'Clear Log',
            danger: true,
            typePhrase: 'CLEAR'
        });
        if (!ok) return;
        localStorage.removeItem('basementen_history');
        renderBasementenLog();
        showToast('Basementen transaction log cleared.', 'success');
    });

    // Dynamic validation & password-first lock handlers for the Transaction Password field.
    // Cheap checks (empty/length) run on every keystroke, but the PBKDF2-based checks
    // (600k iterations each) are debounced so they only run after typing pauses —
    // previously they ran per keystroke and could freeze the UI on slower machines.
    let txPasswordDebounce = null;
    const TX_PASSWORD_DEBOUNCE_MS = 400;

    const lockCompositionPanel = (placeholder) => {
        elements.textInput.disabled = true;
        elements.textInput.value = '';
        elements.textInput.placeholder = placeholder;
    };

    // "Verifying password…" indicator for the debounced PBKDF2 checks below.
    const setTxVerifying = (busy) => {
        elements.basementenTxVerifying.classList.toggle('hidden', !busy);
    };

    elements.basementenTxPassword.addEventListener('input', (e) => {
        const pwd = e.target.value;
        elements.basementenTxError.textContent = '';
        elements.basementenTxError.style.color = '#ef4444';
        setTxVerifying(false);
        if (txPasswordDebounce) clearTimeout(txPasswordDebounce);

        if (state.mode === 'encode') {
            if (!pwd) {
                vaultSession.txValid = false;
                lockCompositionPanel("Please enter a unique Transaction Password in the control panel to unlock composition...");
                return;
            }

            if (pwd.length < 10) {
                elements.basementenTxError.textContent = 'Password must be at least 10 characters.';
                vaultSession.txValid = false;
                lockCompositionPanel("Please enter a unique Transaction Password in the control panel to unlock composition...");
                return;
            }

            setTxVerifying(true);
            txPasswordDebounce = setTimeout(async () => {
                const isMaster = await isMasterPasswordCached(pwd);
                // Ignore stale results if the field changed while deriving
                // (the newer input event re-armed the indicator and timer).
                if (elements.basementenTxPassword.value !== pwd) return;
                setTxVerifying(false);

                if (isMaster) {
                    elements.basementenTxError.textContent = 'Transaction password cannot be the same as the master password.';
                    vaultSession.txValid = false;
                    lockCompositionPanel("Please enter a unique Transaction Password in the control panel to unlock composition...");
                    return;
                }

                vaultSession.txValid = true;
                elements.textInput.disabled = false;
                elements.textInput.placeholder = "Type or paste your text here...";
            }, TX_PASSWORD_DEBOUNCE_MS);
        } else {
            // Decode mode: find log entry by password first
            if (!pwd) {
                vaultSession.decryptedKey = null;
                lockCompositionPanel("Please enter the Transaction Password in the control panel to load the key...");
                elements.basementenAutoRecognizePanel.classList.add('hidden');
                return;
            }

            setTxVerifying(true);
            txPasswordDebounce = setTimeout(() => runDecodePasswordSearch(pwd), TX_PASSWORD_DEBOUNCE_MS);
        }
    });

    // Debounced decode-mode lookup: try the password against each vault entry
    // (one PBKDF2 derivation per entry, so never run this per keystroke).
    async function runDecodePasswordSearch(pwd) {
        const matched = await searchHistoryByPassword(pwd);
        // Ignore stale results if the field changed while deriving
        // (the newer input event re-armed the indicator and timer).
        if (elements.basementenTxPassword.value !== pwd) return;
        setTxVerifying(false);

        if (matched) {
            vaultSession.decryptedKey = matched.decryptedKey;
            elements.textInput.disabled = false;
            elements.textInput.placeholder = "Enter ciphertext to decrypt...";

            elements.basementenAutoRecognizePanel.classList.remove('hidden', 'danger');
            elements.basementenAutoRecognizePanel.classList.add('success');
            elements.basementenAutoStatusTitle.innerHTML = `<i data-lucide="check-circle"></i> Key Recovered Successfully`;
            elements.basementenAutoStatusDesc.textContent = `Found matching log entry from ${formatTimestamp(matched.item.timestamp)}. Ready to decrypt.`;
            if (window.lucide) window.lucide.createIcons();

            runConversion();
        } else {
            vaultSession.decryptedKey = null;
            elements.textInput.disabled = true;
            elements.textInput.value = '';
            elements.textInput.placeholder = "Please enter the Transaction Password in the control panel to load the key...";

            elements.basementenAutoRecognizePanel.classList.remove('hidden', 'success');
            elements.basementenAutoRecognizePanel.classList.add('danger');
            elements.basementenAutoStatusTitle.innerHTML = `<i data-lucide="x-circle"></i> Key Not Found`;
            elements.basementenAutoStatusDesc.textContent = "No matching transaction log found for this password.";
            if (window.lucide) window.lucide.createIcons();
        }
    }

    // Save transaction button click handler
    elements.basementenSaveTx.addEventListener('click', async () => {
        const inputVal = elements.textInput.value;
        const outputVal = elements.textOutput.value;
        const txName = elements.basementenTxName.value.trim();

        if (!vaultSession.unlocked) {
            showToast('Master password must be entered first.', 'error');
            return;
        }

        if (!inputVal || !outputVal || outputVal.startsWith('[LOCKED') || outputVal.startsWith('LOCKED:')) {
            showToast('Compose some plaintext and perform encoding first to generate output.', 'warning');
            return;
        }

        const success = await saveBasementenTransaction(inputVal, outputVal, 'encode', vaultSession.key, txName);
        if (success) {
            navigator.clipboard.writeText(outputVal).then(() => {
                showToast('Transaction saved to vault log and ciphertext copied to clipboard.', 'success');
            }).catch(err => {
                console.error("Clipboard copy failed on save", err);
                showToast('Transaction saved to vault log.', 'success');
            }).finally(() => {
                // Clear and reset all fields
                elements.textInput.value = '';
                elements.textOutput.value = '';
                elements.basementenTxName.value = '';
                elements.basementenTxPassword.value = '';
                
                // Invalidate TX password state to lock composition panel
                vaultSession.txValid = false;
                
                // Update labels, disabled states, and render logs
                setupUIFromState();
                renderBasementenLog();
            });
        }
    });

    // Copy encoded output button click handler
    elements.basementenCopyOutput.addEventListener('click', () => {
        const val = elements.textOutput.value;
        if (!val || val.startsWith('[LOCKED') || val.startsWith('LOCKED:')) {
            showToast('Nothing to copy or workspace is locked.', 'warning');
            return;
        }
        navigator.clipboard.writeText(val).then(() => {
            showToast('Encoded ciphertext copied to clipboard.', 'success');
            // Auto save to history when explicitly copied
            saveToHistory(elements.textInput.value, val);
        }).catch(err => {
            console.error("Clipboard copy failed", err);
        });
    });
}
