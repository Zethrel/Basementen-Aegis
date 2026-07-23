/**
 * Basementen Aegis - Core Cipher Algorithms
 * All functions return an object: { result: string, steps: Array<{ title: string, content: string }> }
 */

// Helper: Check if character is uppercase
function isUpper(char) {
    return char >= 'A' && char <= 'Z';
}

// Helper: Check if character is lowercase
function isLower(char) {
    return char >= 'a' && char <= 'z';
}

// Helper: Check if character is alphabetic
function isLetter(char) {
    return isUpper(char) || isLower(char);
}

// Helper: Get alphabet position (0-25)
function getAlphabetIndex(char) {
    if (isUpper(char)) return char.charCodeAt(0) - 65;
    if (isLower(char)) return char.charCodeAt(0) - 97;
    return -1;
}

// Helper: Get letter from alphabet index (0-25) and casing
function getLetterFromIndex(index, isUppercase) {
    const base = isUppercase ? 65 : 97;
    return String.fromCharCode(base + index);
}

/**
 * Shared per-character loop used by simple substitution ciphers (Caesar, Atbash,
 * Vigenere). Spaces are always preserved; other non-letter characters
 * are retained or skipped per `retainPunctuation`. `transformLetter(char)` should
 * return { char, step } for recognized letters, or null to fall through to the
 * space/punctuation handling.
 */
function processChars(text, retainPunctuation, transformLetter) {
    let result = '';
    const letterSteps = [];

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const transformed = transformLetter(char, i);
        if (transformed) {
            result += transformed.char;
            letterSteps.push(transformed.step);
        } else if (char === ' ') {
            result += ' ';
            letterSteps.push(`Space character preserved`);
        } else if (retainPunctuation) {
            result += char;
            letterSteps.push(`Punctuation '${char}' retained`);
        } else {
            letterSteps.push(`Punctuation '${char}' skipped`);
        }
    }

    return { result, letterSteps };
}

/* --------------------------------------------------------------------------
   Per-character step summarization. Long inputs would otherwise dump one
   line per character into the process panel (megabytes of DOM text at the
   input cap). Beyond the limit, show the first and last few steps with an
   omission marker; the UI's "Full step detail" toggle flips the module flag
   and re-runs the conversion for a complete audit trail.
   -------------------------------------------------------------------------- */
const STEP_DETAIL_LIMIT = 60; // full detail up to this many step lines
const STEP_EDGE_COUNT = 10;   // lines kept from each end when summarizing

let fullStepDetail = false;

export function setFullStepDetail(on) {
    fullStepDetail = !!on;
}

function summarizeSteps(lines) {
    if (fullStepDetail || lines.length <= STEP_DETAIL_LIMIT) {
        return lines.join('\n');
    }
    const omitted = lines.length - STEP_EDGE_COUNT * 2;
    return [
        ...lines.slice(0, STEP_EDGE_COUNT),
        `··· ${omitted} steps omitted (${lines.length} total — enable "Full step detail" to see everything) ···`,
        ...lines.slice(-STEP_EDGE_COUNT)
    ].join('\n');
}

/**
 * 1. CAESAR CIPHER
 * One cipher, three alphabets: plain English A-Z or the Scandinavian
 * variants with their three extra letters, selected by the `variant`
 * parameter. The shift wraps across the full chosen alphabet (26 or 29
 * letters), so 'z' + 3 is 'c' in English but 'å' in Danish/Norwegian.
 */
export const CAESAR_ALPHABETS = {
    'en': {
        label: 'English (26 letters)',
        upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        lower: "abcdefghijklmnopqrstuvwxyz"
    },
    'dk-no': {
        label: 'Danish/Norwegian (29 letters)',
        upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ",
        lower: "abcdefghijklmnopqrstuvwxyzæøå"
    },
    'se': {
        label: 'Swedish (29 letters)',
        upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ",
        lower: "abcdefghijklmnopqrstuvwxyzåäö"
    }
};

function caesarRun(text, shift, variant, retainPunctuation, direction) {
    const alphabet = CAESAR_ALPHABETS[variant] || CAESAR_ALPHABETS['en'];
    const upper = alphabet.upper;
    const lower = alphabet.lower;
    const size = upper.length;
    shift = parseInt(shift, 10) || 0;
    shift = ((shift % size) + size) % size; // Normalize shift

    const encoding = direction === 'encode';
    const steps = [{
        title: "Configuration",
        content: `Mode: ${encoding ? 'Encode' : 'Decode'}\nAlphabet: ${alphabet.label}\nShift Key: ${shift}\nRetain Punctuation: ${retainPunctuation ? 'Yes' : 'No'}`
    }];

    const { result, letterSteps } = processChars(text, retainPunctuation, (char) => {
        const alphabetStr = upper.indexOf(char) !== -1 ? upper : (lower.indexOf(char) !== -1 ? lower : null);
        if (!alphabetStr) return null;
        const index = alphabetStr.indexOf(char);
        const newIndex = encoding ? (index + shift) % size : (index - shift + size) % size;
        const newChar = alphabetStr[newIndex];
        return { char: newChar, step: `'${char}' (index ${index}) ${encoding ? '+' : '-'} Shift ${shift} -> index ${newIndex} -> '${newChar}'` };
    });

    steps.push({ title: "Character Processing", content: summarizeSteps(letterSteps) });
    return { result, steps };
}

export const Caesar = {
    encode(text, shift, variant, retainPunctuation) {
        return caesarRun(text, shift, variant, retainPunctuation, 'encode');
    },

    decode(text, shift, variant, retainPunctuation) {
        return caesarRun(text, shift, variant, retainPunctuation, 'decode');
    }
};

/**
 * 2. ROT13 CIPHER
 */
export const Rot13 = {
    encode(text, _, retainPunctuation) {
        const steps = [{
            title: "ROT13 Characteristics",
            content: "ROT13 is a special case of Caesar cipher with a fixed shift of 13.\nIt is self-reciprocal, meaning the same algorithm is used to encode and decode."
        }];
        const run = Caesar.encode(text, 13, 'en', retainPunctuation);
        steps.push(...run.steps.slice(1)); // Reuse character processing steps
        return { result: run.result, steps };
    },
    decode(text, _, retainPunctuation) {
        const steps = [{
            title: "ROT13 Characteristics",
            content: "ROT13 is a special case of Caesar cipher with a fixed shift of 13.\nIt is self-reciprocal, meaning decoding is identical to encoding (shifting by 13 again)."
        }];
        const run = Caesar.decode(text, 13, 'en', retainPunctuation);
        steps.push(...run.steps.slice(1));
        return { result: run.result, steps };
    }
};

/**
 * 3. ATBASH CIPHER
 */
export const Atbash = {
    encode(text, _, retainPunctuation) {
        const steps = [{
            title: "Atbash Rule",
            content: "Atbash is a monoalphabetic substitution cipher where the alphabet is reversed:\nA <-> Z, B <-> Y, C <-> X, etc."
        }];

        const { result, letterSteps } = processChars(text, retainPunctuation, (char) => {
            if (!isLetter(char)) return null;
            const isUppercase = isUpper(char);
            const originalIndex = getAlphabetIndex(char);
            const newIndex = 25 - originalIndex;
            const encodedChar = getLetterFromIndex(newIndex, isUppercase);
            return { char: encodedChar, step: `'${char}' (index ${originalIndex}) -> Reversed index ${newIndex} -> '${encodedChar}'` };
        });

        steps.push({ title: "Character Processing", content: summarizeSteps(letterSteps) });
        return { result, steps };
    },
    decode(text, _, retainPunctuation) {
        // Atbash is also self-reciprocal
        return Atbash.encode(text, _, retainPunctuation);
    }
};

/**
 * 4. VIGENERE CIPHER
 */
export const Vigenere = {
    encode(text, key, retainPunctuation) {
        key = (key || '').replace(/[^A-Za-z]/g, '').toUpperCase();
        if (!key) {
            // Blank output rather than passing plaintext through: a user might
            // otherwise copy their unencoded message believing it was encoded.
            return { result: '', steps: [{ title: "Error", content: "Keyword is empty or invalid. Please provide a key with letters. Output cleared." }] };
        }

        const steps = [{
            title: "Configuration",
            content: `Mode: Encode\nKeyword: ${key}\nRetain Punctuation: ${retainPunctuation ? 'Yes' : 'No'}`
        }];

        let keyIdx = 0;
        const { result, letterSteps } = processChars(text, retainPunctuation, (char) => {
            if (!isLetter(char)) return null;
            const isUppercase = isUpper(char);
            const plainIdx = getAlphabetIndex(char);
            const keyChar = key[keyIdx % key.length];
            const shift = getAlphabetIndex(keyChar);
            const cipherIdx = (plainIdx + shift) % 26;
            const encodedChar = getLetterFromIndex(cipherIdx, isUppercase);
            keyIdx++; // Only advance key for letters
            return { char: encodedChar, step: `'${char}' (index ${plainIdx}) + Key '${keyChar}' (shift ${shift}) -> index ${cipherIdx} -> '${encodedChar}'` };
        });

        steps.push({ title: "Key Alignment & Shifts", content: summarizeSteps(letterSteps) });
        return { result, steps };
    },

    decode(text, key, retainPunctuation) {
        key = (key || '').replace(/[^A-Za-z]/g, '').toUpperCase();
        if (!key) {
            return { result: '', steps: [{ title: "Error", content: "Keyword is empty or invalid. Please provide a key with letters. Output cleared." }] };
        }

        const steps = [{
            title: "Configuration",
            content: `Mode: Decode\nKeyword: ${key}\nRetain Punctuation: ${retainPunctuation ? 'Yes' : 'No'}`
        }];

        let keyIdx = 0;
        const { result, letterSteps } = processChars(text, retainPunctuation, (char) => {
            if (!isLetter(char)) return null;
            const isUppercase = isUpper(char);
            const cipherIdx = getAlphabetIndex(char);
            const keyChar = key[keyIdx % key.length];
            const shift = getAlphabetIndex(keyChar);
            const plainIdx = (cipherIdx - shift + 26) % 26;
            const decodedChar = getLetterFromIndex(plainIdx, isUppercase);
            keyIdx++;
            return { char: decodedChar, step: `'${char}' (index ${cipherIdx}) - Key '${keyChar}' (shift ${shift}) -> index ${plainIdx} -> '${decodedChar}'` };
        });

        steps.push({ title: "Key Alignment & Shifts", content: summarizeSteps(letterSteps) });
        return { result, steps };
    }
};

