/**
 * Starlight Cipher Suite - App Controller
 */

import {
    Caesar,
    Rot13,
    Atbash,
    Vigenere,
    RailFence,
    BinaryConverter,
    A1z26,
    BinaryReverse,
    ScandiCaesar,
    Basementen
} from './ciphers.js';

// Application State
const state = {
    cipher: 'caesar',
    mode: 'encode',
    retainPunctuation: true,
    showProcess: true,
    history: []
};

// Basementen Session State
let basementenUnlocked = false;
let basementenKey = '';
let basementenTxValid = false;
let basementenDecryptedKey = null;

// DOM Elements
const elements = {
    // Navigation (assigned in init() after renderCipherNav() generates the buttons)
    cipherBtns: null,
    // Modes
    modeSelector: document.querySelector('.mode-selector'),
    modeEncode: document.getElementById('mode-encode'),
    modeDecode: document.getElementById('mode-decode'),
    // Option Toggles
    optPunctuation: document.getElementById('option-punctuation'),
    optProcess: document.getElementById('option-process'),
    processSection: document.getElementById('process-section'),
    // Inputs & Parameters (param-group panels are looked up by id via the registry)
    caesarShift: document.getElementById('caesar-shift'),
    shiftValue: document.getElementById('shift-value'),
    caesarShiftDown: document.getElementById('caesar-shift-down'),
    caesarShiftUp: document.getElementById('caesar-shift-up'),
    scandicaesarShift: document.getElementById('scandicaesar-shift'),
    scandicaesarShiftValue: document.getElementById('scandicaesar-shift-value'),
    scandicaesarShiftDown: document.getElementById('scandicaesar-shift-down'),
    scandicaesarShiftUp: document.getElementById('scandicaesar-shift-up'),
    scandicaesarLang: document.getElementById('scandicaesar-lang'),
    vigenereKey: document.getElementById('vigenere-key'),
    vigenereError: document.getElementById('vigenere-error'),
    railfenceRails: document.getElementById('railfence-rails'),
    railfenceError: document.getElementById('railfence-error'),
    
    btnShuffleOutput: document.getElementById('btn-shuffle-output'),
    
    textInput: document.getElementById('text-input'),
    textOutput: document.getElementById('text-output'),
    inputStats: document.getElementById('input-stats'),
    outputStats: document.getElementById('output-stats'),
    
    // Header & Actions
    installBtn: document.getElementById('install-btn'),
    connectionStatus: document.getElementById('connection-status'),
    connectionText: document.getElementById('connection-text'),
    
    btnPaste: document.getElementById('btn-paste'),
    btnClear: document.getElementById('btn-clear'),
    btnCopy: document.getElementById('btn-copy'),
    
    // Process & History
    processLog: document.getElementById('process-log'),
    historyItems: document.getElementById('history-items'),
    btnClearHistory: document.getElementById('btn-clear-history'),
    
    // Mobile Modal
    mobileBtn: document.getElementById('mobile-btn'),
    mobileModal: document.getElementById('mobile-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    qrImage: document.getElementById('qr-image'),
    qrUrlText: document.getElementById('qr-url-text'),

    // Basementen elements
    basementenGenKey: document.getElementById('basementen-gen-key'),
    basementenViewLog: document.getElementById('basementen-view-log'),
    basementenResetPwd: document.getElementById('basementen-reset-pwd'),
    basementenKeyStatus: document.getElementById('basementen-key-status'),
    basementenSetupModal: document.getElementById('basementen-setup-modal'),
    basementenSetupForm: document.getElementById('basementen-setup-form'),
    basementenSetupPwdInput: document.getElementById('basementen-setup-pwd-input'),
    basementenSetupConfirmInput: document.getElementById('basementen-setup-confirm-input'),
    basementenPwdStrengthBar: document.getElementById('basementen-pwd-strength-bar'),
    basementenPwdStrengthLabel: document.getElementById('basementen-pwd-strength-label'),
    basementenSetupSubmit: document.getElementById('basementen-setup-submit'),
    basementenSetupCancel: document.getElementById('basementen-setup-cancel'),
    basementenUnlockModal: document.getElementById('basementen-unlock-modal'),
    basementenUnlockForm: document.getElementById('basementen-unlock-form'),
    basementenUnlockPwdInput: document.getElementById('basementen-unlock-pwd-input'),
    basementenUnlockError: document.getElementById('basementen-unlock-error'),
    basementenUnlockCancel: document.getElementById('basementen-unlock-cancel'),
    basementenUnlockForgot: document.getElementById('basementen-unlock-forgot'),
    basementenLogModal: document.getElementById('basementen-log-modal'),
    basementenLogRows: document.getElementById('basementen-log-rows'),
    basementenLogClose: document.getElementById('basementen-log-close'),
    basementenLogOk: document.getElementById('basementen-log-ok'),
    basementenClearLog: document.getElementById('basementen-clear-log'),
    
    // Vault and Auto-Unlock elements
    basementenTxLabel: document.getElementById('basementen-tx-label'),
    basementenTxPassword: document.getElementById('basementen-tx-password'),
    basementenTxError: document.getElementById('basementen-tx-error'),
    basementenTxName: document.getElementById('basementen-tx-name'),
    basementenNameGroup: document.getElementById('basementen-name-group'),
    basementenSaveTx: document.getElementById('basementen-save-tx'),
    basementenAutoRecognizePanel: document.getElementById('basementen-auto-recognize-panel'),
    basementenAutoStatusTitle: document.getElementById('basementen-auto-status-title'),
    basementenAutoStatusDesc: document.getElementById('basementen-auto-status-desc'),
    basementenRevealKeyModal: document.getElementById('basementen-reveal-key-modal'),
    basementenRevealModalTitle: document.getElementById('basementen-reveal-modal-title'),
    basementenRevealModalDesc: document.getElementById('basementen-reveal-modal-desc'),
    basementenRevealKeyForm: document.getElementById('basementen-reveal-key-form'),
    basementenRevealKeyPwdInput: document.getElementById('basementen-reveal-key-pwd-input'),
    basementenRevealKeyError: document.getElementById('basementen-reveal-key-error'),
    basementenRevealKeyClose: document.getElementById('basementen-reveal-key-close'),
    basementenRevealKeyCancel: document.getElementById('basementen-reveal-key-cancel'),
    basementenSetupError: document.getElementById('basementen-setup-error'),

    // Shared confirmation modal
    confirmModal: document.getElementById('confirm-modal'),
    confirmModalTitle: document.getElementById('confirm-modal-title'),
    confirmModalMessage: document.getElementById('confirm-modal-message'),
    confirmModalTypeGroup: document.getElementById('confirm-modal-type-group'),
    confirmModalTypeLabel: document.getElementById('confirm-modal-type-label'),
    confirmModalTypeInput: document.getElementById('confirm-modal-type-input'),
    confirmModalCancel: document.getElementById('confirm-modal-cancel'),
    confirmModalOk: document.getElementById('confirm-modal-ok'),
    
    // Panel title and copy helper elements
    inputPanelTitle: document.getElementById('input-panel-title'),
    outputPanelTitle: document.getElementById('output-panel-title'),
    basementenCopyOutput: document.getElementById('basementen-copy-output')
};

/* ==========================================================================
   CIPHER REGISTRY
   Single source of truth for every cipher: sidebar entry (name/icon/badge),
   parameter panel, history label, and the conversion dispatch. Adding a new
   cipher means adding one entry here (plus a param panel in index.html if it
   needs configuration).

   Fields:
   - id:         internal identifier (persisted in state & history)
   - name:       sidebar display name
   - shortName:  compact label used in the history list
   - icon:       lucide icon name
   - badge:      optional { text, className } sidebar badge
   - paramGroup: DOM id of the parameter panel to show
   - run:        (input, mode, opts) => { result, steps } (may be async);
                 reads its parameters from the DOM and owns its inline
                 validation errors. Omitted for the anagram helper, which
                 short-circuits in runConversion before dispatch.
   ========================================================================== */
const CIPHERS = [
    {
        id: 'a1z26', name: 'A1Z26 Cipher', shortName: 'A1Z26', icon: 'hash', paramGroup: 'param-none',
        run: (input, mode, opts) => mode === 'encode'
            ? A1z26.encode(input, null, opts.retainPunctuation)
            : A1z26.decode(input, null, opts.retainPunctuation)
    },
    {
        id: 'anagram', name: 'Anagram Helper', shortName: 'Anagram', icon: 'shuffle',
        badge: { text: 'Helper', className: 'badge-helper' }, paramGroup: 'param-anagram'
    },
    {
        id: 'atbash', name: 'Atbash Cipher', shortName: 'Atbash', icon: 'shuffle', paramGroup: 'param-none',
        run: (input, mode, opts) => mode === 'encode'
            ? Atbash.encode(input, null, opts.retainPunctuation)
            : Atbash.decode(input, null, opts.retainPunctuation)
    },
    {
        id: 'binary', name: 'Binary Converter', shortName: 'Binary', icon: 'binary', paramGroup: 'param-none',
        run: (input, mode, opts) => mode === 'encode'
            ? BinaryConverter.encode(input, null, opts.retainPunctuation)
            : BinaryConverter.decode(input, null, opts.retainPunctuation)
    },
    {
        id: 'binreverse', name: 'Binary Reverse', shortName: 'Binary Reverse', icon: 'lock',
        badge: { text: 'Custom' }, paramGroup: 'param-none',
        run: (input, mode, opts) => mode === 'encode'
            ? BinaryReverse.encode(input, 'fixed', opts.retainPunctuation)
            : BinaryReverse.decode(input, 'fixed', opts.retainPunctuation)
    },
    {
        id: 'caesar', name: 'Caesar Cipher', shortName: 'Caesar', icon: 'key-round', paramGroup: 'param-caesar',
        run: (input, mode, opts) => {
            const shift = parseInt(elements.caesarShift.value, 10);
            return mode === 'encode'
                ? Caesar.encode(input, shift, opts.retainPunctuation)
                : Caesar.decode(input, shift, opts.retainPunctuation);
        }
    },
    {
        id: 'railfence', name: 'Rail Fence', shortName: 'Rail Fence', icon: 'rows', paramGroup: 'param-railfence',
        run: (input, mode, opts) => {
            const rails = parseInt(elements.railfenceRails.value, 10);
            const railsValid = !isNaN(rails) && rails >= 2 && rails <= 10;
            elements.railfenceError.textContent = railsValid ? '' : 'Number of rails must be between 2 and 10.';
            if (!railsValid) {
                return { result: '', steps: [{ title: 'Error', content: 'Number of rails must be between 2 and 10. Output cleared.' }] };
            }
            return mode === 'encode'
                ? RailFence.encode(input, rails, opts.retainPunctuation)
                : RailFence.decode(input, rails, opts.retainPunctuation);
        }
    },
    {
        id: 'rot13', name: 'ROT13 Cipher', shortName: 'ROT13', icon: 'refresh-cw', paramGroup: 'param-none',
        run: (input, mode, opts) => mode === 'encode'
            ? Rot13.encode(input, null, opts.retainPunctuation)
            : Rot13.decode(input, null, opts.retainPunctuation)
    },
    {
        id: 'scandicaesar', name: 'Scandi Caesar', shortName: 'Scandi Caesar', icon: 'globe',
        badge: { text: 'Scandi', className: 'badge-scandi' }, paramGroup: 'param-scandicaesar',
        run: (input, mode, opts) => {
            const shift = parseInt(elements.scandicaesarShift.value, 10);
            const variant = elements.scandicaesarLang.value;
            return mode === 'encode'
                ? ScandiCaesar.encode(input, shift, variant, opts.retainPunctuation)
                : ScandiCaesar.decode(input, shift, variant, opts.retainPunctuation);
        }
    },
    {
        id: 'basementen', name: 'The Basementen', shortName: 'The Basementen', icon: 'shield-alert',
        badge: { text: 'Secure', className: 'badge-secure' }, paramGroup: 'param-basementen',
        run: async (input, mode, opts) => {
            if (!basementenUnlocked) {
                return { result: "LOCKED: Please enter master password", steps: [] };
            }
            if (mode === 'decode') {
                if (basementenDecryptedKey !== null) {
                    return Basementen.decode(input, basementenDecryptedKey, opts.retainPunctuation);
                }
                return { result: "[LOCKED: Enter Transaction Password in the control panel to load key]", steps: [] };
            }
            if (basementenTxValid) {
                return Basementen.encode(input, basementenKey);
            }
            return { result: "[LOCKED: Set Transaction Password in the control panel to unlock composition]", steps: [] };
        }
    },
    {
        id: 'vigenere', name: 'Vigenere Cipher', shortName: 'Vigenere', icon: 'keyboard', paramGroup: 'param-vigenere',
        run: (input, mode, opts) => {
            const key = elements.vigenereKey.value;
            const hasKey = key.replace(/[^A-Za-z]/g, '').length > 0;
            elements.vigenereError.textContent = hasKey ? '' : 'Enter a keyword (letters) to produce output.';
            return mode === 'encode'
                ? Vigenere.encode(input, key, opts.retainPunctuation)
                : Vigenere.decode(input, key, opts.retainPunctuation);
        }
    }
];

function getCipher(id) {
    return CIPHERS.find(c => c.id === id) || null;
}

/**
 * Generate the sidebar buttons from the registry.
 */
function renderCipherNav() {
    const nav = document.querySelector('.cipher-nav');
    nav.innerHTML = '';
    for (const cipher of CIPHERS) {
        const btn = document.createElement('button');
        btn.className = 'cipher-select-btn';
        btn.dataset.cipher = cipher.id;

        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', cipher.icon);
        btn.appendChild(icon);

        const name = document.createElement('span');
        name.className = 'cipher-name';
        name.textContent = cipher.name;
        btn.appendChild(name);

        if (cipher.badge) {
            const badge = document.createElement('span');
            badge.className = 'badge-custom' + (cipher.badge.className ? ` ${cipher.badge.className}` : '');
            badge.textContent = cipher.badge.text;
            btn.appendChild(badge);
        }

        nav.appendChild(btn);
    }
}

// Global PWA Install prompt pointer
let deferredPrompt = null;

// Debounce helper for auto-saving history
let historySaveTimeout = null;

/* ==========================================================================
   MODAL HELPERS
   Central open/close so every modal gets Escape-to-dismiss, overlay-click
   dismiss, a Tab focus trap, and focus restored to the triggering element.
   ========================================================================== */

// overlay element -> dismiss function (what Escape / overlay click should do)
const modalRegistry = new Map();

// Focus to restore when each open modal closes (stack: log modal can open
// the reveal modal on top of itself).
const modalFocusStack = [];

function openModal(overlay) {
    modalFocusStack.push(document.activeElement);
    overlay.classList.remove('hidden');
}

function closeModal(overlay) {
    overlay.classList.add('hidden');
    const previous = modalFocusStack.pop();
    if (previous && document.contains(previous) && typeof previous.focus === 'function') {
        previous.focus();
    }
}

function registerModal(overlay, dismiss) {
    modalRegistry.set(overlay, dismiss);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) dismiss();
    });
}

