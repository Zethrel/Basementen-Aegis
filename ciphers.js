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
 * ScandiCaesar, Vigenere). Spaces are always preserved; other non-letter characters
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

/**
 * 1. CAESAR CIPHER
 */
export const Caesar = {
    encode(text, shift, retainPunctuation) {
        shift = parseInt(shift, 10) || 0;
        shift = ((shift % 26) + 26) % 26; // Normalize shift
        const steps = [{
            title: "Configuration",
            content: `Mode: Encode\nShift Key: ${shift}\nRetain Punctuation: ${retainPunctuation ? 'Yes' : 'No'}`
        }];

        const { result, letterSteps } = processChars(text, retainPunctuation, (char) => {
            if (!isLetter(char)) return null;
            const isUppercase = isUpper(char);
            const originalIndex = getAlphabetIndex(char);
            const newIndex = (originalIndex + shift) % 26;
            const encodedChar = getLetterFromIndex(newIndex, isUppercase);
            return { char: encodedChar, step: `'${char}' (index ${originalIndex}) + Shift ${shift} -> index ${newIndex} -> '${encodedChar}'` };
        });

        steps.push({ title: "Character Processing", content: letterSteps.join('\n') });
        return { result, steps };
    },

    decode(text, shift, retainPunctuation) {
        shift = parseInt(shift, 10) || 0;
        shift = ((shift % 26) + 26) % 26; // Normalize shift
        const steps = [{
            title: "Configuration",
            content: `Mode: Decode\nShift Key: ${shift}\nRetain Punctuation: ${retainPunctuation ? 'Yes' : 'No'}`
        }];

        const { result, letterSteps } = processChars(text, retainPunctuation, (char) => {
            if (!isLetter(char)) return null;
            const isUppercase = isUpper(char);
            const originalIndex = getAlphabetIndex(char);
            const newIndex = (originalIndex - shift + 26) % 26;
            const decodedChar = getLetterFromIndex(newIndex, isUppercase);
            return { char: decodedChar, step: `'${char}' (index ${originalIndex}) - Shift ${shift} -> index ${newIndex} -> '${decodedChar}'` };
        });

        steps.push({ title: "Character Processing", content: letterSteps.join('\n') });
        return { result, steps };
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
        const run = Caesar.encode(text, 13, retainPunctuation);
        steps.push(...run.steps.slice(1)); // Reuse character processing steps
        return { result: run.result, steps };
    },
    decode(text, _, retainPunctuation) {
        const steps = [{
            title: "ROT13 Characteristics",
            content: "ROT13 is a special case of Caesar cipher with a fixed shift of 13.\nIt is self-reciprocal, meaning decoding is identical to encoding (shifting by 13 again)."
        }];
        const run = Caesar.decode(text, 13, retainPunctuation);
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

        steps.push({ title: "Character Processing", content: letterSteps.join('\n') });
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

        steps.push({ title: "Key Alignment & Shifts", content: letterSteps.join('\n') });
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

        steps.push({ title: "Key Alignment & Shifts", content: letterSteps.join('\n') });
        return { result, steps };
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
            content: letterSteps.join('\n')
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
            content: letterSteps.join('\n')
        });

        return { result, steps };
    }
};

/**
 * 7. A1Z26 CIPHER
 */
export const A1z26 = {
    encode(text, _, retainPunctuation) {
        let resultArr = [];
        const steps = [];
        const details = [];

        let currentWord = [];

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (isLetter(char)) {
                const pos = getAlphabetIndex(char) + 1;
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
            content: details.join('\n')
        });

        return { result: result.trim(), steps };
    },

    decode(text, _, retainPunctuation) {
        let result = '';
        const steps = [];
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
                if (num >= 1 && num <= 26) {
                    const letter = String.fromCharCode(65 + num - 1);
                    result += letter;
                    details.push(`Number '${num}' -> Alphabet Position -> '${letter}'`);
                } else {
                    result += '?';
                    details.push(`Number '${num}' out of range (1-26) -> '?'`);
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
            content: details.join('\n')
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
            content: details.join('\n')
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
            content: details.join('\n')
        });

        return { result, steps };
    }
};

