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
    optCarryText: document.getElementById('option-carry-text'),
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
    a1z26Alphabet: document.getElementById('a1z26-alphabet'),
    binreverseFormat: document.getElementById('binreverse-format'),
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
    affineVariant: document.getElementById('affine-alphabet'),
    affineA: document.getElementById('affine-a'),
    affineB: document.getElementById('affine-b'),
    affineBValue: document.getElementById('affine-b-value'),
    affineBMax: document.getElementById('affine-b-max'),
    affineBDown: document.getElementById('affine-b-down'),
    affineBUp: document.getElementById('affine-b-up'),
    playfairVariant: document.getElementById('playfair-alphabet'),
    playfairKey: document.getElementById('playfair-key'),
    foursquareVariant: document.getElementById('foursquare-alphabet'),
    foursquareKey1: document.getElementById('foursquare-key1'),
    foursquareKey2: document.getElementById('foursquare-key2'),
    bifidVariant: document.getElementById('bifid-alphabet'),
    bifidKey: document.getElementById('bifid-key'),
    gronsfeldVariant: document.getElementById('gronsfeld-alphabet'),
    gronsfeldKey: document.getElementById('gronsfeld-key'),
    beaufortVariant: document.getElementById('beaufort-alphabet'),
    beaufortKey: document.getElementById('beaufort-key'),
    autokeyVariant: document.getElementById('autokey-alphabet'),
    autokeyKey: document.getElementById('autokey-key'),
    keywordSubVariant: document.getElementById('keyword-sub-alphabet'),
    keywordSubKey: document.getElementById('keyword-sub-key'),
    columnarKey: document.getElementById('columnar-key'),
    scytaleCols: document.getElementById('scytale-cols'),
    scytaleColsValue: document.getElementById('scytale-cols-value'),
    scytaleColsDown: document.getElementById('scytale-cols-down'),
    scytaleColsUp: document.getElementById('scytale-cols-up'),
    polybiusVariant: document.getElementById('polybius-alphabet'),
    baconVariant: document.getElementById('bacon-alphabet'),
    railfenceRails: document.getElementById('railfence-rails'),
    railfenceError: document.getElementById('railfence-error'),
    
    btnShuffleOutput: document.getElementById('btn-shuffle-output'),
    
    textInput: document.getElementById('text-input'),
    textOutput: document.getElementById('text-output'),
    inputStats: document.getElementById('input-stats'),
    outputStats: document.getElementById('output-stats'),
    
    // Header, Footer & Actions
    appVersion: document.getElementById('app-version'),
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

    // Shared confirmation modal
    confirmModal: document.getElementById('confirm-modal'),
    confirmModalTitle: document.getElementById('confirm-modal-title'),
    confirmModalMessage: document.getElementById('confirm-modal-message'),
    confirmModalTypeGroup: document.getElementById('confirm-modal-type-group'),
    confirmModalTypeLabel: document.getElementById('confirm-modal-type-label'),
    confirmModalTypeInput: document.getElementById('confirm-modal-type-input'),
    confirmModalCancel: document.getElementById('confirm-modal-cancel'),
    confirmModalOk: document.getElementById('confirm-modal-ok'),
    
    // Panel titles
    inputPanelTitle: document.getElementById('input-panel-title'),
    outputPanelTitle: document.getElementById('output-panel-title')
};

// Startup sanity check: warn (never crash) about any registered id that no
// longer exists in index.html — catches refactor typos the moment the page
// loads instead of as a mystery null error later. cipherBtns is null by
// design until renderCipherNav() runs in init().
for (const [name, el] of Object.entries(elements)) {
    if (el === null && name !== 'cipherBtns') {
        console.warn(`dom.js: element '${name}' was not found in the document`);
    }
}