/**
 * GRONSFELD CIPHER
 * A Vigenère variant keyed by a string of digits instead of a keyword: each
 * digit 0-9 is the shift for its position, cycling over the recognized letters
 * of the chosen alphabet (`variant` → CAESAR_ALPHABETS; m = 26 English, 29
 * Scandinavian). Because every shift is 0-9, it is weaker than Vigenère but a
 * neat bridge between Caesar and Vigenère.
 */
function gronsfeldRun(text, key, variant, retainPunctuation, direction) {
    const digits = (key || '').replace(/[^0-9]/g, '');
    if (!digits) {
        return { result: '', steps: [{ title: 'Error', content: 'Key is empty or invalid. Enter a key of digits (0-9). Output cleared.' }] };
    }
    const alphabet = CAESAR_ALPHABETS[variant] || CAESAR_ALPHABETS['en'];
    const upper = alphabet.upper, lower = alphabet.lower, size = upper.length;
    const encoding = direction === 'encode';
    const steps = [{
        title: 'Configuration',
        content: `Mode: ${encoding ? 'Encode' : 'Decode'}\nAlphabet: ${alphabet.label}\nNumeric Key: ${digits}\nRetain Punctuation: ${retainPunctuation ? 'Yes' : 'No'}`
    }];

    let keyIdx = 0;
    const { result, letterSteps } = processChars(text, retainPunctuation, (char) => {
        const alphabetStr = upper.indexOf(char) !== -1 ? upper : (lower.indexOf(char) !== -1 ? lower : null);
        if (!alphabetStr) return null;
        const index = alphabetStr.indexOf(char);
        const shift = parseInt(digits[keyIdx % digits.length], 10);
        const newIndex = encoding ? (index + shift) % size : (index - shift + size) % size;
        const newChar = alphabetStr[newIndex];
        keyIdx++; // advance the key only on recognized letters
        return { char: newChar, step: `'${char}' (index ${index}) ${encoding ? '+' : '-'} digit ${shift} -> index ${newIndex} -> '${newChar}'` };
    });

    steps.push({ title: 'Key Alignment & Shifts', content: summarizeSteps(letterSteps) });
    return { result, steps };
}

export const Gronsfeld = {
    encode(text, key, variant, retainPunctuation) { return gronsfeldRun(text, key, variant, retainPunctuation, 'encode'); },
    decode(text, key, variant, retainPunctuation) { return gronsfeldRun(text, key, variant, retainPunctuation, 'decode'); }
};

/**
 * BEAUFORT & AUTOKEY (Vigenère family)
 * Both cycle a keyword over the recognized letters of the chosen alphabet
 * (`variant` → CAESAR_ALPHABETS; m = 26 English, 29 Scandinavian). Key
 * characters not in the alphabet are ignored.
 */
function keyIndices(key, upper) {
    return (key || '')
        .toUpperCase()
        .split('')
        .filter((ch) => upper.indexOf(ch) !== -1)
        .map((ch) => upper.indexOf(ch));
}

/**
 * BEAUFORT — c = (k − p) mod m. It is reciprocal: applying it again with the
 * same key recovers the plaintext, so encode and decode are one operation.
 */
function beaufortRun(text, key, variant, retainPunctuation, mode) {
    const alphabet = CAESAR_ALPHABETS[variant] || CAESAR_ALPHABETS['en'];
    const upper = alphabet.upper, lower = alphabet.lower, m = upper.length;
    const ks = keyIndices(key, upper);
    if (ks.length === 0) {
        return { result: '', steps: [{ title: 'Error', content: 'Keyword is empty or has no letters from the chosen alphabet. Output cleared.' }] };
    }
    const steps = [{
        title: 'Configuration',
        content: `Mode: ${mode === 'encode' ? 'Encode' : 'Decode'} (Beaufort is reciprocal)\nAlphabet: ${alphabet.label}\nKeyword: ${(key || '').toUpperCase()}\nRetain Punctuation: ${retainPunctuation ? 'Yes' : 'No'}`
    }];
    let ki = 0;
    const { result, letterSteps } = processChars(text, retainPunctuation, (char) => {
        const iu = upper.indexOf(char), il = lower.indexOf(char);
        if (iu === -1 && il === -1) return null;
        const isUp = iu !== -1;
        const p = isUp ? iu : il;
        const kv = ks[ki % ks.length];
        const c = ((kv - p) % m + m) % m;
        const out = (isUp ? upper : lower)[c];
        ki++;
        return { char: out, step: `'${char}' (${p}) : Key ${kv} − ${p} = ${c} mod ${m} → '${out}'` };
    });
    steps.push({ title: 'Key Alignment & Shifts', content: summarizeSteps(letterSteps) });
    return { result, steps };
}

export const Beaufort = {
    encode(text, key, variant, retainPunctuation) {
        return beaufortRun(text, key, variant, retainPunctuation, 'encode');
    },
    decode(text, key, variant, retainPunctuation) {
        return beaufortRun(text, key, variant, retainPunctuation, 'decode');
    }
};

/**
 * AUTOKEY — the keystream is the keyword followed by the message itself, so
 * the key never repeats. Encode adds the stream; decode subtracts it, feeding
 * each recovered letter back into the stream.
 */
function autokeyRun(text, key, variant, retainPunctuation, direction) {
    const alphabet = CAESAR_ALPHABETS[variant] || CAESAR_ALPHABETS['en'];
    const upper = alphabet.upper, lower = alphabet.lower, m = upper.length;
    const stream = keyIndices(key, upper); // seed; message indices get appended
    if (stream.length === 0) {
        return { result: '', steps: [{ title: 'Error', content: 'Keyword is empty or has no letters from the chosen alphabet. Output cleared.' }] };
    }
    const encoding = direction === 'encode';
    const steps = [{
        title: 'Configuration',
        content: `Mode: ${encoding ? 'Encode' : 'Decode'}\nAlphabet: ${alphabet.label}\nKeyword: ${(key || '').toUpperCase()}\nKeystream: keyword + ${encoding ? 'plaintext' : 'recovered plaintext'}\nRetain Punctuation: ${retainPunctuation ? 'Yes' : 'No'}`
    }];
    let pos = 0;
    const { result, letterSteps } = processChars(text, retainPunctuation, (char) => {
        const iu = upper.indexOf(char), il = lower.indexOf(char);
        if (iu === -1 && il === -1) return null;
        const isUp = iu !== -1;
        const inIdx = isUp ? iu : il;
        const ksv = stream[pos];
        pos++;
        const outIdx = encoding ? (inIdx + ksv) % m : ((inIdx - ksv) % m + m) % m;
        // The plaintext letter (input when encoding, output when decoding)
        // extends the keystream.
        stream.push(encoding ? inIdx : outIdx);
        const out = (isUp ? upper : lower)[outIdx];
        return { char: out, step: `'${char}' (${inIdx}) ${encoding ? '+' : '−'} keystream ${ksv} = ${outIdx} → '${out}'` };
    });
    steps.push({ title: 'Key Alignment & Shifts', content: summarizeSteps(letterSteps) });
    return { result, steps };
}

export const Autokey = {
    encode(text, key, variant, retainPunctuation) {
        return autokeyRun(text, key, variant, retainPunctuation, 'encode');
    },
    decode(text, key, variant, retainPunctuation) {
        return autokeyRun(text, key, variant, retainPunctuation, 'decode');
    }
};

/**
 * KEYWORD SUBSTITUTION (monoalphabetic)
 * Build a scrambled cipher alphabet by writing the keyword first (dropping
 * repeats) then the remaining letters in order, and map plain→cipher letter
 * for letter. The classic newspaper "cryptogram". Works over any alphabet
 * (English or the 29-letter Scandinavian variants).
 */
function keywordCipherAlphabet(keyword, upper) {
    const seen = new Set();
    let out = '';
    for (const raw of ((keyword || '') + upper).toUpperCase()) {
        if (upper.indexOf(raw) !== -1 && !seen.has(raw)) {
            seen.add(raw);
            out += raw;
        }
    }
    return out; // a permutation of `upper`
}

function keywordSubRun(text, keyword, variant, retainPunctuation, direction) {
    const alphabet = CAESAR_ALPHABETS[variant] || CAESAR_ALPHABETS['en'];
    const upper = alphabet.upper, lower = alphabet.lower;
    const cipherUpper = keywordCipherAlphabet(keyword, upper);
    const cipherLower = cipherUpper.toLowerCase();
    const encoding = direction === 'encode';
    const fromU = encoding ? upper : cipherUpper;
    const fromL = encoding ? lower : cipherLower;
    const toU = encoding ? cipherUpper : upper;
    const toL = encoding ? cipherLower : lower;

    const steps = [{
        title: 'Configuration',
        content: `Mode: ${encoding ? 'Encode' : 'Decode'}\nAlphabet: ${alphabet.label}\nKeyword: ${(keyword || '').toUpperCase() || '(none)'}\nPlain:  ${upper}\nCipher: ${cipherUpper}\nRetain Punctuation: ${retainPunctuation ? 'Yes' : 'No'}`
    }];

    const { result, letterSteps } = processChars(text, retainPunctuation, (char) => {
        const iu = fromU.indexOf(char), il = fromL.indexOf(char);
        if (iu === -1 && il === -1) return null;
        const isUp = iu !== -1;
        const idx = isUp ? iu : il;
        const out = (isUp ? toU : toL)[idx];
        return { char: out, step: `'${char}' → '${out}'` };
    });

    steps.push({ title: 'Character Substitution', content: summarizeSteps(letterSteps) });
    return { result, steps };
}