const SCANDI_ALPHABETS = {
    'dk-no': {
        upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ",
        lower: "abcdefghijklmnopqrstuvwxyzæøå"
    },
    'se': {
        upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ",
        lower: "abcdefghijklmnopqrstuvwxyzåäö"
    }
};

export const ScandiCaesar = {
    encode(text, shift, variant, retainPunctuation) {
        const alphabet = SCANDI_ALPHABETS[variant] || SCANDI_ALPHABETS['dk-no'];
        const upper = alphabet.upper;
        const lower = alphabet.lower;
        const size = upper.length;
        shift = parseInt(shift, 10) || 0;
        shift = ((shift % size) + size) % size;

        const steps = [{
            title: "Configuration",
            content: `Mode: Encode\nVariant: ${variant === 'se' ? 'Swedish' : 'Danish/Norwegian'}\nShift Key: ${shift}\nRetain Punctuation: ${retainPunctuation ? 'Yes' : 'No'}`
        }];

        const { result, letterSteps } = processChars(text, retainPunctuation, (char) => {
            const alphabetStr = upper.indexOf(char) !== -1 ? upper : (lower.indexOf(char) !== -1 ? lower : null);
            if (!alphabetStr) return null;
            const index = alphabetStr.indexOf(char);
            const newIndex = (index + shift) % size;
            const encodedChar = alphabetStr[newIndex];
            return { char: encodedChar, step: `'${char}' (index ${index}) + Shift ${shift} -> index ${newIndex} -> '${encodedChar}'` };
        });

        steps.push({ title: "Character Processing", content: letterSteps.join('\n') });
        return { result, steps };
    },

    decode(text, shift, variant, retainPunctuation) {
        const alphabet = SCANDI_ALPHABETS[variant] || SCANDI_ALPHABETS['dk-no'];
        const upper = alphabet.upper;
        const lower = alphabet.lower;
        const size = upper.length;
        shift = parseInt(shift, 10) || 0;
        shift = ((shift % size) + size) % size;

        const steps = [{
            title: "Configuration",
            content: `Mode: Decode\nVariant: ${variant === 'se' ? 'Swedish' : 'Danish/Norwegian'}\nShift Key: ${shift}\nRetain Punctuation: ${retainPunctuation ? 'Yes' : 'No'}`
        }];

        const { result, letterSteps } = processChars(text, retainPunctuation, (char) => {
            const alphabetStr = upper.indexOf(char) !== -1 ? upper : (lower.indexOf(char) !== -1 ? lower : null);
            if (!alphabetStr) return null;
            const index = alphabetStr.indexOf(char);
            const newIndex = (index - shift + size) % size;
            const decodedChar = alphabetStr[newIndex];
            return { char: decodedChar, step: `'${char}' (index ${index}) - Shift ${shift} -> index ${newIndex} -> '${decodedChar}'` };
        });

        steps.push({ title: "Character Processing", content: letterSteps.join('\n') });
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

        steps.push({ title: "Character Transliteration", content: details.join('\n') });
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

        steps.push({ title: "Rune Translation", content: details.join('\n') });
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

        steps.push({ title: "Character Encoding", content: details.join('\n') });
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

        steps.push({ title: "Code Translation", content: details.join('\n') });
        return { result, steps };
    }
};

/**
 * 12. CAESAR BRUTE FORCE (helper)
 * Decodes the input with every possible shift of the chosen alphabet so an
 * unknown Caesar key can be cracked by eye. Supports the plain English
 * alphabet and both Scandinavian variants (29 letters including Æ/Ø/Å or
 * Å/Ä/Ö), matching the Scandi Caesar cipher.
 */