// Topmost visible modal = last visible one in registration order
// (registration order puts stacked-on-top modals later).
function topVisibleModal() {
    let top = null;
    for (const overlay of modalRegistry.keys()) {
        if (!overlay.classList.contains('hidden')) top = overlay;
    }
    return top;
}

/* ==========================================================================
   TOASTS & CONFIRMATION DIALOG
   Non-blocking replacements for alert()/confirm(): notifications become
   toasts; destructive actions go through a styled confirm modal that can
   require typing a phrase before the confirm button unlocks.
   ========================================================================== */

function showToast(message, type = 'info', duration = 3500) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast glass toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
        toast.classList.remove('visible');
        // Remove after the fade-out transition (fallback timer in case
        // transitions are disabled, e.g. prefers-reduced-motion).
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        setTimeout(() => toast.remove(), 600);
    }, duration);
}

/**
 * Styled confirmation dialog. Resolves true if confirmed, false otherwise.
 * With `typePhrase` set, the confirm button stays disabled until the user
 * types the phrase exactly — used for irreversible wipe actions.
 */
function showConfirm({ title, message, confirmLabel = 'Confirm', danger = false, typePhrase = null }) {
    return new Promise((resolve) => {
        elements.confirmModalTitle.textContent = title;
        elements.confirmModalMessage.textContent = message;
        elements.confirmModalOk.textContent = confirmLabel;
        elements.confirmModalOk.classList.toggle('btn-danger', danger);
        elements.confirmModalOk.classList.toggle('btn-primary', !danger);

        if (typePhrase) {
            elements.confirmModalTypeGroup.classList.remove('hidden');
            elements.confirmModalTypeLabel.textContent = `Type ${typePhrase} to confirm:`;
            elements.confirmModalTypeInput.value = '';
            elements.confirmModalOk.disabled = true;
            elements.confirmModalTypeInput.oninput = () => {
                elements.confirmModalOk.disabled = elements.confirmModalTypeInput.value !== typePhrase;
            };
            elements.confirmModalTypeInput.onkeydown = (e) => {
                if (e.key === 'Enter' && !elements.confirmModalOk.disabled) {
                    e.preventDefault();
                    elements.confirmModalOk.click();
                }
            };
        } else {
            elements.confirmModalTypeGroup.classList.add('hidden');
            elements.confirmModalOk.disabled = false;
        }

        const finish = (value) => {
            closeModal(elements.confirmModal);
            elements.confirmModalOk.onclick = null;
            elements.confirmModalCancel.onclick = null;
            elements.confirmModalTypeInput.oninput = null;
            elements.confirmModalTypeInput.onkeydown = null;
            resolve(value);
        };

        elements.confirmModalOk.onclick = () => finish(true);
        elements.confirmModalCancel.onclick = () => finish(false);

        openModal(elements.confirmModal);
        if (typePhrase) {
            elements.confirmModalTypeInput.focus();
        } else {
            elements.confirmModalCancel.focus();
        }
    });
}

