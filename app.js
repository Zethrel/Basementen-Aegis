/**
 * CipherCraft App Controller
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
    ScandiCaesar
} from './ciphers.js';

// Application State
const state = {
    cipher: 'caesar',
    mode: 'encode',
    retainPunctuation: true,
    showProcess: true,
    history: []
};

// DOM Elements
const elements = {
    // Navigation
    cipherBtns: document.querySelectorAll('.cipher-select-btn'),
    // Modes
    modeSelector: document.querySelector('.mode-selector'),
    modeEncode: document.getElementById('mode-encode'),
    modeDecode: document.getElementById('mode-decode'),
    // Option Toggles
    optPunctuation: document.getElementById('option-punctuation'),
    optProcess: document.getElementById('option-process'),
    processSection: document.getElementById('process-section'),
    // Inputs & Parameters
    paramCaesar: document.getElementById('param-caesar'),
    paramScandicaesar: document.getElementById('param-scandicaesar'),
    paramVigenere: document.getElementById('param-vigenere'),
    paramRailfence: document.getElementById('param-railfence'),
    paramAnagram: document.getElementById('param-anagram'),
    paramNone: document.getElementById('param-none'),
    
    caesarShift: document.getElementById('caesar-shift'),
    shiftValue: document.getElementById('shift-value'),
    scandicaesarShift: document.getElementById('scandicaesar-shift'),
    scandicaesarShiftValue: document.getElementById('scandicaesar-shift-value'),
    scandicaesarLang: document.getElementById('scandicaesar-lang'),
    vigenereKey: document.getElementById('vigenere-key'),
    railfenceRails: document.getElementById('railfence-rails'),
    
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
    qrUrlText: document.getElementById('qr-url-text')
    
};

// Global PWA Install prompt pointer
let deferredPrompt = null;

// Debounce helper for auto-saving history
let historySaveTimeout = null;

/**
 * Initialize Application
 */
