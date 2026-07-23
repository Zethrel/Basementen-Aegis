/**
 * Basementen Aegis - Cipher Registry
 */

import {
    Caesar,
    Rot13,
    Atbash,
    Vigenere,
    Affine,
    Playfair,
    Polybius,
    Bacon,
    RailFence,
    BinaryConverter,
    A1z26,
    BinaryReverse,
    Futhark,
    Morse,
    CaesarBruteForce
} from './ciphers.js';
import { elements } from './dom.js';

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
export const CIPHERS = [
    {
        id: 'a1z26', name: 'A1Z26 Cipher', shortName: 'A1Z26', icon: 'hash', paramGroup: 'param-a1z26',
        run: (input, mode, opts) => {
            const variant = elements.a1z26Alphabet.value;
            return mode === 'encode'
                ? A1z26.encode(input, variant, opts.retainPunctuation)
                : A1z26.decode(input, variant, opts.retainPunctuation);
        }
    },
    {
        id: 'affine', name: 'Affine Cipher', shortName: 'Affine', icon: 'function-square', paramGroup: 'param-affine',
        run: (input, mode, opts) => {
            const a = parseInt(elements.affineA.value, 10);
            const b = parseInt(elements.affineB.value, 10);
            return mode === 'encode'
                ? Affine.encode(input, a, b, opts.retainPunctuation)
                : Affine.decode(input, a, b, opts.retainPunctuation);
        }
    },
    {
        id: 'anagram', name: 'Anagram Helper', shortName: 'Anagram', icon: 'shuffle',
        badge: { text: 'Helper', className: 'badge-helper' }, paramGroup: 'param-anagram',
        modeless: true
    },
    {
        id: 'bacon', name: "Bacon's Cipher", shortName: 'Bacon', icon: 'binary', paramGroup: 'param-none',
        run: (input, mode, opts) => mode === 'encode'
            ? Bacon.encode(input, null, opts.retainPunctuation)
            : Bacon.decode(input, null, opts.retainPunctuation)
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
        badge: { text: 'Custom' }, paramGroup: 'param-binreverse',
        run: (input, mode, opts) => {
            const formatMode = elements.binreverseFormat.value;
            return mode === 'encode'
                ? BinaryReverse.encode(input, formatMode, opts.retainPunctuation)
                : BinaryReverse.decode(input, formatMode, opts.retainPunctuation);
        }
    },
    {
        id: 'caesarbrute', name: 'Caesar Brute Force', shortName: 'Caesar Brute', icon: 'search',
        badge: { text: 'Helper', className: 'badge-helper' }, paramGroup: 'param-caesarbrute',
        modeless: true,
        ioLabels: { input: 'Ciphertext Input', output: 'Candidate Plaintext' },
        run: (input) => {
            const { candidates, steps } = CaesarBruteForce.analyze(input, elements.caesarbruteAlphabet.value);
            if (elements.caesarbruteShowAll.checked) {
                return { result: CaesarBruteForce.formatAll(candidates), steps };
            }
            // Show only the slider-selected shift, clamped to the alphabet size
            const shift = Math.min(parseInt(elements.caesarbruteShift.value, 10) || 0, candidates.length - 1);
            const candidate = candidates[shift];
            steps.push({
                title: `Candidate at Shift ${String(candidate.shift).padStart(2, '0')}`,
                content: candidate.decoded
            });
            return { result: candidate.decoded, steps };
        }
    },
    {
        id: 'caesar', name: 'Caesar Cipher', shortName: 'Caesar', icon: 'key-round', paramGroup: 'param-caesar',
        run: (input, mode, opts) => {
            const shift = parseInt(elements.caesarShift.value, 10);
            const variant = elements.caesarAlphabet.value;
            return mode === 'encode'
                ? Caesar.encode(input, shift, variant, opts.retainPunctuation)
                : Caesar.decode(input, shift, variant, opts.retainPunctuation);
        }
    },
    {
        id: 'futhark', name: 'Elder Futhark', shortName: 'Futhark', icon: 'scroll',
        badge: { text: 'Runes', className: 'badge-scandi' }, paramGroup: 'param-futhark',
        run: (input, mode, opts) => mode === 'encode'
            ? Futhark.encode(input, null, opts.retainPunctuation)
            : Futhark.decode(input, null, opts.retainPunctuation)
    },
    {
        id: 'morse', name: 'Morse Code', shortName: 'Morse', icon: 'radio', paramGroup: 'param-none',
        run: (input, mode, opts) => mode === 'encode'
            ? Morse.encode(input, null, opts.retainPunctuation)
            : Morse.decode(input, null, opts.retainPunctuation)
    },
    {
        id: 'playfair', name: 'Playfair Cipher', shortName: 'Playfair', icon: 'grid-3x3', paramGroup: 'param-playfair',
        run: (input, mode) => {
            const keyword = elements.playfairKey.value;
            return mode === 'encode'
                ? Playfair.encode(input, keyword)
                : Playfair.decode(input, keyword);
        }
    },
    {
        id: 'polybius', name: 'Polybius Square', shortName: 'Polybius', icon: 'grid-3x3', paramGroup: 'param-none',
        run: (input, mode, opts) => mode === 'encode'
            ? Polybius.encode(input, null, opts.retainPunctuation)
            : Polybius.decode(input, null, opts.retainPunctuation)
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

export function getCipher(id) {
    return CIPHERS.find(c => c.id === id) || null;
}

/**
 * Generate the sidebar buttons from the registry.
 */
export function renderCipherNav() {
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