document.addEventListener('keydown', (e) => {
    const overlay = topVisibleModal();
    if (!overlay) return;

    if (e.key === 'Escape') {
        e.preventDefault();
        modalRegistry.get(overlay)();
    } else if (e.key === 'Tab') {
        // Keep Tab cycling inside the open modal
        const focusables = Array.from(
            overlay.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])')
        ).filter(el => !el.disabled && el.offsetParent !== null);
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
});

/**
 * Initialize Application
 */
function init() {
    // Build the sidebar from the cipher registry
    renderCipherNav();
    elements.cipherBtns = document.querySelectorAll('.cipher-select-btn');

    // Load config from LocalStorage if exists
    loadSavedState();
    
    // Initialize UI states
    setupUIFromState();
    
    // Bind Event Listeners
    bindEvents();

    // Render History
    renderHistory();
    
    // Run initial conversion
    runConversion();
    
    // Initialize Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Register service worker for true offline support
    registerServiceWorker();

    // On mobile the cipher picker is a horizontal pill row; make sure the
    // saved active cipher isn't hidden off-screen when the app opens.
    if (window.matchMedia('(max-width: 768px)').matches) {
        const activeBtn = document.querySelector('.cipher-select-btn.active');
        if (activeBtn) {
            activeBtn.scrollIntoView({ block: 'nearest', inline: 'center' });
        }
    }
}