export const KeywordSub = {
    encode(text, keyword, variant, retainPunctuation) {
        return keywordSubRun(text, keyword, variant, retainPunctuation, 'encode');
    },
    decode(text, keyword, variant, retainPunctuation) {
        return keywordSubRun(text, keyword, variant, retainPunctuation, 'decode');
    }
};

/**
 * AFFINE CIPHER
 * E(x) = (a·x + b) mod m, D(y) = a⁻¹·(y − b) mod m over the chosen alphabet
 * (m = 26 English, 29 for the Scandinavian variants). `a` must be coprime
 * with m — and since 29 is prime, EVERY a from 1–28 works there. Caesar is
 * the special case a = 1.
 */
function modInverse(a, m) {
    a = ((a % m) + m) % m;
    for (let x = 1; x < m; x++) {
        if ((a * x) % m === 1) return x;
    }
    return null; // a not coprime with m — no inverse
}

// The multipliers coprime with m (the only invertible ones); the UI's
// `a` dropdown is populated from this per selected alphabet.
export function affineCoprimes(m) {
    const gcd = (x, y) => (y === 0 ? x : gcd(y, x % y));
    const out = [];
    for (let a = 1; a < m; a++) if (gcd(a, m) === 1) out.push(a);
    return out;
}

function affineRun(text, a, b, variant, retainPunctuation, direction) {
    const alphabet = CAESAR_ALPHABETS[variant] || CAESAR_ALPHABETS['en'];
    const upper = alphabet.upper, lower = alphabet.lower, m = upper.length;
    a = parseInt(a, 10);
    b = ((parseInt(b, 10) || 0) % m + m) % m;
    const aInv = modInverse(a, m);
    if (aInv === null) {
        return { result: '', steps: [{ title: 'Error', content: `'a' (${a}) must be coprime with ${m}. Valid values: ${affineCoprimes(m).join(', ')}.` }] };
    }

    const encoding = direction === 'encode';
    const steps = [{
        title: 'Configuration',
        content: `Mode: ${encoding ? 'Encode' : 'Decode'}\nAlphabet: ${alphabet.label}\nFormula: ${encoding ? `E(x) = (${a}·x + ${b}) mod ${m}` : `D(y) = ${aInv}·(y − ${b}) mod ${m}   (${a}⁻¹ mod ${m} = ${aInv})`}\nRetain Punctuation: ${retainPunctuation ? 'Yes' : 'No'}`
    }];

    const { result, letterSteps } = processChars(text, retainPunctuation, (char) => {
        const iu = upper.indexOf(char), il = lower.indexOf(char);
        if (iu === -1 && il === -1) return null;
        const isUp = iu !== -1;
        const x = isUp ? iu : il;
        const y = encoding
            ? (a * x + b) % m
            : (aInv * ((x - b) % m + m)) % m;
        const outChar = (isUp ? upper : lower)[y];
        return { char: outChar, step: `'${char}' (${x}) → ${encoding ? `(${a}·${x}+${b})` : `${aInv}·(${x}−${b})`} mod ${m} = ${y} → '${outChar}'` };
    });

    steps.push({ title: 'Character Processing', content: summarizeSteps(letterSteps) });
    return { result, steps };
}

export const Affine = {
    encode(text, a, b, variant, retainPunctuation) {
        return affineRun(text, a, b, variant, retainPunctuation, 'encode');
    },
    decode(text, a, b, variant, retainPunctuation) {
        return affineRun(text, a, b, variant, retainPunctuation, 'decode');
    }
};

/**
 * PLAYFAIR CIPHER
 * Digraph substitution on a keyword grid. English uses the classic 5×5 (I/J
 * share a cell → 25 letters); the Scandinavian variants merge I/J too and add
 * Æ/Ø/Å or Å/Ä/Ö for 28 letters on a 4×7 grid. Letters are paired up; doubled
 * letters are split and an odd final letter is padded (with X, or Q when the
 * letter itself is X). Same row → shift right; same column → shift down;
 * otherwise swap columns (decode shifts the opposite way). Non-letters are
 * dropped, so decode keeps the padding — this is expected.
 */
function playfairConfig(variant) {
    // Bases already exclude J (folded into I).
    if (variant === 'dk-no') return { base: 'ABCDEFGHIKLMNOPQRSTUVWXYZÆØÅ', cols: 7, rows: 4 };
    if (variant === 'se') return { base: 'ABCDEFGHIKLMNOPQRSTUVWXYZÅÄÖ', cols: 7, rows: 4 };
    return { base: 'ABCDEFGHIKLMNOPQRSTUVWXYZ', cols: 5, rows: 5 };
}

function playfairSquare(keyword, base) {
    const seen = new Set();
    let square = '';
    for (const raw of ((keyword || '') + base).toUpperCase()) {
        const c = raw === 'J' ? 'I' : raw;
        if (base.indexOf(c) !== -1 && !seen.has(c)) {
            seen.add(c);
            square += c;
        }
    }
    return square; // length === base.length
}

function playfairDigraphs(text, base) {
    let letters = '';
    for (const raw of text.toUpperCase()) {
        const c = raw === 'J' ? 'I' : raw;
        if (base.indexOf(c) !== -1) letters += c;
    }
    const pad = base.indexOf('X') !== -1 ? 'X' : base[base.length - 1];
    const altPad = base.indexOf('Q') !== -1 ? 'Q' : base[0];
    const pairs = [];
    let i = 0;
    while (i < letters.length) {
        const a = letters[i];
        const b = letters[i + 1];
        if (!b || a === b) {
            pairs.push(a + (a === pad ? altPad : pad));
            i += 1;
        } else {
            pairs.push(a + b);
            i += 2;
        }
    }
    return pairs;
}

function playfairRun(text, keyword, variant, direction) {
    const { base, cols, rows } = playfairConfig(variant);
    const square = playfairSquare(keyword, base);
    const pos = (ch) => {
        const idx = square.indexOf(ch);
        return [Math.floor(idx / cols), idx % cols];
    };
    const colShift = direction === 'encode' ? 1 : cols - 1; // −1 ≡ +(cols−1) mod cols
    const rowShift = direction === 'encode' ? 1 : rows - 1;

    const gridLines = [];
    for (let r = 0; r < rows; r++) gridLines.push(square.slice(r * cols, r * cols + cols).split('').join(' '));
    const steps = [{
        title: `Key Square (${direction === 'encode' ? 'Encode' : 'Decode'})`,
        content: `Keyword: ${(keyword || '(none)')}\nI and J share a cell.\n\n${gridLines.join('\n')}`
    }];

    const pairs = playfairDigraphs(text, base);
    if (pairs.length === 0) {
        return { result: '', steps };
    }

    const details = [];
    let result = '';
    for (const pair of pairs) {
        const [r1, c1] = pos(pair[0]);
        const [r2, c2] = pos(pair[1]);
        let o1, o2, rule;
        if (r1 === r2) {
            o1 = square[r1 * cols + (c1 + colShift) % cols];
            o2 = square[r2 * cols + (c2 + colShift) % cols];
            rule = 'same row';
        } else if (c1 === c2) {
            o1 = square[((r1 + rowShift) % rows) * cols + c1];
            o2 = square[((r2 + rowShift) % rows) * cols + c2];
            rule = 'same column';
        } else {
            o1 = square[r1 * cols + c2];
            o2 = square[r2 * cols + c1];
            rule = 'rectangle';
        }
        result += o1 + o2;
        details.push(`${pair} → ${o1}${o2} (${rule})`);
    }

    steps.push({ title: 'Digraph Substitution', content: summarizeSteps(details) });
    const grouped = result.match(/.{1,2}/g)?.join(' ') || result;
    return { result: grouped, steps };
}

export const Playfair = {
    encode(text, keyword, variant) {
        return playfairRun(text, keyword, variant, 'encode');
    },
    decode(text, keyword, variant) {
        // Strip the readability spaces the encoder inserts between pairs.
        return playfairRun(text.replace(/\s+/g, ''), keyword, variant, 'decode');
    }
};

/**
 * FOUR-SQUARE CIPHER
 * A Playfair relative on four grids: two plaintext grids (top-left and
 * bottom-right, the alphabet in order) and two keyword-scrambled cipher grids
 * (top-right and bottom-left). Each plaintext pair is located in the two plain
 * grids, then read off the two cipher grids at the crossed positions — so,
 * unlike Playfair, doubled letters need no special handling. Shares Playfair's
 * grid geometry (5×5 English with I/J merged; 4×7 for the 28-letter
 * Scandinavian sets). An odd final letter is padded; non-letters are dropped.
 */
function evenDigraphs(text, base) {
    let letters = '';
    for (const raw of text.toUpperCase()) {
        const c = raw === 'J' ? 'I' : raw;
        if (base.indexOf(c) !== -1) letters += c;
    }
    const pad = base.indexOf('X') !== -1 ? 'X' : base[base.length - 1];
    if (letters.length % 2 === 1) letters += pad;
    const pairs = [];
    for (let i = 0; i < letters.length; i += 2) pairs.push(letters.slice(i, i + 2));
    return pairs;
}

