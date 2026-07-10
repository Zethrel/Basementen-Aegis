/**
 * Basementen Aegis - App Controller
 * Entry module: wires the cipher registry, state, vault, and history
 * modules to the page — initialization, conversion dispatch, the process
 * panel, and all cipher-agnostic event handlers.
 */

import { CAESAR_ALPHABETS } from './ciphers.js';
import { elements } from './dom.js';
import { state, loadSavedState, saveConfigState } from './state.js';
import { getCipher, renderCipherNav } from './registry.js';
import { openModal, closeModal, registerModal, showToast } from './ui.js';
import {
    vaultSession, lockBasementenSession, handleBasementenAccess, bindVaultEvents,
    saveToHistory, triggerHistoryAutoSave
} from './vault.js';

// Global PWA Install prompt pointer
let deferredPrompt = null;

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

    // Desktop build: the launcher opens desktop.html, which wipes any service
    // worker + caches left by older builds and then adds this flag. The exe's
    // bundled files are always current, so a service worker here would only
    // reintroduce stale-cache bugs — never register one on desktop.
    if (new URLSearchParams(window.location.search).has('desktop')) return;

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
 * Configure UI elements based on state
 */
export function setupUIFromState() {
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

    // Registry entries can override the mode-based panel titles
    // (e.g. the brute-force helper takes ciphertext regardless of mode)
    const titleEntry = getCipher(state.cipher);
    if (titleEntry && titleEntry.ioLabels) {
        elements.inputPanelTitle.textContent = titleEntry.ioLabels.input;
        elements.outputPanelTitle.textContent = titleEntry.ioLabels.output;
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
            
            if (vaultSession.txValid) {
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
            
            if (vaultSession.decryptedKey !== null) {
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

    // Modeless tools (helpers) have no encode/decode distinction: force
    // encode mode and hide the selector.
    const activeEntry = getCipher(state.cipher);
    if (activeEntry && activeEntry.modeless) {
        state.mode = 'encode';
        elements.modeEncode.classList.add('active');
        elements.modeDecode.classList.remove('active');
        elements.modeSelector.classList.add('hidden');
    } else {
        elements.modeSelector.classList.remove('hidden');
    }

    // Anagram-specific output panel behavior (editable output + shuffle)
    if (state.cipher === 'anagram') {
        elements.textOutput.readOnly = false;
        elements.textOutput.placeholder = "Type your anagram here...";
        elements.btnShuffleOutput.classList.remove('hidden');
        // Auto-scramble on first load if output is empty
        if (!elements.textOutput.value && elements.textInput.value) {
            scrambleInputToOutput();
        }
    } else {
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
    // Start from the loaded cipher (not a hardcoded default) so cancelling the
    // very first Basementen unlock returns to where the user actually was.
    let previousCipher = state.cipher !== 'basementen' ? state.cipher : 'caesar';
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

    // Caesar Shift Slider (drags fire dozens of events/sec; label updates
    // instantly, the conversion itself is coalesced)
    elements.caesarShift.addEventListener('input', (e) => {
        elements.shiftValue.textContent = e.target.value;
        scheduleConversion(50);
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

    // Caesar Alphabet Select: the slider's range follows the alphabet size
    // (0-25 for English, 0-28 for the 29-letter Scandinavian variants).
    elements.caesarAlphabet.addEventListener('change', () => {
        const alphabet = CAESAR_ALPHABETS[elements.caesarAlphabet.value] || CAESAR_ALPHABETS['en'];
        const max = alphabet.upper.length - 1;
        elements.caesarShift.max = max;
        elements.caesarShiftMax.textContent = max;
        if (parseInt(elements.caesarShift.value, 10) > max) {
            elements.caesarShift.value = max;
        }
        elements.shiftValue.textContent = elements.caesarShift.value;
        runConversion();
    });

    // Caesar Brute Force: alphabet select re-ranges the shift slider,
    // the slider scans one candidate at a time, and "Show all shifts"
    // switches the output to the full candidate listing.
    elements.caesarbruteAlphabet.addEventListener('change', () => {
        const alphabet = CAESAR_ALPHABETS[elements.caesarbruteAlphabet.value] || CAESAR_ALPHABETS['en'];
        const max = alphabet.upper.length - 1;
        elements.caesarbruteShift.max = max;
        elements.caesarbruteShiftMax.textContent = max;
        if (parseInt(elements.caesarbruteShift.value, 10) > max) {
            elements.caesarbruteShift.value = max;
        }
        elements.caesarbruteShiftValue.textContent = elements.caesarbruteShift.value;
        runConversion();
    });

    elements.caesarbruteShift.addEventListener('input', (e) => {
        elements.caesarbruteShiftValue.textContent = e.target.value;
        scheduleConversion(50);
    });

    elements.caesarbruteShiftDown.addEventListener('click', () => nudgeSlider(elements.caesarbruteShift, -1));
    elements.caesarbruteShiftUp.addEventListener('click', () => nudgeSlider(elements.caesarbruteShift, 1));

    elements.caesarbruteShowAll.addEventListener('change', (e) => {
        // The slider has no effect while every shift is listed; gray it out.
        elements.caesarbruteSliderGroup.classList.toggle('control-disabled', e.target.checked);
        elements.caesarbruteShift.disabled = e.target.checked;
        elements.caesarbruteShiftDown.disabled = e.target.checked;
        elements.caesarbruteShiftUp.disabled = e.target.checked;
        runConversion();
    });

    // Vigenere Key input
    elements.vigenereKey.addEventListener('input', (e) => {
        // Filter input to letters only
        const filtered = e.target.value.replace(/[^A-Za-z]/g, '');
        if (filtered !== e.target.value) {
            e.target.value = filtered;
        }
        scheduleConversion();
    });

    // Rail Fence Rails input
    elements.railfenceRails.addEventListener('input', () => {
        scheduleConversion();
    });



    // TextArea Events (typing is coalesced; the character counter stays live)
    elements.textInput.addEventListener('input', () => {
        enforceInputLimits();
        elements.inputStats.textContent = `${elements.textInput.value.length} characters`;
        if (state.cipher === 'anagram') {
            scrambleInputToOutput();
        } else {
            scheduleConversion();
        }
        triggerHistoryAutoSave();
    });

    elements.textOutput.addEventListener('input', () => {
        elements.outputStats.textContent = `${elements.textOutput.value.length} characters`;
        if (state.cipher === 'anagram') {
            scheduleConversion();
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
            enforceInputLimits();
            elements.inputStats.textContent = `${elements.textInput.value.length} characters`;
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
        updateQrCode("https://zethrel.github.io/Basementen-Aegis/");
        openModal(elements.mobileModal);
    });

    elements.closeModalBtn.addEventListener('click', () => {
        closeModal(elements.mobileModal);
    });

    // Escape / overlay-click dismissal for every modal. Registration order
    // matters for stacking: modals registered later win the Escape key while
    // visible. The Basementen listeners + its modal registrations live in
    // vault.js; bound here so those modals register between mobile and
    // confirm, preserving the stacking order.
    registerModal(elements.mobileModal, () => closeModal(elements.mobileModal));
    bindVaultEvents();
    // Registered last: the confirm dialog can stack on top of any other modal.
    registerModal(elements.confirmModal, () => elements.confirmModalCancel.click());

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
        elements.connectionText.textContent = "Cached";
        elements.connectionStatus.title = "Online — app cached for offline use";
    } else {
        elements.connectionStatus.classList.remove('online');
        elements.connectionStatus.classList.add('offline');
        elements.connectionText.textContent = "Offline Mode";
        elements.connectionStatus.title = "Offline — running from local cache";
    }
}

/**
 * Execute Cryptographic Conversion
 * (async because The Basementen encrypts via WebCrypto; other ciphers are sync)
 */
// Monotonic run id: async ciphers (The Basementen) can resolve out of order
// under fast typing, so stale results must never overwrite newer ones.
let conversionRunId = 0;

/* --------------------------------------------------------------------------
   Input size guardrails. The process panel renders one step line per
   character, so unbounded pastes mean multi-megabyte DOM text and a frozen
   tab. Past the soft limit we warn once; past the hard limit we truncate.
   Vault/password fields are separate inputs and are never limited.
   -------------------------------------------------------------------------- */
const INPUT_SOFT_LIMIT = 10000;
const INPUT_HARD_LIMIT = 50000;
let softLimitWarned = false;
let hardLimitWarned = false;

function enforceInputLimits() {
    let len = elements.textInput.value.length;

    if (len > INPUT_HARD_LIMIT) {
        elements.textInput.value = elements.textInput.value.slice(0, INPUT_HARD_LIMIT);
        len = INPUT_HARD_LIMIT;
        if (!hardLimitWarned) {
            hardLimitWarned = true;
            showToast(`Input truncated: the maximum is ${INPUT_HARD_LIMIT.toLocaleString()} characters.`, 'error', 5000);
        }
    } else if (len < INPUT_HARD_LIMIT) {
        hardLimitWarned = false; // re-arm once back under the cap
    }

    if (len > INPUT_SOFT_LIMIT) {
        if (!softLimitWarned) {
            softLimitWarned = true;
            showToast(`Large input (over ${INPUT_SOFT_LIMIT.toLocaleString()} characters) — processing may be slow on this device.`, 'warning', 5000);
        }
    } else {
        softLimitWarned = false; // re-arm once back under the threshold
    }
}

// Trailing debounce for high-frequency sources (typing, slider drags):
// coalesces bursts of input events into one conversion. One-shot actions
// (mode/cipher switches, toggles, paste) still call runConversion() directly
// for instant feedback — a direct call supersedes any pending scheduled run.
let conversionDebounce = null;

function scheduleConversion(delay = 75) {
    if (conversionDebounce) clearTimeout(conversionDebounce);
    conversionDebounce = setTimeout(() => {
        conversionDebounce = null;
        runConversion();
    }, delay);
}

export async function runConversion() {
    // An immediate run makes any pending debounced run redundant.
    if (conversionDebounce) {
        clearTimeout(conversionDebounce);
        conversionDebounce = null;
    }
    const runId = ++conversionRunId;
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

    // A newer conversion started while this one was awaiting; drop this result.
    if (runId !== conversionRunId) return;

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

        // Built with textContent (not innerHTML) so a step title can never
        // inject markup, even if a future cipher echoes user input in it.
        const stepTitle = document.createElement('div');
        stepTitle.className = 'process-step-title';
        const badgeDot = document.createElement('span');
        badgeDot.className = 'badge-dot';
        stepTitle.appendChild(badgeDot);
        stepTitle.appendChild(document.createTextNode(` Step ${idx + 1}: ${step.title}`));

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

// Start the app
document.addEventListener('DOMContentLoaded', () => {
    init();
    
    // Auto-prompt if basementen was the saved active cipher on startup
    if (state.cipher === 'basementen') {
        handleBasementenAccess('caesar');
    }
});