/**
 * Register the cache-first service worker and surface a toast when a new
 * version has finished downloading in the background.
 */
function registerServiceWorker() {
    // Service workers require http(s); opening index.html via file:// still works,
    // it just skips offline caching (the desktop app serves over 127.0.0.1).
    if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') return;

    navigator.serviceWorker.register('sw.js').then((registration) => {
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
                // 'installed' with an existing controller = an update is waiting
                // (first-ever install has no controller and needs no toast).
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    showUpdateToast(newWorker);
                }
            });
        });
    }).catch((err) => {
        console.error('Service worker registration failed:', err);
    });

    // When the waiting worker takes over, reload once to load the new assets.
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });
}

/**
 * Show a dismissible "update ready" toast with a reload action.
 */
function showUpdateToast(waitingWorker) {
    if (document.querySelector('.update-toast')) return;

    const toast = document.createElement('div');
    toast.className = 'update-toast glass';

    const message = document.createElement('span');
    message.textContent = 'A new version is ready.';

    const reloadBtn = document.createElement('button');
    reloadBtn.className = 'btn btn-primary btn-sm';
    reloadBtn.textContent = 'Reload';
    reloadBtn.addEventListener('click', () => {
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    });

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'btn btn-secondary btn-sm';
    dismissBtn.textContent = 'Later';
    dismissBtn.addEventListener('click', () => toast.remove());

    toast.appendChild(message);
    toast.appendChild(reloadBtn);
    toast.appendChild(dismissBtn);
    document.body.appendChild(toast);
}

/**
 * Load state from localStorage
 */