function fourSquareRun(text, key1, key2, variant, direction) {
    const { base, cols, rows } = playfairConfig(variant);
    const plain = base;                       // ordered alphabet (both plain grids)
    const g1 = playfairSquare(key1, base);    // top-right cipher grid
    const g2 = playfairSquare(key2, base);    // bottom-left cipher grid
    const encoding = direction === 'encode';

    const gridPair = (left, right) => {
        const lines = [];
        for (let r = 0; r < rows; r++) {
            const l = left.slice(r * cols, r * cols + cols).split('').join(' ');
            const rr = right.slice(r * cols, r * cols + cols).split('').join(' ');
            lines.push(`${l}    ${rr}`);
        }
        return lines.join('\n');
    };
    const steps = [{
        title: `Four Squares (${encoding ? 'Encode' : 'Decode'})`,
        content: `Keywords: ${key1 || '(none)'} / ${key2 || '(none)'}\nI and J share a cell.\n\n${gridPair(plain, g1)}\n\n${gridPair(g2, plain)}`
    }];

    const pairs = evenDigraphs(encoding ? text : text.replace(/\s+/g, ''), base);
    if (pairs.length === 0) return { result: '', steps };

    const details = [];
    let result = '';
    for (const pair of pairs) {
        let o1, o2;
        if (encoding) {
            const i1 = plain.indexOf(pair[0]);
            const i2 = plain.indexOf(pair[1]);
            const r1 = Math.floor(i1 / cols), c1 = i1 % cols;
            const r2 = Math.floor(i2 / cols), c2 = i2 % cols;
            o1 = g1[r1 * cols + c2];
            o2 = g2[r2 * cols + c1];
        } else {
            const i1 = g1.indexOf(pair[0]);
            const i2 = g2.indexOf(pair[1]);
            const r1 = Math.floor(i1 / cols), c2 = i1 % cols;
            const r2 = Math.floor(i2 / cols), c1 = i2 % cols;
            o1 = plain[r1 * cols + c1];
            o2 = plain[r2 * cols + c2];
        }
        result += o1 + o2;
        details.push(`${pair} → ${o1}${o2}`);
    }

    steps.push({ title: 'Digraph Substitution', content: summarizeSteps(details) });
    const grouped = result.match(/.{1,2}/g)?.join(' ') || result;
    return { result: grouped, steps };
}

export const FourSquare = {
    encode(text, key1, key2, variant) {
        return fourSquareRun(text, key1, key2, variant, 'encode');
    },
    decode(text, key1, key2, variant) {
        return fourSquareRun(text, key1, key2, variant, 'decode');
    }
};

/**
 * POLYBIUS SQUARE
 * Each letter → its row+column on a grid, five columns wide. English uses the
 * classic 5×5 (I/J share cell 24); the Scandinavian variants keep all 29
 * letters on a 6×5 grid. Spaces become "/", other characters are dropped.
 */
function polybiusSequence(variant) {
    if (variant === 'dk-no') return 'ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ'; // 29, no merge
    if (variant === 'se') return 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ';
    return 'ABCDEFGHIKLMNOPQRSTUVWXYZ'; // 25, I/J merged
}

function polybiusGrid(seq) {
    const cols = 5;
    const rows = Math.ceil(seq.length / cols);
    const lines = ['    ' + Array.from({ length: cols }, (_, c) => c + 1).join(' ')];
    for (let r = 0; r < rows; r++) {
        lines.push(`${r + 1} | ` + seq.slice(r * cols, r * cols + cols).split('').join(' '));
    }
    return lines.join('\n');
}

export const Polybius = {
    encode(text, variant) {
        const seq = polybiusSequence(variant);
        const foldsJ = variant !== 'dk-no' && variant !== 'se';
        const steps = [{
            title: 'Polybius Grid',
            content: `${polybiusGrid(seq)}\n\n${foldsJ ? 'I and J share a cell. ' : ''}Word breaks shown as "/".`
        }];
        const tokens = [];
        const details = [];
        for (const raw of text) {
            let c = raw.toUpperCase();
            if (foldsJ && c === 'J') c = 'I';
            const idx = seq.indexOf(c);
            if (idx !== -1) {
                const code = `${Math.floor(idx / 5) + 1}${idx % 5 + 1}`;
                tokens.push(code);
                details.push(`'${raw}' → ${code}`);
            } else if (raw === ' ') {
                tokens.push('/');
                details.push('space → /');
            } else {
                details.push(`'${raw}' skipped`);
            }
        }
        steps.push({ title: 'Character Encoding', content: summarizeSteps(details) });
        return { result: tokens.join(' '), steps };
    },

    decode(text, variant) {
        const seq = polybiusSequence(variant);
        const steps = [{
            title: 'Polybius Grid',
            content: `Row-column pairs map back to letters on this grid; "/" is a word break.\n\n${polybiusGrid(seq)}`
        }];
        const details = [];
        let result = '';
        const tokens = text.trim().split(/\s+/);
        if (tokens.length === 1 && tokens[0] === '') {
            return { result: '', steps: [{ title: 'Status', content: 'No Polybius codes found.' }] };
        }
        for (const token of tokens) {
            if (token === '/') {
                result += ' ';
                details.push('/ → space');
            } else if (/^[1-6][1-5]$/.test(token)) {
                const idx = (parseInt(token[0], 10) - 1) * 5 + (parseInt(token[1], 10) - 1);
                const letter = seq[idx];
                if (letter) {
                    result += letter;
                    details.push(`${token} → '${letter}'`);
                } else {
                    result += '?';
                    details.push(`${token} out of grid → '?'`);
                }
            } else {
                result += '?';
                details.push(`'${token}' invalid → '?'`);
            }
        }
        steps.push({ title: 'Code Translation', content: summarizeSteps(details) });
        return { result, steps };
    }
};

/**
 * BIFID CIPHER
 * Delastelle's fractionation cipher: each letter is turned into its (row,
 * column) on a keyword-seeded Polybius square, the rows and columns are written
 * out in two long lines, then read back off in pairs to form the ciphertext.
 * Because a letter's two coordinates end up in different output letters, Bifid
 * diffuses each character across the message — a genuinely different idea from
 * plain substitution. Reuses the Polybius geometry (5×5 English with I/J
 * merged; 6×5 for the 29-letter Scandinavian sets). Lossless for letters;
 * non-letters are dropped.
 */
function bifidSquare(keyword, seq) {
    const foldsJ = seq.indexOf('J') === -1;
    const seen = new Set();
    let out = '';
    for (const raw of ((keyword || '') + seq).toUpperCase()) {
        const c = foldsJ && raw === 'J' ? 'I' : raw;
        if (seq.indexOf(c) !== -1 && !seen.has(c)) { seen.add(c); out += c; }
    }
    return out; // a permutation of `seq`
}

function bifidRun(text, keyword, variant, direction) {
    const seq = polybiusSequence(variant);
    const square = bifidSquare(keyword, seq);
    const foldsJ = seq.indexOf('J') === -1;
    const cols = 5;
    const rowsN = Math.ceil(square.length / cols);
    const encoding = direction === 'encode';

    const gridLines = ['    ' + Array.from({ length: cols }, (_, c) => c + 1).join(' ')];
    for (let r = 0; r < rowsN; r++) gridLines.push(`${r + 1} | ` + square.slice(r * cols, r * cols + cols).split('').join(' '));
    const steps = [{
        title: `Key Square (${encoding ? 'Encode' : 'Decode'})`,
        content: `Keyword: ${keyword || '(none)'}\n${foldsJ ? 'I and J share a cell.\n' : ''}\n${gridLines.join('\n')}`
    }];

    // Gather recognized letters (uppercased, J folded to I where applicable).
    let letters = '';
    for (const raw of text.toUpperCase()) {
        const c = foldsJ && raw === 'J' ? 'I' : raw;
        if (square.indexOf(c) !== -1) letters += c;
    }
    if (letters.length === 0) return { result: '', steps };

    const rowsArr = [], colsArr = [];
    for (const ch of letters) {
        const idx = square.indexOf(ch);
        rowsArr.push(Math.floor(idx / cols) + 1);
        colsArr.push(idx % cols + 1);
    }

    let result = '';
    const details = [];
    if (encoding) {
        // Read rows then columns as one stream, then re-pair (row, col) per letter.
        const stream = rowsArr.concat(colsArr);
        for (let i = 0; i < stream.length; i += 2) {
            const r = stream[i], c = stream[i + 1];
            const letter = square[(r - 1) * cols + (c - 1)];
            result += letter;
            details.push(`(${r},${c}) → '${letter}'`);
        }
        steps.push({ title: 'Coordinate Rows', content: `Rows:    ${rowsArr.join(' ')}\nColumns: ${colsArr.join(' ')}` });
    } else {
        // Cipher coordinates, read in order, split back into rows then columns.
        const stream = [];
        for (let i = 0; i < letters.length; i++) { stream.push(rowsArr[i], colsArr[i]); }
        const half = stream.length / 2;
        const origRows = stream.slice(0, half);
        const origCols = stream.slice(half);
        for (let i = 0; i < half; i++) {
            const letter = square[(origRows[i] - 1) * cols + (origCols[i] - 1)];
            result += letter;
            details.push(`(${origRows[i]},${origCols[i]}) → '${letter}'`);
        }
    }

    steps.push({ title: encoding ? 'Re-paired Coordinates' : 'Recovered Letters', content: summarizeSteps(details) });
    return { result, steps };
}

export const Bifid = {
    encode(text, keyword, variant) {
        return bifidRun(text, keyword, variant, 'encode');
    },
    decode(text, keyword, variant) {
        return bifidRun(text.replace(/\s+/g, ''), keyword, variant, 'decode');
    }
};

/**
 * BACON'S CIPHER
 * Each letter → a 5-bit A/B pattern (its index in the chosen alphabet, A = 0,
 * B = 1). Five bits give 32 patterns, enough for the 26 English or 29
 * Scandinavian letters. Spaces become "/", other characters are dropped.
 */
