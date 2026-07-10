/**
 * Basementen Aegis - DOM Element Registry
 * Every element the controllers touch, looked up once at load time.
 */

// DOM Elements
export const elements = {
    // Navigation (assigned in init() after renderCipherNav() generates the buttons)
    cipherBtns: null,
    // Modes
    modeSelector: document.querySelector('.mode-selector'),
    modeEncode: document.getElementById('mode-encode'),
    modeDecode: document.getElementById('mode-decode'),
    // Option Toggles
    optPunctuation: document.getElementById('option-punctuation'),
    optProcess: document.getElementById('option-process'),
    optFullSteps: document.getElementById('option-full-steps'),
    processSection: document.getElementById('process-section'),
    // Inputs & Parameters (param-group panels are looked up by id via the registry)
    caesarShift: document.getElementById('caesar-shift'),
    shiftValue: document.getElementById('shift-value'),
    caesarShiftMax: document.getElementById('caesar-shift-max'),
    caesarShiftDown: document.getElementById('caesar-shift-down'),
    caesarShiftUp: document.getElementById('caesar-shift-up'),
    caesarAlphabet: document.getElementById('caesar-alphabet'),
    caesarbruteAlphabet: document.getElementById('caesarbrute-alphabet'),
    caesarbruteShift: document.getElementById('caesarbrute-shift'),
    caesarbruteShiftValue: document.getElementById('caesarbrute-shift-value'),
    caesarbruteShiftMax: document.getElementById('caesarbrute-shift-max'),
    caesarbruteShiftDown: document.getElementById('caesarbrute-shift-down'),
    caesarbruteShiftUp: document.getElementById('caesarbrute-shift-up'),
    caesarbruteShowAll: document.getElementById('caesarbrute-showall'),
    caesarbruteSliderGroup: document.getElementById('caesarbrute-slider-group'),
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
    
    // Process Panel
    processLog: document.getElementById('process-log'),

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
    basementenTxVerifying: document.getElementById('basementen-tx-verifying'),
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