function loadSavedState() {
    const saved = localStorage.getItem('cipher_craft_state');
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
    
    const savedHistory = localStorage.getItem('cipher_craft_history');
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
function saveConfigState() {
    const config = {
        cipher: state.cipher,
        mode: state.mode,
        retainPunctuation: state.retainPunctuation,
        showProcess: state.showProcess
    };
    localStorage.setItem('cipher_craft_state', JSON.stringify(config));
}

/**
 * Configure UI elements based on state
 */
function setupUIFromState() {
    // Set Sidebar Active
    elements.cipherBtns.forEach(btn => {
        if (btn.dataset.cipher === state.cipher) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Set Mode Active & Header Titles
    if (state.mode === 'encode') {
        elements.modeEncode.classList.add('active');
        elements.modeDecode.classList.remove('active');
        document.body.classList.remove('mode-decode');
        
        elements.inputPanelTitle.textContent = 'Plaintext Input';
        elements.outputPanelTitle.textContent = 'Ciphertext Output';
    } else {
        elements.modeEncode.classList.remove('active');
        elements.modeDecode.classList.add('active');
        document.body.classList.add('mode-decode');
        
        elements.inputPanelTitle.textContent = 'Ciphertext Input';
        elements.outputPanelTitle.textContent = 'Plaintext Output';
    }

    // Handle Basementen Encode mode panel visibility override
    const outputPanel = elements.textOutput.closest('.console-panel');
    const inputPanel = elements.textInput.closest('.console-panel');
    
    if (state.cipher === 'basementen') {
        if (state.mode === 'encode') {
            outputPanel.classList.add('hidden');
            inputPanel.classList.remove('hidden');
            elements.basementenCopyOutput.classList.remove('hidden');
            
            elements.basementenTxLabel.textContent = "Transaction Password (cannot be master password):";
            elements.basementenTxPassword.placeholder = "Set password to secure this transaction";
            elements.basementenNameGroup.classList.remove('hidden');
            elements.basementenSaveTx.classList.remove('hidden');
            elements.basementenGenKey.classList.remove('hidden');
            elements.basementenViewLog.classList.remove('hidden');
            elements.basementenResetPwd.classList.remove('hidden');
            
            if (basementenTxValid) {
                elements.textInput.disabled = false;
                elements.textInput.placeholder = "Type or paste your text here...";
            } else {
                elements.textInput.disabled = true;
                elements.textInput.value = '';
                elements.textInput.placeholder = "Please enter a unique Transaction Password in the control panel to unlock composition...";
            }
        } else {
            outputPanel.classList.remove('hidden');
            inputPanel.classList.remove('hidden');
            elements.basementenCopyOutput.classList.add('hidden');
            
            elements.basementenTxLabel.textContent = "Decryption Password:";
            elements.basementenTxPassword.placeholder = "Enter password to decrypt";
            elements.basementenNameGroup.classList.add('hidden');
            elements.basementenSaveTx.classList.add('hidden');
            elements.basementenGenKey.classList.add('hidden');
            elements.basementenViewLog.classList.add('hidden');
            elements.basementenResetPwd.classList.add('hidden');
            
            if (basementenDecryptedKey !== null) {
                elements.textInput.disabled = false;
                elements.textInput.placeholder = "Enter ciphertext to decrypt...";
            } else {
                elements.textInput.disabled = true;
                elements.textInput.value = '';
                elements.textInput.placeholder = "Please enter the Decryption Password in the control panel to load the key...";
            }
        }
    } else {
        outputPanel.classList.remove('hidden');
        inputPanel.classList.remove('hidden');
        elements.basementenCopyOutput.classList.add('hidden');
        elements.textInput.disabled = false;
        elements.textInput.placeholder = "Type or paste your text here...";
    }

    // Set Toggles
    elements.optPunctuation.checked = state.retainPunctuation;
    elements.optProcess.checked = state.showProcess;
    
    if (state.showProcess) {
        elements.processSection.classList.remove('hidden');
    } else {
        elements.processSection.classList.add('hidden');
    }

    // Show active parameter group
    showActiveParameterGroup();
}

/**
 * Display parameters related to selected cipher
 */
function showActiveParameterGroup() {
    // Hide all
    document.querySelectorAll('.cipher-params .param-group').forEach(group => {
        group.classList.remove('active-param');
    });

    // Show correct one and handle output panel layout based on state
    if (state.cipher === 'anagram') {
        state.mode = 'encode';
        elements.modeEncode.classList.add('active');
        elements.modeDecode.classList.remove('active');
        elements.modeSelector.classList.add('hidden');
        
        elements.textOutput.readOnly = false;
        elements.textOutput.placeholder = "Type your anagram here...";
        elements.btnShuffleOutput.classList.remove('hidden');
        // Auto-scramble on first load if output is empty
        if (!elements.textOutput.value && elements.textInput.value) {
            scrambleInputToOutput();
        }
    } else {
        elements.modeSelector.classList.remove('hidden');
        elements.textOutput.readOnly = true;
        elements.textOutput.placeholder = "Ciphertext output will appear here...";
        elements.btnShuffleOutput.classList.add('hidden');
    }

    const entry = getCipher(state.cipher);
    const paramGroup = document.getElementById(entry ? entry.paramGroup : 'param-none');
    if (paramGroup) {
        paramGroup.classList.add('active-param');
    }
}

/**
 * Bind DOM Event Listeners
 */
function bindEvents() {
    // Cipher Select Buttons
    let previousCipher = 'caesar';
    elements.cipherBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const selectedCipher = btn.dataset.cipher;
            
            if (state.cipher !== 'basementen') {
                previousCipher = state.cipher;
            }

            // Click away from basementen: lock it immediately and clear in-memory key
            if (state.cipher === 'basementen' && selectedCipher !== 'basementen') {
                lockBasementenSession();
            }

            state.cipher = selectedCipher;

            if (selectedCipher === 'basementen') {
                handleBasementenAccess(previousCipher);
            } else {
                saveConfigState();
                setupUIFromState();
                runConversion();
            }
        });
    });

    // Mode Buttons
    elements.modeEncode.addEventListener('click', () => {
        state.mode = 'encode';
        elements.modeEncode.classList.add('active');
        elements.modeDecode.classList.remove('active');
        saveConfigState();
        setupUIFromState();
        runConversion();
    });

    elements.modeDecode.addEventListener('click', () => {
        state.mode = 'decode';
        elements.modeEncode.classList.remove('active');
        elements.modeDecode.classList.add('active');
        saveConfigState();
        setupUIFromState();
        runConversion();
    });

    // Option Toggles
    elements.optPunctuation.addEventListener('change', (e) => {
        state.retainPunctuation = e.target.checked;
        saveConfigState();
        runConversion();
    });

    elements.optProcess.addEventListener('change', (e) => {
        state.showProcess = e.target.checked;
        if (state.showProcess) {
            elements.processSection.classList.remove('hidden');
        } else {
            elements.processSection.classList.add('hidden');
        }
        saveConfigState();
        runConversion();
    });

    // Caesar Shift Slider
    elements.caesarShift.addEventListener('input', (e) => {
        elements.shiftValue.textContent = e.target.value;
        runConversion();
    });

    // Nudge a range input by +/-1, clamped to its min/max, reusing its own 'input' handler
    const nudgeSlider = (slider, delta) => {
        const min = parseInt(slider.min, 10);
        const max = parseInt(slider.max, 10);
        const newValue = Math.min(max, Math.max(min, parseInt(slider.value, 10) + delta));
        slider.value = newValue;
        slider.dispatchEvent(new Event('input', { bubbles: true }));
    };

    elements.caesarShiftDown.addEventListener('click', () => nudgeSlider(elements.caesarShift, -1));
    elements.caesarShiftUp.addEventListener('click', () => nudgeSlider(elements.caesarShift, 1));

    // Scandi Caesar Shift Slider
    elements.scandicaesarShift.addEventListener('input', (e) => {
        elements.scandicaesarShiftValue.textContent = e.target.value;
        runConversion();
    });

    elements.scandicaesarShiftDown.addEventListener('click', () => nudgeSlider(elements.scandicaesarShift, -1));
    elements.scandicaesarShiftUp.addEventListener('click', () => nudgeSlider(elements.scandicaesarShift, 1));

    // Scandi Caesar Language Select
    elements.scandicaesarLang.addEventListener('change', () => {
        runConversion();
    });

    // Vigenere Key input
    elements.vigenereKey.addEventListener('input', (e) => {
        // Filter input to letters only
        const filtered = e.target.value.replace(/[^A-Za-z]/g, '');
        if (filtered !== e.target.value) {
            e.target.value = filtered;
        }
        runConversion();
    });

    // Rail Fence Rails input
    elements.railfenceRails.addEventListener('input', () => {
        runConversion();
    });



    // TextArea Events
    elements.textInput.addEventListener('input', () => {
        elements.inputStats.textContent = `${elements.textInput.value.length} characters`;
        if (state.cipher === 'anagram') {
            scrambleInputToOutput();
        } else {
            runConversion();
        }
        triggerHistoryAutoSave();
    });

    elements.textOutput.addEventListener('input', () => {
        elements.outputStats.textContent = `${elements.textOutput.value.length} characters`;
        if (state.cipher === 'anagram') {
            runConversion();
        }
    });

    elements.btnShuffleOutput.addEventListener('click', () => {
        scrambleInputToOutput();
    });

    // Paste Action
    elements.btnPaste.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            elements.textInput.value = text;
            elements.inputStats.textContent = `${text.length} characters`;
            runConversion();
            triggerHistoryAutoSave();
        } catch (err) {
            // Fallback if permission denied
            showToast('Clipboard access was blocked — paste with Ctrl+V or Cmd+V instead.', 'warning');
        }
    });

    // Clear Action
    elements.btnClear.addEventListener('click', () => {
        elements.textInput.value = '';
        elements.textOutput.value = '';
        elements.inputStats.textContent = '0 characters';
        elements.outputStats.textContent = '0 characters';
        runConversion();
    });

    // Copy Action
    // Lucide replaces <i data-lucide> tags with <svg> elements on render, so
    // the transient check-mark feedback rebuilds the icon from scratch instead
    // of mutating an <i> tag that no longer exists after the first render.
    const setCopyBtnIcon = (name) => {
        elements.btnCopy.innerHTML = `<i data-lucide="${name}"></i>`;
        if (window.lucide) window.lucide.createIcons();
    };

    elements.btnCopy.addEventListener('click', () => {
        const text = elements.textOutput.value;
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            // Transient UI feedback
            setCopyBtnIcon('check');

            // Add immediately to history when they explicitly copy (as they finished working with it)
            saveToHistory(elements.textInput.value, text);

            setTimeout(() => setCopyBtnIcon('copy'), 1500);
        });
    });

    // Clear History Action
    elements.btnClearHistory.addEventListener('click', () => {
        state.history = [];
        localStorage.removeItem('cipher_craft_history');
        renderHistory();
    });

    // PWA Install Event Handler
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent default browser banner
        e.preventDefault();
        // Save the event
        deferredPrompt = e;
        // Show our custom button
        elements.installBtn.classList.remove('hidden');
    });

    elements.installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        // Show browser prompt
        deferredPrompt.prompt();
        // Await user decision
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA Installation outcome: ${outcome}`);
        // Clear pointer
        deferredPrompt = null;
        // Hide button
        elements.installBtn.classList.add('hidden');
    });

    window.addEventListener('appinstalled', (e) => {
        console.log('App was successfully installed.');
        elements.installBtn.classList.add('hidden');
    });

    // Modal Event Handlers
    // Generated entirely client-side (via the vendored qrcode.js) so no request
    // ever leaves the device just to render this code.
    const updateQrCode = (url) => {
        elements.qrUrlText.textContent = url;
        const qr = qrcode(0, 'M');
        qr.addData(url);
        qr.make();
        const svg = qr.createSvgTag({ cellSize: 5, margin: 4 });
        elements.qrImage.src = 'data:image/svg+xml;base64,' + btoa(svg);
    };

    elements.mobileBtn.addEventListener('click', () => {
        updateQrCode("https://kosejarl.github.io/starlight-cipher-suite/");
        openModal(elements.mobileModal);
    });

    elements.closeModalBtn.addEventListener('click', () => {
        closeModal(elements.mobileModal);
    });

    // Escape / overlay-click dismissal for every modal. Registration order
    // matters for stacking: the reveal modal opens on top of the log modal,
    // so it's registered after it and wins the Escape key while visible.
    registerModal(elements.mobileModal, () => closeModal(elements.mobileModal));
    registerModal(elements.basementenSetupModal, () => elements.basementenSetupCancel.click());
    registerModal(elements.basementenUnlockModal, () => elements.basementenUnlockCancel.click());
    registerModal(elements.basementenLogModal, () => closeModal(elements.basementenLogModal));
    registerModal(elements.basementenRevealKeyModal, () => closeModal(elements.basementenRevealKeyModal));
    // Registered last: the confirm dialog can stack on top of any other modal.
    registerModal(elements.confirmModal, () => elements.confirmModalCancel.click());



    // Basementen Event Listeners
    elements.basementenGenKey.addEventListener('click', async () => {
        if (!basementenUnlocked || !basementenCryptoKey) return;
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
            basementenCryptoKey,
            new TextEncoder().encode(newKey)
        );
        localStorage.setItem('basementen_iv', bufToHex(iv));
        localStorage.setItem('basementen_encrypted_key', bufToHex(encrypted));
        basementenKey = newKey;
        elements.basementenKeyStatus.textContent = 'Active [Secure 256-bit]';
        elements.basementenKeyStatus.style.color = '#10b981';
        showToast('New 256-bit key generated and encrypted.', 'success');
        runConversion();
    });

    elements.basementenViewLog.addEventListener('click', () => {
        if (!basementenUnlocked) return;
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

    elements.basementenTxPassword.addEventListener('input', (e) => {
        const pwd = e.target.value;
        elements.basementenTxError.textContent = '';
        elements.basementenTxError.style.color = '#ef4444';
        if (txPasswordDebounce) clearTimeout(txPasswordDebounce);

        if (state.mode === 'encode') {
            if (!pwd) {
                basementenTxValid = false;
                lockCompositionPanel("Please enter a unique Transaction Password in the control panel to unlock composition...");
                return;
            }

            if (pwd.length < 10 || pwd.length > 32) {
                elements.basementenTxError.textContent = 'Password must be between 10 and 32 characters.';
                basementenTxValid = false;
                lockCompositionPanel("Please enter a unique Transaction Password in the control panel to unlock composition...");
                return;
            }

            txPasswordDebounce = setTimeout(async () => {
                const isMaster = await isMasterPassword(pwd);
                // Ignore stale results if the field changed while deriving
                if (elements.basementenTxPassword.value !== pwd) return;

                if (isMaster) {
                    elements.basementenTxError.textContent = 'Transaction password cannot be the same as the master password.';
                    basementenTxValid = false;
                    lockCompositionPanel("Please enter a unique Transaction Password in the control panel to unlock composition...");
                    return;
                }

                basementenTxValid = true;
                elements.textInput.disabled = false;
                elements.textInput.placeholder = "Type or paste your text here...";
            }, TX_PASSWORD_DEBOUNCE_MS);
        } else {
            // Decode mode: find log entry by password first
            if (!pwd) {
                basementenDecryptedKey = null;
                lockCompositionPanel("Please enter the Transaction Password in the control panel to load the key...");
                elements.basementenAutoRecognizePanel.classList.add('hidden');
                return;
            }

            txPasswordDebounce = setTimeout(() => runDecodePasswordSearch(pwd), TX_PASSWORD_DEBOUNCE_MS);
        }
    });

    // Debounced decode-mode lookup: try the password against each vault entry
    // (one PBKDF2 derivation per entry, so never run this per keystroke).
    async function runDecodePasswordSearch(pwd) {
        const matched = await searchHistoryByPassword(pwd);
        // Ignore stale results if the field changed while deriving
        if (elements.basementenTxPassword.value !== pwd) return;

        if (matched) {
            basementenDecryptedKey = matched.decryptedKey;
            elements.textInput.disabled = false;
            elements.textInput.placeholder = "Enter ciphertext to decrypt...";

            elements.basementenAutoRecognizePanel.classList.remove('hidden');
            elements.basementenAutoRecognizePanel.style.background = 'rgba(16, 185, 129, 0.08)';
            elements.basementenAutoRecognizePanel.style.border = '1px solid rgba(16, 185, 129, 0.2)';
            elements.basementenAutoStatusTitle.style.color = '#10b981';
            elements.basementenAutoStatusTitle.innerHTML = `<i data-lucide="check-circle" style="width: 14px; height: 14px;"></i> Key Recovered Successfully`;
            elements.basementenAutoStatusDesc.style.color = 'var(--color-text-secondary)';
            elements.basementenAutoStatusDesc.textContent = `Found matching log entry from ${matched.item.timestamp}. Ready to decrypt.`;
            if (window.lucide) window.lucide.createIcons();

            runConversion();
        } else {
            basementenDecryptedKey = null;
            elements.textInput.disabled = true;
            elements.textInput.value = '';
            elements.textInput.placeholder = "Please enter the Transaction Password in the control panel to load the key...";

            elements.basementenAutoRecognizePanel.classList.remove('hidden');
            elements.basementenAutoRecognizePanel.style.background = 'rgba(239, 68, 68, 0.08)';
            elements.basementenAutoRecognizePanel.style.border = '1px solid rgba(239, 68, 68, 0.2)';
            elements.basementenAutoStatusTitle.style.color = '#ef4444';
            elements.basementenAutoStatusTitle.innerHTML = `<i data-lucide="x-circle" style="width: 14px; height: 14px;"></i> Key Not Found`;
            elements.basementenAutoStatusDesc.style.color = 'var(--color-text-secondary)';
            elements.basementenAutoStatusDesc.textContent = "No matching transaction log found for this password.";
            if (window.lucide) window.lucide.createIcons();
        }
    }

    // Save transaction button click handler
    elements.basementenSaveTx.addEventListener('click', async () => {
        const inputVal = elements.textInput.value;
        const outputVal = elements.textOutput.value;
        const txName = elements.basementenTxName.value.trim();

        if (!basementenUnlocked) {
            showToast('Master password must be entered first.', 'error');
            return;
        }

        if (!inputVal || !outputVal || outputVal.startsWith('[LOCKED') || outputVal.startsWith('LOCKED:')) {
            showToast('Compose some plaintext and perform encoding first to generate output.', 'warning');
            return;
        }

        const success = await saveBasementenTransaction(inputVal, outputVal, 'encode', basementenKey, txName);
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
                basementenTxValid = false;
                
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

    // Online/Offline Listeners
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    // Trigger check
    updateNetworkStatus();
}

/**
 * Handle Network State Badge
 */
function updateNetworkStatus() {
    if (navigator.onLine) {
        elements.connectionStatus.classList.remove('offline');
        elements.connectionStatus.classList.add('online');
        elements.connectionStatus.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        elements.connectionStatus.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
        elements.connectionText.textContent = "Cached";
        elements.connectionStatus.title = "Online — app cached for offline use";
    } else {
        elements.connectionStatus.classList.remove('online');
        elements.connectionStatus.classList.add('offline');
        elements.connectionStatus.style.borderColor = 'rgba(245, 158, 11, 0.4)';
        elements.connectionStatus.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
        elements.connectionText.textContent = "Offline Mode";
        elements.connectionStatus.title = "Offline — running from local cache";
    }
}

/**
 * Execute Cryptographic Conversion
 * (async because The Basementen encrypts via WebCrypto; other ciphers are sync)
 */
async function runConversion() {
    const input = elements.textInput.value;
    if (!input) {
        elements.textOutput.value = '';
        elements.outputStats.textContent = '0 characters';
        elements.vigenereError.textContent = '';
        elements.railfenceError.textContent = '';
        renderProcessPlaceholder();
        return;
    }

    if (state.cipher === 'anagram') {
        const input = elements.textInput.value || '';
        const cleanInput = input.toLowerCase();
        
        // Count letters in the input
        let inputLetterCount = 0;
        for (const char of cleanInput) {
            if (/[a-z0-9æøåäö]/.test(char)) {
                inputLetterCount++;
            }
        }
        
        const logContent = `Input Text:  "${input}"\n` +
            `Letters count: ${inputLetterCount}\n\n` +
            `Edit the output panel directly or click the Shuffle icon in the header to randomize.`;
        if (state.showProcess) {
            renderProcessSteps([{ title: 'Anagram Helper', content: logContent }]);
        }

        elements.outputStats.textContent = `${elements.textOutput.value.length} characters`;
        return;
    }

    let resultObj = { result: '', steps: [] };

    // Dispatch through the cipher registry
    try {
        const entry = getCipher(state.cipher);
        if (entry && entry.run) {
            resultObj = await entry.run(input, state.mode, { retainPunctuation: state.retainPunctuation });
        }
    } catch (e) {
        resultObj = { result: `Error executing conversion: ${e.message}`, steps: [{ title: 'Execution Failure', content: e.stack }] };
    }

    // Set output
    elements.textOutput.value = resultObj.result;
    elements.outputStats.textContent = `${resultObj.result.length} characters`;

    // Render step by step visualization
    if (state.showProcess) {
        renderProcessSteps(resultObj.steps);
    }
}

/**
 * Render steps in the UI process console
 */
function renderProcessSteps(steps) {
    elements.processLog.innerHTML = '';
    
    if (state.cipher === 'basementen') {
        elements.processLog.innerHTML = `
            <div class="placeholder-log" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.05); padding: 20px; border-radius: var(--radius-md); border: 1px solid; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <i data-lucide="shield-alert" class="animate-pulse" style="width: 24px; height: 24px;"></i>
                <p style="margin: 0; font-weight: 600;">Process breakdown is disabled for The Basementen to prevent key leakage.</p>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }
    
    if (steps.length === 0) {
        renderProcessPlaceholder();
        return;
    }

    steps.forEach((step, idx) => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'process-step';

        const stepTitle = document.createElement('div');
        stepTitle.className = 'process-step-title';
        stepTitle.innerHTML = `<span class="badge-dot"></span> Step ${idx + 1}: ${step.title}`;

        const stepBody = document.createElement('pre');
        stepBody.className = 'process-step-body';
        stepBody.textContent = step.content;

        stepDiv.appendChild(stepTitle);
        stepDiv.appendChild(stepBody);
        elements.processLog.appendChild(stepDiv);
    });
}