export const Bacon = {
    encode(text, variant) {
        const alphabet = CAESAR_ALPHABETS[variant] || CAESAR_ALPHABETS['en'];
        const upper = alphabet.upper, lower = alphabet.lower;
        const bits = Math.ceil(Math.log2(upper.length));
        const steps = [{
            title: 'Baconian Encoding',
            content: `Alphabet: ${alphabet.label}\nEach letter becomes a ${bits}-symbol A/B group: its position in the alphabet in ${bits}-bit binary, with A for 0 and B for 1. Word breaks shown as "/".`
        }];
        const tokens = [];
        const details = [];
        for (const raw of text) {
            const iu = upper.indexOf(raw), il = lower.indexOf(raw);
            const idx = iu !== -1 ? iu : il;
            if (idx !== -1) {
                const group = idx.toString(2).padStart(bits, '0').replace(/0/g, 'A').replace(/1/g, 'B');
                tokens.push(group);
                details.push(`'${raw}' (${idx}) → ${group}`);
            } else if (raw === ' ') {
                tokens.push('/');
                details.push('space → /');
            } else {
                details.push(`'${raw}' skipped`);
            }
        }
        steps.push({ title: 'Character Encoding', content: summarizeSteps(details) });
        return { result: tokens.join(' '), steps };
    },

    decode(text, variant) {
        const alphabet = CAESAR_ALPHABETS[variant] || CAESAR_ALPHABETS['en'];
        const upper = alphabet.upper;
        const bits = Math.ceil(Math.log2(upper.length));
        const groupRe = new RegExp(`^[AB]{${bits}}$`);
        const steps = [{
            title: 'Baconian Decoding',
            content: `Alphabet: ${alphabet.label}\nEach ${bits}-symbol A/B group is read as ${bits}-bit binary (A=0, B=1) → a letter. "/" is a word break.`
        }];
        const details = [];
        let result = '';
        const tokens = text.trim().toUpperCase().split(/\s+/);
        if (tokens.length === 1 && tokens[0] === '') {
            return { result: '', steps: [{ title: 'Status', content: 'No Baconian groups found.' }] };
        }
        for (const token of tokens) {
            if (token === '/') {
                result += ' ';
                details.push('/ → space');
            } else if (groupRe.test(token)) {
                const idx = parseInt(token.replace(/A/g, '0').replace(/B/g, '1'), 2);
                const letter = upper[idx];
                if (letter) {
                    result += letter;
                    details.push(`${token} → '${letter}'`);
                } else {
                    result += '?';
                    details.push(`${token} out of alphabet → '?'`);
                }
            } else {
                result += '?';
                details.push(`'${token}' invalid → '?'`);
            }
        }
        steps.push({ title: 'Group Translation', content: summarizeSteps(details) });
        return { result, steps };
    }
};

/**
 * COLUMNAR TRANSPOSITION
 * Write the message into rows under the keyword, then read the columns in the
 * order given by the keyword letters' alphabetical rank (ties left→right).
 * Alphabet-agnostic — every character (letters, spaces, punctuation, Æ/Ø/Å…)
 * is transposed as-is, so it round-trips exactly.
 */
function columnOrder(keyword) {
    return keyword
        .split('')
        .map((ch, idx) => ({ ch, idx }))
        .sort((a, b) => (a.ch < b.ch ? -1 : a.ch > b.ch ? 1 : a.idx - b.idx))
        .map((o) => o.idx);
}

// Column c holds cells at indices c, c+w, c+2w, … < n; the first (n mod w)
// columns get one extra cell (they fill the partial last row).
function columnHeight(c, n, w) {
    return Math.floor(n / w) + (c < n % w ? 1 : 0);
}

export const Columnar = {
    encode(text, keyword) {
        const key = (keyword || '').toUpperCase();
        if (key.length < 2) {
            return { result: '', steps: [{ title: 'Error', content: 'Enter a keyword of at least 2 characters.' }] };
        }
        const w = key.length, n = text.length;
        const order = columnOrder(key);
        let result = '';
        const details = [];
        for (const c of order) {
            let col = '';
            for (let r = c; r < n; r += w) col += text[r];
            result += col;
            details.push(`Column ${c + 1} ('${key[c]}'): "${col}"`);
        }
        const rows = Math.ceil(n / w);
        const grid = [];
        for (let r = 0; r < rows; r++) grid.push(text.slice(r * w, r * w + w));
        const steps = [
            { title: 'Configuration', content: `Keyword: ${key}\nColumns: ${w}\nRead order (by letter rank): ${order.map((c) => c + 1).join(' ')}` },
            { title: 'Grid (row by row)', content: summarizeSteps(grid) },
            { title: 'Columns read in key order', content: summarizeSteps(details) }
        ];
        return { result, steps };
    },
    decode(text, keyword) {
        const key = (keyword || '').toUpperCase();
        if (key.length < 2) {
            return { result: '', steps: [{ title: 'Error', content: 'Enter a keyword of at least 2 characters.' }] };
        }
        const w = key.length, n = text.length;
        const order = columnOrder(key);
        const cols = [];
        let pos = 0;
        for (const c of order) {
            const h = columnHeight(c, n, w);
            cols[c] = text.slice(pos, pos + h);
            pos += h;
        }
        let result = '';
        const rows = Math.ceil(n / w);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < w; c++) {
                if (cols[c] && r < cols[c].length) result += cols[c][r];
            }
        }
        return { result, steps: [{ title: 'Configuration', content: `Keyword: ${key}\nColumns: ${w}\nRead order: ${order.map((c) => c + 1).join(' ')}` }] };
    }
};

/**
 * SCYTALE
 * The ancient rod cipher: write the message across a fixed number of columns
 * (the rod's circumference), then read down the columns. A keyless
 * transposition — like Columnar, it round-trips every character exactly.
 */
export const Scytale = {
    encode(text, cols) {
        cols = parseInt(cols, 10);
        if (isNaN(cols) || cols < 2) {
            return { result: '', steps: [{ title: 'Error', content: 'Number of columns must be at least 2.' }] };
        }
        const n = text.length;
        let result = '';
        for (let c = 0; c < cols; c++) {
            for (let r = c; r < n; r += cols) result += text[r];
        }
        const rows = Math.ceil(n / cols);
        const grid = [];
        for (let r = 0; r < rows; r++) grid.push(text.slice(r * cols, r * cols + cols));
        const steps = [
            { title: 'Configuration', content: `Columns (rod size): ${cols}\nWrite across ${cols} columns, then read down each column in turn.` },
            { title: 'Grid (row by row)', content: summarizeSteps(grid) }
        ];
        return { result, steps };
    },
    decode(text, cols) {
        cols = parseInt(cols, 10);
        if (isNaN(cols) || cols < 2) {
            return { result: '', steps: [{ title: 'Error', content: 'Number of columns must be at least 2.' }] };
        }
        const n = text.length;
        const colStr = [];
        let pos = 0;
        for (let c = 0; c < cols; c++) {
            const h = columnHeight(c, n, cols);
            colStr[c] = text.slice(pos, pos + h);
            pos += h;
        }
        let result = '';
        const rows = Math.ceil(n / cols);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (r < colStr[c].length) result += colStr[c][r];
            }
        }
        return { result, steps: [{ title: 'Configuration', content: `Columns (rod size): ${cols}` }] };
    }
};

/**
 * 5. RAIL FENCE CIPHER
 */
export const RailFence = {
    encode(text, rails, retainPunctuation) {
        rails = parseInt(rails, 10);
        if (isNaN(rails) || rails < 2) {
            // Blank output rather than passing plaintext through: a user might
            // otherwise copy their unencoded message believing it was encoded.
            return { result: '', steps: [{ title: "Error", content: "Key must be an integer >= 2. Output cleared." }] };
        }

        // Clean input if not retaining punctuation
        let cleanText = '';
        const removedPunctuation = [];
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === ' ' || isLetter(char) || retainPunctuation) {
                cleanText += char;
            } else {
                removedPunctuation.push(`'${char}' at position ${i} skipped`);
            }
        }

        if (cleanText.length === 0) {
            return { result: '', steps: [{ title: "Warning", content: "No text to encode after filtering." }] };
        }

        const steps = [];
        if (removedPunctuation.length > 0) {
            steps.push({ title: "Punctuation Filter", content: removedPunctuation.join('\n') });
        }

        // Initialize 2D grid. Empty cells are null (not '.') so that literal
        // period characters in the text survive the row-by-row readout.
        const grid = Array.from({ length: rails }, () => Array(cleanText.length).fill(null));
        let row = 0;
        let dirDown = false;

        // Trace zigzag and fill text
        for (let i = 0; i < cleanText.length; i++) {
            grid[row][i] = cleanText[i];
            if (row === 0 || row === rails - 1) {
                dirDown = !dirDown;
            }
            row += dirDown ? 1 : -1;
        }

        // Read grid row-by-row
        let result = '';
        for (let r = 0; r < rails; r++) {
            for (let c = 0; c < cleanText.length; c++) {
                if (grid[r][c] !== null) {
                    result += grid[r][c];
                }
            }
        }

        // Draw grid for process visualization
        const gridStr = grid.map((r, idx) => `Row ${idx + 1}: ${r.map(c => c === null ? '.' : c).join(' ')}`).join('\n');
        steps.push({
            title: `Rail Fence Grid (${rails} Rails)`,
            content: gridStr
        });

        return { result, steps };
    },

    decode(text, rails, retainPunctuation) {
        rails = parseInt(rails, 10);
        if (isNaN(rails) || rails < 2) {
            return { result: '', steps: [{ title: "Error", content: "Key must be an integer >= 2. Output cleared." }] };
        }

        const len = text.length;
        if (len === 0) return { result: '', steps: [] };

        const steps = [];
        // Zigzag positions are marked with a unique object (not '*') so that
        // ciphertext containing literal asterisks can't collide with the marker.
        const MARKER = {};
        const grid = Array.from({ length: rails }, () => Array(len).fill(null));

        // Mark zigzag positions
        let row = 0;
        let dirDown = false;
        for (let i = 0; i < len; i++) {
            grid[row][i] = MARKER;
            if (row === 0 || row === rails - 1) {
                dirDown = !dirDown;
            }
            row += dirDown ? 1 : -1;
        }

        // Fill grid with ciphertext characters row by row
        let textIdx = 0;
        for (let r = 0; r < rails; r++) {
            for (let c = 0; c < len; c++) {
                if (grid[r][c] === MARKER && textIdx < len) {
                    grid[r][c] = text[textIdx++];
                }
            }
        }

        // Reconstruct text by traversing zigzag again
        let result = '';
        row = 0;
        dirDown = false;
        for (let i = 0; i < len; i++) {
            result += grid[row][i];
            if (row === 0 || row === rails - 1) {
                dirDown = !dirDown;
            }
            row += dirDown ? 1 : -1;
        }

        const gridStr = grid.map((r, idx) => `Row ${idx + 1}: ${r.map(c => (c === null || c === MARKER) ? '.' : c).join(' ')}`).join('\n');
        steps.push({
            title: `Reconstructed Rail Fence Grid (${rails} Rails)`,
            content: gridStr
        });

        return { result, steps };
    }
};