function init() {
    // Load config from LocalStorage if exists
    loadSavedState();
    
    // Initialize UI states
    setupUIFromState();
    
    // Bind Event Listeners
    bindEvents();
    
    // Register Service Worker
    registerServiceWorker();
    
    // Render History
    renderHistory();
    
    // Run initial conversion
    runConversion();
    
    // Initialize Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
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

    // Set Mode Active
    if (state.mode === 'encode') {
        elements.modeEncode.classList.add('active');
        elements.modeDecode.classList.remove('active');
    } else {
        elements.modeEncode.classList.remove('active');
        elements.modeDecode.classList.add('active');
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
    elements.paramCaesar.classList.remove('active-param');
    elements.paramScandicaesar.classList.remove('active-param');
    elements.paramVigenere.classList.remove('active-param');
    elements.paramRailfence.classList.remove('active-param');
    elements.paramAnagram.classList.remove('active-param');
    elements.paramNone.classList.remove('active-param');

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

    switch (state.cipher) {
        case 'caesar':
            elements.paramCaesar.classList.add('active-param');
            break;
        case 'scandicaesar':
            elements.paramScandicaesar.classList.add('active-param');
            break;
        case 'vigenere':
            elements.paramVigenere.classList.add('active-param');
            break;
        case 'railfence':
            elements.paramRailfence.classList.add('active-param');
            break;
        case 'anagram':
            elements.paramAnagram.classList.add('active-param');
            break;
        default:
            elements.paramNone.classList.add('active-param');
            break;
    }
}

/**
 * Bind DOM Event Listeners
 */
function bindEvents() {
    // Cipher Select Buttons
    elements.cipherBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            state.cipher = btn.dataset.cipher;
            saveConfigState();
            setupUIFromState();
            runConversion();
        });
    });

    // Mode Buttons
    elements.modeEncode.addEventListener('click', () => {
        state.mode = 'encode';
        elements.modeEncode.classList.add('active');
        elements.modeDecode.classList.remove('active');
        saveConfigState();
        runConversion();
    });

    elements.modeDecode.addEventListener('click', () => {
        state.mode = 'decode';
        elements.modeEncode.classList.remove('active');
        elements.modeDecode.classList.add('active');
        saveConfigState();
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

    // Scandi Caesar Shift Slider
    elements.scandicaesarShift.addEventListener('input', (e) => {
        elements.scandicaesarShiftValue.textContent = e.target.value;
        runConversion();
    });

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
            alert("Please paste using Ctrl+V or Cmd+V.");
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
    elements.btnCopy.addEventListener('click', () => {
        const text = elements.textOutput.value;
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            // Transient UI feedback
            const copyIcon = elements.btnCopy.querySelector('i');
            const originalIcon = copyIcon.getAttribute('data-lucide');
            copyIcon.setAttribute('data-lucide', 'check');
            if (window.lucide) window.lucide.createIcons();
            
            // Add immediately to history when they explicitly copy (as they finished working with it)
            saveToHistory(elements.textInput.value, text);
            
            setTimeout(() => {
                copyIcon.setAttribute('data-lucide', originalIcon);
                if (window.lucide) window.lucide.createIcons();
            }, 1500);
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
    const updateQrCode = (url) => {
        elements.qrUrlText.textContent = url;
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
        elements.qrImage.src = qrApiUrl;
    };

    elements.mobileBtn.addEventListener('click', () => {
        updateQrCode("https://kosejarl.github.io/starlight-cipher-suite/");
        elements.mobileModal.classList.remove('hidden');
    });

    elements.closeModalBtn.addEventListener('click', () => {
        elements.mobileModal.classList.add('hidden');
    });

    elements.mobileModal.addEventListener('click', (e) => {
        if (e.target === elements.mobileModal) {
            elements.mobileModal.classList.add('hidden');
        }
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
    } else {
        elements.connectionStatus.classList.remove('online');
        elements.connectionStatus.classList.add('offline');
        elements.connectionStatus.style.borderColor = 'rgba(245, 158, 11, 0.4)';
        elements.connectionStatus.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
        elements.connectionText.textContent = "Offline Mode";
    }
}

/**
 * Execute Cryptographic Conversion
 */
function runConversion() {
    const input = elements.textInput.value;
    if (!input) {
        elements.textOutput.value = '';
        elements.outputStats.textContent = '0 characters';
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
        
        const logContent = `Mode: Anagram Helper\n\n` +
            `Input Text:  "${input}"\n` +
            `Letters count: ${inputLetterCount}\n\n` +
            `Edit the output panel directly or click the Shuffle icon in the header to randomize.`;
        renderProcessLog({
            success: true,
            content: logContent,
            steps: []
        });
        
        elements.outputStats.textContent = `${elements.textOutput.value.length} characters`;
        return;
    }

    let resultObj = { result: '', steps: [] };

    // Select cipher algorithm
    try {
        switch (state.cipher) {
            case 'caesar': {
                const shift = parseInt(elements.caesarShift.value, 10);
                resultObj = state.mode === 'encode' 
                    ? Caesar.encode(input, shift, state.retainPunctuation) 
                    : Caesar.decode(input, shift, state.retainPunctuation);
                break;
            }
            case 'scandicaesar': {
                const shift = parseInt(elements.scandicaesarShift.value, 10);
                const variant = elements.scandicaesarLang.value;
                resultObj = state.mode === 'encode' 
                    ? ScandiCaesar.encode(input, shift, variant, state.retainPunctuation) 
                    : ScandiCaesar.decode(input, shift, variant, state.retainPunctuation);
                break;
            }
            case 'rot13':
                resultObj = state.mode === 'encode'
                    ? Rot13.encode(input, null, state.retainPunctuation)
                    : Rot13.decode(input, null, state.retainPunctuation);
                break;
            case 'atbash':
                resultObj = state.mode === 'encode'
                    ? Atbash.encode(input, null, state.retainPunctuation)
                    : Atbash.decode(input, null, state.retainPunctuation);
                break;
            case 'vigenere': {
                const key = elements.vigenereKey.value;
                resultObj = state.mode === 'encode'
                    ? Vigenere.encode(input, key, state.retainPunctuation)
                    : Vigenere.decode(input, key, state.retainPunctuation);
                break;
            }
            case 'railfence': {
                const rails = parseInt(elements.railfenceRails.value, 10);
                resultObj = state.mode === 'encode'
                    ? RailFence.encode(input, rails, state.retainPunctuation)
                    : RailFence.decode(input, rails, state.retainPunctuation);
                break;
            }
            case 'binary':
                resultObj = state.mode === 'encode'
                    ? BinaryConverter.encode(input, null, state.retainPunctuation)
                    : BinaryConverter.decode(input, null, state.retainPunctuation);
                break;
            case 'a1z26':
                resultObj = state.mode === 'encode'
                    ? A1z26.encode(input, null, state.retainPunctuation)
                    : A1z26.decode(input, null, state.retainPunctuation);
                break;
            case 'binreverse': {
                resultObj = state.mode === 'encode'
                    ? BinaryReverse.encode(input, 'fixed', state.retainPunctuation)
                    : BinaryReverse.decode(input, 'fixed', state.retainPunctuation);
                break;
            }
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
 * Format system name to readable name
 */
function getFriendlyCipherName(id) {
    const names = {
        caesar: 'Caesar',
        rot13: 'ROT13',
        atbash: 'Atbash',
        vigenere: 'Vigenere',
        railfence: 'Rail Fence',
        binary: 'Binary',
        a1z26: 'A1Z26',
        binreverse: 'Binary Reverse'
    };
    return names[id] || id;
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
 * Register Service Worker for offline capability
 */
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

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // Note: service worker path relative to root
            navigator.serviceWorker.register('./sw.js')
                .then(reg => {
                    console.log('ServiceWorker registration successful with scope: ', reg.scope);
                })
                .catch(err => {
                    console.warn('ServiceWorker registration failed: ', err);
                });
        });
    }
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