const BRUTE_ALPHABETS = {
    'en': {
        label: 'English (A-Z, 26 letters)',
        upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        lower: "abcdefghijklmnopqrstuvwxyz"
    },
    'dk-no': {
        label: 'Danish & Norwegian (A-Z + Æ, Ø, Å, 29 letters)',
        upper: SCANDI_ALPHABETS['dk-no'].upper,
        lower: SCANDI_ALPHABETS['dk-no'].lower
    },
    'se': {
        label: 'Swedish (A-Z + Å, Ä, Ö, 29 letters)',
        upper: SCANDI_ALPHABETS['se'].upper,
        lower: SCANDI_ALPHABETS['se'].lower
    }
};

export const CaesarBruteForce = {
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

        const lines = [];
        for (let shift = 0; shift < size; shift++) {
            lines.push(`Shift ${String(shift).padStart(2, '0')}: ${decodeWithShift(shift)}`);
        }

        const steps = [{
            title: "Brute Force Analysis",
            content: `Alphabet: ${alphabet.label}\nTried all ${size} possible shifts (shift 00 is the unmodified input).\n\nScan the output for the line that reads as plain language - its shift number is the key the message was encoded with.`
        }];

        return { result: lines.join('\n'), steps };
    }
};

/**
 * 13. THE BASEMENTEN CIPHER
 *
 * Messages are encrypted with AES-256-GCM via WebCrypto, keyed by the vault's
 * random 40-character keyword (hashed with SHA-256 to produce the AES key \u2014
 * fine for high-entropy key material like this; passwords go through PBKDF2
 * in the vault layer instead). Ciphertext format: "SB1:" + base64(iv || ct).
 *
 * Decode transparently falls back to the pre-AES alphabet-shift scheme for
 * ciphertexts that don't carry the SB1 prefix, so messages saved or shared
 * before the upgrade still decrypt.
 */
const ALPHANUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789\u00e6\u00f8\u00e5\u00c6\u00d8\u00c5";
const BASEMENTEN_PREFIX = 'SB1:';

function bytesToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToBytes(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

async function basementenAesKey(keyStr) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(keyStr));
    return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

// Pre-AES alphabet-shift decoder, kept only so old ciphertexts remain readable.
function basementenLegacyDecode(text, key, retainPunctuation) {
    let result = '';
    let keyIdx = 0;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const idx = ALPHANUM.indexOf(char);
        if (idx !== -1) {
            const keyChar = key[keyIdx % key.length];
            const shift = keyChar.charCodeAt(0);
            const newIndex = ((idx - shift) % ALPHANUM.length + ALPHANUM.length) % ALPHANUM.length;
            result += ALPHANUM[newIndex];
            keyIdx++;
        } else {
            if (char === ' ') {
                result += ' ';
            } else if (retainPunctuation) {
                result += char;
            }
        }
    }

    return { result, steps: [] };
}

export const Basementen = {
    async encode(text, key) {
        if (!key) {
            return { result: '', steps: [] };
        }

        const aesKey = await basementenAesKey(key);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            aesKey,
            new TextEncoder().encode(text)
        ));

        const packed = new Uint8Array(iv.length + ciphertext.length);
        packed.set(iv);
        packed.set(ciphertext, iv.length);

        return { result: BASEMENTEN_PREFIX + bytesToBase64(packed), steps: [] };
    },

    async decode(text, key, retainPunctuation) {
        if (!key) {
            return { result: '', steps: [] };
        }

        const trimmed = text.trim();
        if (trimmed.startsWith(BASEMENTEN_PREFIX)) {
            try {
                const packed = base64ToBytes(trimmed.slice(BASEMENTEN_PREFIX.length));
                const iv = packed.slice(0, 12);
                const ciphertext = packed.slice(12);
                const aesKey = await basementenAesKey(key);
                const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ciphertext);
                return { result: new TextDecoder().decode(plaintext), steps: [] };
            } catch (e) {
                return { result: '[DECRYPTION FAILED: wrong key or corrupted ciphertext]', steps: [] };
            }
        }

        return basementenLegacyDecode(text, key, retainPunctuation);
    }
};