/**
 * 6. BINARY CONVERTER
 */
export const BinaryConverter = {
    encode(text, _, retainPunctuation) {
        let resultArr = [];
        const steps = [];
        const letterSteps = [];

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (isLetter(char) || char === ' ') {
                const ascii = char.charCodeAt(0);
                const binary = ascii.toString(2).padStart(8, '0');
                resultArr.push(binary);
                letterSteps.push(`'${char === ' ' ? 'Space' : char}' -> Decimal ASCII ${ascii} -> 8-bit Binary: ${binary}`);
            } else {
                if (retainPunctuation) {
                    const ascii = char.charCodeAt(0);
                    const binary = ascii.toString(2).padStart(8, '0');
                    resultArr.push(binary);
                    letterSteps.push(`Punctuation '${char}' -> Decimal ASCII ${ascii} -> 8-bit Binary: ${binary}`);
                } else {
                    letterSteps.push(`Punctuation '${char}' skipped`);
                }
            }
        }

        steps.push({
            title: "ASCII to Binary Mapping",
            content: summarizeSteps(letterSteps)
        });

        return { result: resultArr.join(' '), steps };
    },

    decode(text, _, retainPunctuation) {
        const cleanBinary = text.replace(/[^01\s]/g, '');
        const chunks = cleanBinary.trim().split(/\s+/);
        let result = '';
        const steps = [];
        const letterSteps = [];

        if (chunks.length === 0 || (chunks.length === 1 && chunks[0] === '')) {
            return { result: '', steps: [{ title: "Status", content: "No binary digits found." }] };
        }

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            if (!chunk) continue;
            const decimal = parseInt(chunk, 2);
            const char = String.fromCharCode(decimal);
            result += char;
            letterSteps.push(`Binary chunk '${chunk}' -> Decimal ASCII ${decimal} -> '${char === ' ' ? 'Space' : char}'`);
        }

        steps.push({
            title: "Binary to Character Decoupling",
            content: summarizeSteps(letterSteps)
        });

        return { result, steps };
    }
};

/**
 * 7. A1Z26 CIPHER
 */
export const A1z26 = {
    encode(text, variant, retainPunctuation) {
        // Shares the Caesar alphabet table: English is A=1..Z=26, the
        // Scandinavian variants continue to 27/28/29 for their extra letters.
        const alphabet = CAESAR_ALPHABETS[variant] || CAESAR_ALPHABETS['en'];
        let resultArr = [];
        const steps = [{ title: "Configuration", content: `Alphabet: ${alphabet.label}` }];
        const details = [];

        let currentWord = [];

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            let idx = alphabet.upper.indexOf(char);
            if (idx === -1) idx = alphabet.lower.indexOf(char);
            if (idx !== -1) {
                const pos = idx + 1;
                currentWord.push(pos.toString());
                details.push(`'${char}' -> Alphabet Index: ${pos}`);
            } else {
                if (currentWord.length > 0) {
                    resultArr.push(currentWord.join('-'));
                    currentWord = [];
                }

                if (char === ' ') {
                    resultArr.push(' ');
                    details.push("Space character");
                } else if (retainPunctuation) {
                    resultArr.push(char);
                    details.push(`Punctuation '${char}' retained`);
                } else {
                    details.push(`Punctuation '${char}' skipped`);
                }
            }
        }

        if (currentWord.length > 0) {
            resultArr.push(currentWord.join('-'));
        }

        let result = '';
        for (let j = 0; j < resultArr.length; j++) {
            const val = resultArr[j];
            if (val === ' ' || val.match(/[^0-9\-]/)) {
                result += val;
            } else {
                if (result.length > 0 && !result.endsWith(' ') && !result.endsWith('-') && !result[result.length-1].match(/[^0-9\-]/)) {
                    result += ' ' + val;
                } else {
                    result += val;
                }
            }
        }

        steps.push({
            title: "Character to Alphabet Position",
            content: summarizeSteps(details)
        });

        return { result: result.trim(), steps };
    },

    decode(text, variant, retainPunctuation) {
        const alphabet = CAESAR_ALPHABETS[variant] || CAESAR_ALPHABETS['en'];
        const size = alphabet.upper.length;
        let result = '';
        const steps = [{ title: "Configuration", content: `Alphabet: ${alphabet.label}` }];
        const details = [];

        let i = 0;
        while (i < text.length) {
            const char = text[i];
            if (char >= '0' && char <= '9') {
                let numStr = '';
                while (i < text.length && text[i] >= '0' && text[i] <= '9') {
                    numStr += text[i];
                    i++;
                }
                const num = parseInt(numStr, 10);
                if (num >= 1 && num <= size) {
                    const letter = alphabet.upper[num - 1];
                    result += letter;
                    details.push(`Number '${num}' -> Alphabet Position -> '${letter}'`);
                } else {
                    result += '?';
                    details.push(`Number '${num}' out of range (1-${size}) -> '?'`);
                }
            } else if (char === '-') {
                details.push("Skipped hyphen separator");
                i++;
            } else if (char === ' ') {
                result += ' ';
                details.push("Space character preserved");
                i++;
            } else {
                if (retainPunctuation) {
                    result += char;
                    details.push(`Punctuation '${char}' retained`);
                } else {
                    details.push(`Punctuation '${char}' skipped`);
                }
                i++;
            }
        }

        steps.push({
            title: "Numbers to Letters Translation",
            content: summarizeSteps(details)
        });

        return { result, steps };
    }
};

/**
 * 8. BINARY REVERSE CIPHER (CUSTOM)
 * Rules:
 * - 0 -> randomly selected from [0, 1, 3, 4]
 * - 1 -> randomly selected from [5, 6, 7, 9]
 * - space -> represented by '88'
 * - Letters A-Z map to 1-26 in reverse way: Z=1, ..., A=26
 * - Represented as 5-bit binary (Fixed width) OR Space-separated (Variable width)
 */