function renderProcessPlaceholder() {
    elements.processLog.innerHTML = `
        <div class="placeholder-log">
            <i data-lucide="cpu" class="animate-pulse"></i>
            <p>Type some text above to see the step-by-step conversion process in real-time.</p>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
}

/**
 * Handle debounced history saving (auto-saves after typing stops)
 */
function triggerHistoryAutoSave() {
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
function saveToHistory(input, output) {
    if (!input || !output) return;

    if (state.cipher === 'basementen') {
        if (basementenUnlocked && basementenKey) {
            saveBasementenTransaction(input, output, state.mode, basementenKey);
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
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
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

    localStorage.setItem('cipher_craft_history', JSON.stringify(state.history));
    renderHistory();
}

/**
 * Draw history elements inside list panel
 */
function renderHistory() {
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
        time.textContent = item.timestamp;

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
            localStorage.setItem('cipher_craft_history', JSON.stringify(state.history));
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
 * Format system name to readable name (from the cipher registry)
 */
function getFriendlyCipherName(id) {
    const entry = getCipher(id);
    return entry ? entry.shortName : id;
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

/**
 * Generate a scrambled variation of a string maintaining spaces
 */
function generateScrambleString(input) {
    const nonSpaceChars = [];
    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        if (/[a-zA-Z0-9æøåÆØÅäöÄÖ]/.test(char)) {
            nonSpaceChars.push(char);
        }
    }
    
    for (let i = nonSpaceChars.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nonSpaceChars[i], nonSpaceChars[j]] = [nonSpaceChars[j], nonSpaceChars[i]];
    }
    
    const result = [];
    let nonSpaceIndex = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        if (/\s/.test(char)) {
            result.push(char);
        } else if (/[a-zA-Z0-9æøåÆØÅäöÄÖ]/.test(char)) {
            result.push(nonSpaceChars[nonSpaceIndex++]);
        } else {
            result.push(char);
        }
    }
    return result.join('');
}

/**
 * Scramble input letters and put them in the output text area, maintaining spaces
 */
function scrambleInputToOutput() {
    const input = elements.textInput.value || '';
    const scrambled = generateScrambleString(input);
    elements.textOutput.value = scrambled;
    elements.textOutput.dispatchEvent(new Event('input'));
}

/* ==========================================================================
   THE BASEMENTEN SECURE CIPHER CORE & WORKFLOW
   ========================================================================== */
let basementenCryptoKey = null;

// Lock the vault and clear every piece of key material held in memory.
// Must be called on ANY path that navigates away from The Basementen.
function lockBasementenSession() {
    basementenUnlocked = false;
    basementenKey = '';
    basementenCryptoKey = null;
    basementenTxValid = false;
    basementenDecryptedKey = null;
    elements.basementenKeyStatus.textContent = 'Locked [Requires Verification]';
    elements.basementenKeyStatus.style.color = '#ef4444';
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

// Derive AES-GCM 256-bit key from password using PBKDF2
async function deriveKeyFromPassword(password, salt) {
    const baseKey = await window.crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits", "deriveKey"]
    );
    const aesKey = await window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 600000,
            hash: "SHA-256"
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
    return aesKey;
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
        const aesKey = await deriveKeyFromPassword(pwd, salt);
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
            const aesKey = await deriveKeyFromPassword(pwd, salt);
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

// Save transaction securely inside vault separate from general history log
async function saveBasementenTransaction(input, output, mode, keyUsed, customName) {
    const txPwd = elements.basementenTxPassword.value;
    if (!txPwd) {
        elements.basementenTxError.textContent = "Transaction not saved: Set a password to encrypt in vault.";
        elements.basementenTxError.style.color = '#f59e0b';
        return false;
    }

    if (txPwd.length < 10 || txPwd.length > 32) {
        elements.basementenTxError.textContent = "Transaction not saved: Password must be between 10 and 32 characters.";
        elements.basementenTxError.style.color = '#ef4444';
        return false;
    }

    const isMaster = await isMasterPassword(txPwd);
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
            id: Date.now().toString(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            name: customName || "Unnamed Transaction",
            mode: mode,
            encryptedPayload: bufToHex(encrypted),
            salt: bufToHex(txSalt),
            iv: bufToHex(txIv)
        };

        history.unshift(newItem);
        if (history.length > 20) {
            history.pop();
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
                <td colspan="4" style="text-align: center; padding: 15px; color: var(--color-text-muted);">No transaction logs found.</td>
            </tr>
        `;
        return;
    }
    history.forEach(item => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-glass)';
        
        const tdTime = document.createElement('td');
        tdTime.style.padding = '10px';
        tdTime.textContent = item.timestamp;

        const tdName = document.createElement('td');
        tdName.style.padding = '10px';
        const badge = document.createElement('span');
        badge.className = `history-badge ${item.mode}`;
        badge.textContent = item.mode;
        tdName.appendChild(badge);
        const nameText = document.createTextNode(' ' + (item.name || 'Unnamed Transaction'));
        tdName.appendChild(nameText);

        const tdOutput = document.createElement('td');
        tdOutput.className = 'io-cell';
        tdOutput.style.padding = '10px';
        const revealOutputBtn = document.createElement('span');
        revealOutputBtn.style.color = 'var(--color-primary)';
        revealOutputBtn.style.cursor = 'pointer';
        revealOutputBtn.style.textDecoration = 'underline';
        revealOutputBtn.textContent = "[Locked - Click to Reveal]";
        revealOutputBtn.addEventListener('click', () => {
            promptRevealPlaintext(item, tdOutput, 'output');
        });
        tdOutput.appendChild(revealOutputBtn);

        const tdKey = document.createElement('td');
        tdKey.className = 'key-cell';
        tdKey.style.padding = '10px';
        tdKey.style.wordBreak = 'break-all';
        
        const revealBtn = document.createElement('span');
        revealBtn.style.color = 'var(--color-primary)';
        revealBtn.style.cursor = 'pointer';
        revealBtn.style.textDecoration = 'underline';
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

            const aesKey = await deriveKeyFromPassword(pwd, salt);
            const decrypted = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                aesKey,
                ciphertext
            );

            const payload = JSON.parse(new TextDecoder().decode(decrypted));
            tdKey.innerHTML = '';
            tdKey.textContent = payload.key;
            tdKey.style.color = '#10b981';

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

            const aesKey = await deriveKeyFromPassword(pwd, salt);
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
            cell.style.color = '#10b981';

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
async function handleBasementenAccess(previousCipher) {
    const hasKey = localStorage.getItem('basementen_encrypted_key');
    if (!hasKey) {
        showBasementenSetup(previousCipher);
    } else {
        if (!basementenUnlocked) {
            showBasementenUnlock(previousCipher);
        } else {
            // Already unlocked in session
            elements.basementenKeyStatus.textContent = 'Active [Secure 256-bit]';
            elements.basementenKeyStatus.style.color = '#10b981';
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

            // Set session state
            basementenUnlocked = true;
            basementenKey = newKey;
            basementenCryptoKey = aesKey;

            // Update UI status
            elements.basementenKeyStatus.textContent = 'Active [Secure 256-bit]';
            elements.basementenKeyStatus.style.color = '#10b981';

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

            // Derive key
            const aesKey = await deriveKeyFromPassword(password, salt);

            // Try to decrypt
            const decrypted = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                aesKey,
                ciphertext
            );

            // Successfully unlocked
            basementenUnlocked = true;
            basementenKey = new TextDecoder().decode(decrypted);
            basementenCryptoKey = aesKey;

            elements.basementenKeyStatus.textContent = 'Active [Secure 256-bit]';
            elements.basementenKeyStatus.style.color = '#10b981';

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

// Start the app
document.addEventListener('DOMContentLoaded', () => {
    init();
    
    // Auto-prompt if basementen was the saved active cipher on startup
    if (state.cipher === 'basementen') {
        handleBasementenAccess('caesar');
    }
});