export const BinaryReverse = {
    encode(text, formatMode, retainPunctuation) {
        const isFixed = formatMode !== 'variable';
        let resultParts = [];
        const steps = [];
        const details = [];

        steps.push({
            title: "Binary Reverse Cipher Rules",
            content: `Mode: Encode\nBinary Width Mode: ${isFixed ? 'Fixed (5-bit per letter)' : 'Variable (space-separated)'}\n\nMapping:\n0 -> choice of {0, 1, 3, 4}\n1 -> choice of {5, 6, 7, 9}\nSpace -> '88'\nLetter mappings: A=26, B=25, ..., Z=1`
        });

        const zeroOptions = [0, 1, 3, 4];
        const oneOptions = [5, 6, 7, 9];

        function mapBitToDigit(bit) {
            const list = bit === '0' ? zeroOptions : oneOptions;
            const randIdx = Math.floor(Math.random() * list.length);
            return list[randIdx].toString();
        }

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (isLetter(char)) {
                const plainPos = getAlphabetIndex(char) + 1; // 1-26
                const reversedPos = 27 - plainPos; // Z=1, A=26
                let binary = reversedPos.toString(2);
                if (isFixed) {
                    binary = binary.padStart(5, '0');
                }

                let digits = '';
                for (let b = 0; b < binary.length; b++) {
                    digits += mapBitToDigit(binary[b]);
                }

                resultParts.push({ type: 'letter', value: digits, char, reversedPos, binary });
                details.push(`'${char}' -> Reversed Pos ${reversedPos} -> Binary '${binary}' -> Encoded digits '${digits}'`);
            } else if (char === ' ') {
                resultParts.push({ type: 'space', value: '88' });
                details.push(`Space character -> '88'`);
            } else {
                if (retainPunctuation) {
                    resultParts.push({ type: 'punctuation', value: char });
                    details.push(`Punctuation '${char}' retained`);
                } else {
                    details.push(`Punctuation '${char}' skipped`);
                }
            }
        }

        let result = '';
        for (let idx = 0; idx < resultParts.length; idx++) {
            const part = resultParts[idx];
            if (part.type === 'letter') {
                if (isFixed) {
                    result += part.value;
                } else {
                    result += (result.length > 0 && !result.endsWith(' ') ? ' ' : '') + part.value;
                }
            } else if (part.type === 'space') {
                if (isFixed) {
                    result += part.value;
                } else {
                    result += (result.length > 0 && !result.endsWith(' ') ? ' ' : '') + part.value + ' ';
                }
            } else {
                if (isFixed) {
                    result += part.value;
                } else {
                    result += part.value;
                }
            }
        }

        steps.push({
            title: "Encoding Process Details",
            content: summarizeSteps(details)
        });

        return { result: result.trim(), steps };
    },

    decode(text, formatMode, retainPunctuation) {
        const isFixed = formatMode !== 'variable';
        let result = '';
        const steps = [];
        const details = [];

        steps.push({
            title: "Decoder Configuration",
            content: `Mode: Decode\nBinary Width Mode: ${isFixed ? 'Fixed (5-bit chunks)' : 'Variable (space-separated)'}\nRetain Punctuation: ${retainPunctuation ? 'Yes' : 'No'}`
        });

        function digitToBit(digit) {
            if (['0', '1', '3', '4'].includes(digit)) return '0';
            if (['5', '6', '7', '9'].includes(digit)) return '1';
            return null;
        }

        let i = 0;
        let currentDigitBuffer = '';

        const processBuffer = () => {
            if (currentDigitBuffer.length === 0) return;

            if (isFixed) {
                let idx = 0;
                while (idx < currentDigitBuffer.length) {
                    const chunk = currentDigitBuffer.slice(idx, idx + 5);
                    idx += 5;
                    
                    if (chunk.length < 5) {
                        details.push(`Warning: remaining chunk '${chunk}' is too short (< 5 bits) and was ignored.`);
                        continue;
                    }

                    let binary = '';
                    for (let b = 0; b < chunk.length; b++) {
                        binary += digitToBit(chunk[b]);
                    }
                    const num = parseInt(binary, 2);
                    if (num >= 1 && num <= 26) {
                        const letterPos = 27 - num;
                        const char = String.fromCharCode(65 + letterPos - 1);
                        result += char;
                        details.push(`Digit chunk '${chunk}' -> Binary '${binary}' -> Pos ${num} -> Letter '${char}'`);
                    } else {
                        result += '?';
                        details.push(`Digit chunk '${chunk}' -> Binary '${binary}' -> Pos ${num} (out of 1-26 range) -> '?'`);
                    }
                }
            } else {
                let binary = '';
                for (let b = 0; b < currentDigitBuffer.length; b++) {
                    const bit = digitToBit(currentDigitBuffer[b]);
                    if (bit !== null) binary += bit;
                }
                if (binary.length > 0) {
                    const num = parseInt(binary, 2);
                    if (num >= 1 && num <= 26) {
                        const letterPos = 27 - num;
                        const char = String.fromCharCode(65 + letterPos - 1);
                        result += char;
                        details.push(`Digits '${currentDigitBuffer}' -> Binary '${binary}' -> Pos ${num} -> Letter '${char}'`);
                    } else {
                        result += '?';
                        details.push(`Digits '${currentDigitBuffer}' -> Binary '${binary}' -> Pos ${num} (out of 1-26) -> '?'`);
                    }
                }
            }
            currentDigitBuffer = '';
        };

        while (i < text.length) {
            const char = text[i];
            
            if (char === '8' && text[i + 1] === '8') {
                processBuffer();
                result += ' ';
                details.push(`Double '88' detected -> Space`);
                i += 2;
            } else if (char >= '0' && char <= '9' && char !== '8') {
                currentDigitBuffer += char;
                i++;
            } else if (char === '8') {
                details.push(`Warning: Lone '8' ignored at position ${i}`);
                i++;
            } else if (char === ' ' || char === '\n' || char === '\t') {
                if (!isFixed) {
                    processBuffer();
                }
                i++;
            } else {
                processBuffer();
                if (retainPunctuation) {
                    result += char;
                    details.push(`Punctuation '${char}' retained`);
                } else {
                    details.push(`Punctuation '${char}' skipped`);
                }
                i++;
            }
        }

        processBuffer();

        steps.push({
            title: "Decoding Process Details",
            content: summarizeSteps(details)
        });

        return { result, steps };
    }
};

/**
 * 10. ELDER FUTHARK RUNES
 * Transliteration to/from the 24-rune Elder Futhark (plus Æ/Ø/Å mappings for
 * Scandinavian text: ᛇ eihwaz for Æ, and the medieval/younger runes ᚯ for Ø
 * and ᚬ for Å). Latin letters without their own rune share one: C/K/Q -> ᚲ,
 * V/W -> ᚹ, Y -> ᛁ, X -> ᚲᛊ. TH and NG are encoded with their single runes
 * ᚦ and ᛜ, so decoding is not always a perfect character-level round trip.
 */
const FUTHARK_DIGRAPHS = { 'th': 'ᚦ', 'ng': 'ᛜ' };
const FUTHARK_MAP = {
    'a': 'ᚨ', 'b': 'ᛒ', 'c': 'ᚲ', 'd': 'ᛞ', 'e': 'ᛖ', 'f': 'ᚠ',
    'g': 'ᚷ', 'h': 'ᚺ', 'i': 'ᛁ', 'j': 'ᛃ', 'k': 'ᚲ', 'l': 'ᛚ',
    'm': 'ᛗ', 'n': 'ᚾ', 'o': 'ᛟ', 'p': 'ᛈ', 'q': 'ᚲ', 'r': 'ᚱ',
    's': 'ᛊ', 't': 'ᛏ', 'u': 'ᚢ', 'v': 'ᚹ', 'w': 'ᚹ', 'x': 'ᚲᛊ',
    'y': 'ᛁ', 'z': 'ᛉ', 'æ': 'ᛇ', 'ø': 'ᚯ', 'å': 'ᚬ'
};

// Reverse map for decoding; first Latin letter listed for a rune wins
// (ᚲ -> k, ᚹ -> w, ᛁ -> i), digraph runes decode to their two letters.
const FUTHARK_REVERSE = (() => {
    const rev = { 'ᚦ': 'th', 'ᛜ': 'ng', 'ᚲ': 'k', 'ᚹ': 'w', 'ᛁ': 'i' };
    for (const [latin, rune] of Object.entries(FUTHARK_MAP)) {
        if (rune.length === 1 && !(rune in rev)) {
            rev[rune] = latin;
        }
    }
    return rev;
})();

export const Futhark = {
    encode(text, _, retainPunctuation) {
        const steps = [{
            title: "Elder Futhark Transliteration",
            content: "Runes have no letter case; text is transliterated lowercase.\nShared runes: C/K/Q -> ᚲ, V/W -> ᚹ, Y -> ᛁ, X -> ᚲᛊ.\nDigraphs: TH -> ᚦ, NG -> ᛜ.\nScandinavian: Æ -> ᛇ, Ø -> ᚯ, Å -> ᚬ."
        }];
        const details = [];
        const lower = text.toLowerCase();
        let result = '';
        let i = 0;

        while (i < lower.length) {
            const pair = lower.slice(i, i + 2);
            if (FUTHARK_DIGRAPHS[pair]) {
                result += FUTHARK_DIGRAPHS[pair];
                details.push(`'${pair}' -> ${FUTHARK_DIGRAPHS[pair]} (single rune)`);
                i += 2;
                continue;
            }
            const char = lower[i];
            if (FUTHARK_MAP[char]) {
                result += FUTHARK_MAP[char];
                details.push(`'${char}' -> ${FUTHARK_MAP[char]}`);
            } else if (char === ' ') {
                result += ' ';
                details.push('Space preserved');
            } else if (retainPunctuation) {
                result += char;
                details.push(`Punctuation '${char}' retained`);
            } else {
                details.push(`Punctuation '${char}' skipped`);
            }
            i++;
        }

        steps.push({ title: "Character Transliteration", content: summarizeSteps(details) });
        return { result, steps };
    },

    decode(text, _, retainPunctuation) {
        const steps = [{
            title: "Elder Futhark Transliteration",
            content: "Runes decode to lowercase Latin letters.\nᚲ -> k, ᚹ -> w, ᛁ -> i (these runes serve several Latin letters).\nᚦ -> th, ᛜ -> ng."
        }];
        const details = [];
        let result = '';

        for (const char of text) {
            if (FUTHARK_REVERSE[char]) {
                result += FUTHARK_REVERSE[char];
                details.push(`${char} -> '${FUTHARK_REVERSE[char]}'`);
            } else if (char === ' ') {
                result += ' ';
                details.push('Space preserved');
            } else if (retainPunctuation) {
                result += char;
                details.push(`Non-rune character '${char}' retained`);
            } else {
                details.push(`Non-rune character '${char}' skipped`);
            }
        }

        steps.push({ title: "Rune Translation", content: summarizeSteps(details) });
        return { result, steps };
    }
};

/**
 * YOUNGER FUTHARK RUNES
 * Transliteration to/from the 16-rune Younger Futhark (long-branch) — the
 * actual Viking-age Scandinavian alphabet. With only 16 runes for many more
 * sounds, several Latin letters share a rune (U/V/W/O → ᚢ, K/C/Q/G → ᚴ,
 * I/E/J → ᛁ, S/Z → ᛋ, T/D → ᛏ, B/P → ᛒ). TH is one rune ᚦ; Scandinavian
 * Å → ᚬ, Æ/Ä → ᛅ, Ø/Ö → ᚢ. It's a lossy transliteration, so decoding is not
 * a perfect character-level round trip.
 */
const YOUNGER_DIGRAPHS = { 'th': 'ᚦ' };
const YOUNGER_MAP = {
    'a': 'ᛅ', 'b': 'ᛒ', 'c': 'ᚴ', 'd': 'ᛏ', 'e': 'ᛁ', 'f': 'ᚠ',
    'g': 'ᚴ', 'h': 'ᚼ', 'i': 'ᛁ', 'j': 'ᛁ', 'k': 'ᚴ', 'l': 'ᛚ',
    'm': 'ᛘ', 'n': 'ᚾ', 'o': 'ᚢ', 'p': 'ᛒ', 'q': 'ᚴ', 'r': 'ᚱ',
    's': 'ᛋ', 't': 'ᛏ', 'u': 'ᚢ', 'v': 'ᚢ', 'w': 'ᚢ', 'x': 'ᚴᛋ',
    'y': 'ᛦ', 'z': 'ᛋ', 'æ': 'ᛅ', 'ä': 'ᛅ', 'ø': 'ᚢ', 'ö': 'ᚢ', 'å': 'ᚬ'
};

// Reverse map for decoding; the first Latin letter listed for a rune wins.
const YOUNGER_REVERSE = (() => {
    const rev = { 'ᚦ': 'th', 'ᚢ': 'u', 'ᚴ': 'k', 'ᛁ': 'i', 'ᛋ': 's', 'ᛏ': 't', 'ᛒ': 'b', 'ᛅ': 'a', 'ᚬ': 'å', 'ᛦ': 'y' };
    for (const [latin, rune] of Object.entries(YOUNGER_MAP)) {
        if (rune.length === 1 && !(rune in rev)) rev[rune] = latin;
    }
    return rev;
})();

export const YoungerFuthark = {
    encode(text, _, retainPunctuation) {
        const steps = [{
            title: 'Younger Futhark Transliteration',
            content: 'The 16-rune Viking-age alphabet. Runes have no case.\nShared runes: U/V/W/O → ᚢ, K/C/Q/G → ᚴ, I/E/J → ᛁ, S/Z → ᛋ, T/D → ᛏ, B/P → ᛒ, Y → ᛦ.\nDigraph: TH → ᚦ.  Scandinavian: Å → ᚬ, Æ/Ä → ᛅ, Ø/Ö → ᚢ.'
        }];
        const details = [];
        const lower = text.toLowerCase();
        let result = '';
        let i = 0;
        while (i < lower.length) {
            const pair = lower.slice(i, i + 2);
            if (YOUNGER_DIGRAPHS[pair]) {
                result += YOUNGER_DIGRAPHS[pair];
                details.push(`'${pair}' -> ${YOUNGER_DIGRAPHS[pair]} (single rune)`);
                i += 2;
                continue;
            }
            const char = lower[i];
            if (YOUNGER_MAP[char]) {
                result += YOUNGER_MAP[char];
                details.push(`'${char}' -> ${YOUNGER_MAP[char]}`);
            } else if (char === ' ') {
                result += ' ';
                details.push('Space preserved');
            } else if (retainPunctuation) {
                result += char;
                details.push(`Punctuation '${char}' retained`);
            } else {
                details.push(`Punctuation '${char}' skipped`);
            }
            i++;
        }
        steps.push({ title: 'Character Transliteration', content: summarizeSteps(details) });
        return { result, steps };
    },

    decode(text, _, retainPunctuation) {
        const steps = [{
            title: 'Younger Futhark Transliteration',
            content: 'Runes decode to a representative Latin letter (several sounds share a rune, so this is not a perfect round trip). ᚦ -> th.'
        }];
        const details = [];
        let result = '';
        for (const char of text) {
            if (YOUNGER_REVERSE[char]) {
                result += YOUNGER_REVERSE[char];
                details.push(`${char} -> '${YOUNGER_REVERSE[char]}'`);
            } else if (char === ' ') {
                result += ' ';
                details.push('Space preserved');
            } else if (retainPunctuation) {
                result += char;
                details.push(`Non-rune character '${char}' retained`);
            } else {
                details.push(`Non-rune character '${char}' skipped`);
            }
        }
        steps.push({ title: 'Rune Translation', content: summarizeSteps(details) });
        return { result, steps };
    }
};

/**
 * 11. MORSE CODE
 * International Morse with Scandinavian extensions. Æ and Ä share ".-.-",
 * Ø and Ö share "---."; decoding resolves those to Æ and Ø. Letters are
 * separated by spaces, words by " / ".
 */
const MORSE_MAP = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..',
    'Æ': '.-.-', 'Ø': '---.', 'Å': '.--.-', 'Ä': '.-.-', 'Ö': '---.',
    '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
    '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
    '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
    '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
    ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
    '"': '.-..-.', '$': '...-..-', '@': '.--.-.'
};

// Reverse map for decoding; the first character listed for a code wins,
// so ".-.-" resolves to Æ (not Ä) and "---." to Ø (not Ö).
const MORSE_REVERSE = (() => {
    const rev = {};
    for (const [char, code] of Object.entries(MORSE_MAP)) {
        if (!(code in rev)) rev[code] = char;
    }
    return rev;
})();

const MORSE_LETTER_OR_DIGIT = /[A-Z0-9ÆØÅÄÖ]/;

export const Morse = {
    encode(text, _, retainPunctuation) {
        const steps = [{
            title: "Morse Configuration",
            content: `Letters separated by spaces, words by " / ".\nScandinavian codes: Æ/Ä ".-.-", Ø/Ö "---.", Å ".--.-".\nRetain Punctuation: ${retainPunctuation ? 'Yes (punctuation with Morse codes is encoded)' : 'No (punctuation skipped)'}`
        }];
        const details = [];
        const tokens = [];

        for (const raw of text) {
            const char = raw.toUpperCase();
            if (char === ' ' || raw === '\n' || raw === '\t') {
                if (tokens[tokens.length - 1] !== '/') {
                    tokens.push('/');
                    details.push('Word break -> /');
                }
            } else if (MORSE_LETTER_OR_DIGIT.test(char) && MORSE_MAP[char]) {
                tokens.push(MORSE_MAP[char]);
                details.push(`'${char}' -> ${MORSE_MAP[char]}`);
            } else if (MORSE_MAP[char]) {
                if (retainPunctuation) {
                    tokens.push(MORSE_MAP[char]);
                    details.push(`Punctuation '${raw}' -> ${MORSE_MAP[char]}`);
                } else {
                    details.push(`Punctuation '${raw}' skipped`);
                }
            } else {
                details.push(`No Morse code for '${raw}' - skipped`);
            }
        }

        steps.push({ title: "Character Encoding", content: summarizeSteps(details) });
        return { result: tokens.join(' '), steps };
    },

    decode(text, _, retainPunctuation) {
        const steps = [{
            title: "Morse Configuration",
            content: 'Expecting letters separated by spaces and words by "/".\nUnrecognized codes decode to "?".'
        }];
        const details = [];
        let result = '';

        const tokens = text.trim().split(/\s+/);
        if (tokens.length === 1 && tokens[0] === '') {
            return { result: '', steps: [{ title: "Status", content: "No Morse tokens found." }] };
        }

        for (const token of tokens) {
            if (token === '/') {
                result += ' ';
                details.push('/ -> word break');
            } else if (MORSE_REVERSE[token]) {
                result += MORSE_REVERSE[token];
                details.push(`${token} -> '${MORSE_REVERSE[token]}'`);
            } else {
                result += '?';
                details.push(`Unrecognized code '${token}' -> '?'`);
            }
        }

        steps.push({ title: "Code Translation", content: summarizeSteps(details) });
        return { result, steps };
    }
};

/**
 * 12. CAESAR BRUTE FORCE (helper)
 * Decodes the input with every possible shift of the chosen alphabet so an
 * unknown Caesar key can be cracked by eye. Uses the same alphabets as the
 * Caesar cipher (plain English or the 29-letter Scandinavian variants).
 */
const BRUTE_ALPHABETS = {
    'en': {
        label: 'English (A-Z, 26 letters)',
        upper: CAESAR_ALPHABETS['en'].upper,
        lower: CAESAR_ALPHABETS['en'].lower
    },
    'dk-no': {
        label: 'Danish & Norwegian (A-Z + Æ, Ø, Å, 29 letters)',
        upper: CAESAR_ALPHABETS['dk-no'].upper,
        lower: CAESAR_ALPHABETS['dk-no'].lower
    },
    'se': {
        label: 'Swedish (A-Z + Å, Ä, Ö, 29 letters)',
        upper: CAESAR_ALPHABETS['se'].upper,
        lower: CAESAR_ALPHABETS['se'].lower
    }
};

export const CaesarBruteForce = {
    /**
     * Returns { candidates, steps } — one { shift, decoded } entry per
     * possible shift — instead of the { result, steps } shape the other
     * ciphers use. The registry entry picks a single candidate (or joins
     * them all) based on the UI's shift slider and "show all" toggle.
     */
    analyze(text, alphabetKey) {
        const alphabet = BRUTE_ALPHABETS[alphabetKey] || BRUTE_ALPHABETS['en'];
        const size = alphabet.upper.length;

        const decodeWithShift = (shift) => {
            let out = '';
            for (const char of text) {
                let idx = alphabet.upper.indexOf(char);
                if (idx !== -1) {
                    out += alphabet.upper[(idx - shift + size) % size];
                    continue;
                }
                idx = alphabet.lower.indexOf(char);
                if (idx !== -1) {
                    out += alphabet.lower[(idx - shift + size) % size];
                    continue;
                }
                out += char;
            }
            return out;
        };

        const candidates = [];
        for (let shift = 0; shift < size; shift++) {
            candidates.push({ shift, decoded: decodeWithShift(shift) });
        }

        const steps = [{
            title: "Brute Force Analysis",
            content: `Alphabet: ${alphabet.label}\nComputed all ${size} possible shifts (shift 00 is the unmodified input).\n\nDrag the shift slider until the output reads as plain language - that shift number is the key the message was encoded with. Enable "Show all shifts" to list every candidate at once.`
        }];

        return { candidates, steps };
    },

    // Join every candidate into the classic one-line-per-shift listing.
    formatAll(candidates) {
        return candidates
            .map((c) => `Shift ${String(c.shift).padStart(2, '0')}: ${c.decoded}`)
            .join('\n');
    }
};
