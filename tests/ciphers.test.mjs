/**
 * Cipher algorithm tests. Zero dependencies — runs on Node's built-in test
 * runner (Node >= 22, which auto-detects the ES module syntax in ciphers.js):
 *
 *     node --test
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    setFullStepDetail,
    Caesar,
    Rot13,
    Atbash,
    Vigenere,
    Gronsfeld,
    Beaufort,
    Autokey,
    KeywordSub,
    YoungerFuthark,
    FourSquare,
    Bifid,
    Affine,
    affineCoprimes,
    Playfair,
    Polybius,
    Bacon,
    Columnar,
    Scytale,
    RailFence,
    BinaryConverter,
    A1z26,
    BinaryReverse,
    Futhark,
    Morse,
    CaesarBruteForce
} from '../ciphers.js';

// Every cipher result must carry the { result, steps } shape that drives the UI.
function assertShape(obj) {
    assert.equal(typeof obj.result, 'string');
    assert.ok(Array.isArray(obj.steps));
    for (const step of obj.steps) {
        assert.equal(typeof step.title, 'string');
        assert.equal(typeof step.content, 'string');
    }
}

test('Step summarization: long inputs collapse to edges + omission marker', () => {
    const long = 'a'.repeat(150);
    const steps = Caesar.encode(long, 3, 'en', true).steps;
    const lines = steps[1].content.split('\n');
    assert.equal(lines.length, 21); // 10 + marker + 10
    assert.ok(lines[10].includes('130 steps omitted (150 total'));

    // Short inputs keep full detail
    const short = Caesar.encode('a'.repeat(60), 3, 'en', true).steps;
    assert.equal(short[1].content.split('\n').length, 60);

    // The full-detail flag restores every line
    setFullStepDetail(true);
    try {
        const full = Caesar.encode(long, 3, 'en', true).steps;
        assert.equal(full[1].content.split('\n').length, 150);
    } finally {
        setFullStepDetail(false);
    }
});

test('Caesar: known value, case and punctuation preserved', () => {
    const enc = Caesar.encode('Hello, World!', 3, 'en', true);
    assertShape(enc);
    assert.equal(enc.result, 'Khoor, Zruog!');
    assert.equal(Caesar.decode(enc.result, 3, 'en', true).result, 'Hello, World!');
});

test('Caesar: shift is normalized to the chosen alphabet size', () => {
    const base = Caesar.encode('abc', 25, 'en', true).result;
    assert.equal(Caesar.encode('abc', -1, 'en', true).result, base);
    assert.equal(Caesar.encode('abc', 51, 'en', true).result, base);
    // 29-letter alphabet wraps at 29, not 26
    const baseDk = Caesar.encode('abc', 28, 'dk-no', true).result;
    assert.equal(Caesar.encode('abc', -1, 'dk-no', true).result, baseDk);
    assert.equal(Caesar.encode('abc', 57, 'dk-no', true).result, baseDk);
});

test('Caesar: punctuation skipped when retainPunctuation is false', () => {
    assert.equal(Caesar.encode('a.b!c', 1, 'en', false).result, 'bcd');
});

test('Caesar: wrap-around depends on the alphabet', () => {
    // In English z + 3 wraps to c; in Danish/Norwegian the alphabet
    // continues ...z, æ, ø, å so z + 3 lands on å.
    assert.equal(Caesar.encode('z', 3, 'en', true).result, 'c');
    assert.equal(Caesar.encode('z', 3, 'dk-no', true).result, 'å');
    assert.equal(Caesar.encode('Z', 3, 'se', true).result, 'Ö');
});

test('Caesar: unknown variant falls back to English', () => {
    assert.equal(Caesar.encode('abc', 1, undefined, true).result, 'bcd');
});

test('ROT13 is its own inverse', () => {
    const text = 'The Quick Brown Fox!';
    const once = Rot13.encode(text, null, true);
    assertShape(once);
    assert.notEqual(once.result, text);
    assert.equal(Rot13.encode(once.result, null, true).result, text);
});

test('Atbash is its own inverse', () => {
    const enc = Atbash.encode('Abc xyz', null, true);
    assertShape(enc);
    assert.equal(enc.result, 'Zyx cba');
    assert.equal(Atbash.encode(enc.result, null, true).result, 'Abc xyz');
});

test('Vigenere: classic known value and round trip', () => {
    const enc = Vigenere.encode('ATTACKATDAWN', 'LEMON', true);
    assertShape(enc);
    assert.equal(enc.result, 'LXFOPVEFRNHR');
    assert.equal(Vigenere.decode(enc.result, 'LEMON', true).result, 'ATTACKATDAWN');
});

test('Keyword substitution: keyword builds the cipher alphabet, round trips', () => {
    // Keyword KRYPTOS: cipher alphabet starts K R Y P T O S …, so A→K
    assert.equal(KeywordSub.encode('A', 'KRYPTOS', 'en', true).result, 'K');
    const enc = KeywordSub.encode('Hello, World!', 'ZEBRA', 'en', true);
    assertShape(enc);
    assert.equal(KeywordSub.decode(enc.result, 'ZEBRA', 'en', true).result, 'Hello, World!');
    // Scandinavian alphabets scramble and restore Æ/Ø/Å too
    assert.equal(KeywordSub.decode(KeywordSub.encode('Blåbær grød', 'NØKKEL', 'dk-no', true).result,
        'NØKKEL', 'dk-no', true).result, 'Blåbær grød');
});

test('Younger Futhark: 16-rune transliteration (lossy by design)', () => {
    const enc = YoungerFuthark.encode('Viking', null, true);
    assertShape(enc);
    assert.equal(enc.result, 'ᚢᛁᚴᛁᚾᚴ'); // V/K→shared runes
    // Scandinavian runes are reachable
    assert.equal(YoungerFuthark.encode('å', null, true).result, 'ᚬ');
    assert.equal(YoungerFuthark.encode('y', null, true).result, 'ᛦ');
    // TH is a single rune
    assert.equal(YoungerFuthark.encode('thor', null, true).result, 'ᚦᚢᚱ');
});

test('Gronsfeld: numeric-key Vigenère, canonical value and round trips', () => {
    // Digit key acts as per-position Caesar shifts: A+3=D, B+1=C, C+4=G, D+1=E, E+5=J
    const enc = Gronsfeld.encode('ABCDE', '31415', 'en', true);
    assertShape(enc);
    assert.equal(enc.result, 'DCGEJ');
    assert.equal(Gronsfeld.decode(enc.result, '31415', 'en', true).result, 'ABCDE');
    assert.equal(Gronsfeld.decode(Gronsfeld.encode('Hello, World!', '271', 'en', true).result,
        '271', 'en', true).result, 'Hello, World!');
    assert.equal(Gronsfeld.decode(Gronsfeld.encode('Blåbær grød', '4092', 'dk-no', true).result,
        '4092', 'dk-no', true).result, 'Blåbær grød');
    // Empty / non-digit key clears output rather than leaking plaintext
    assert.equal(Gronsfeld.encode('SECRET', 'abc', 'en', true).result, '');
});

test('Four-Square: canonical value (EXAMPLE / KEYWORD) and round trips', () => {
    const enc = FourSquare.encode('help me', 'EXAMPLE', 'KEYWORD', 'en');
    assertShape(enc);
    assert.equal(enc.result.replace(/\s+/g, ''), 'FYNFNE');
    assert.equal(FourSquare.decode(enc.result, 'EXAMPLE', 'KEYWORD', 'en').result.replace(/\s+/g, ''), 'HELPME');
    // Scandinavian 4×7 grid round trips (letters only, uppercased)
    const dk = FourSquare.encode('Blåbær', 'NØKKEL', 'FISK', 'dk-no');
    assert.equal(FourSquare.decode(dk.result, 'NØKKEL', 'FISK', 'dk-no').result.replace(/\s+/g, ''), 'BLÅBÆR');
});

test('Bifid: fractionation round trips (English and Scandinavian)', () => {
    const enc = Bifid.encode('FLEEATONCE', 'KEYWORD', 'en');
    assertShape(enc);
    assert.equal(Bifid.decode(enc.result, 'KEYWORD', 'en').result, 'FLEEATONCE');
    // I/J fold: J is encoded as I, so decode recovers I
    assert.equal(Bifid.decode(Bifid.encode('JUMP', 'KEY', 'en').result, 'KEY', 'en').result, 'IUMP');
    // Scandinavian 6×5 grid keeps all 29 letters distinct
    const dk = Bifid.encode('BLÅBÆRGRØD', 'NØKKEL', 'dk-no');
    assert.equal(Bifid.decode(dk.result, 'NØKKEL', 'dk-no').result, 'BLÅBÆRGRØD');
});

test('Beaufort: canonical value, reciprocity, and Scandinavian round trip', () => {
    const enc = Beaufort.encode('DEFENDTHEEASTWALL', 'FORTIFICATION', 'en', true);
    assertShape(enc);
    assert.equal(enc.result, 'CKMPVCPVWPIWUJOGI');
    // Reciprocal: applying again with the same key recovers the plaintext
    assert.equal(Beaufort.decode(enc.result, 'FORTIFICATION', 'en', true).result, 'DEFENDTHEEASTWALL');
    const dk = Beaufort.encode('Blåbær grød', 'NØKKEL', 'dk-no', true);
    assert.equal(Beaufort.decode(dk.result, 'NØKKEL', 'dk-no', true).result, 'Blåbær grød');
});

test('Autokey: canonical value, round trip, and Scandinavian round trip', () => {
    const enc = Autokey.encode('ATTACKATDAWN', 'QUEENLY', 'en', true);
    assertShape(enc);
    assert.equal(enc.result, 'QNXEPVYTWTWP');
    assert.equal(Autokey.decode(enc.result, 'QUEENLY', 'en', true).result, 'ATTACKATDAWN');
    const se = Autokey.encode('Höst på ön', 'NYCKEL', 'se', true);
    assert.equal(Autokey.decode(se.result, 'NYCKEL', 'se', true).result, 'Höst på ön');
});

test('Affine: canonical known value (a=5, b=8) and round trip', () => {
    const enc = Affine.encode('AFFINE CIPHER', 5, 8, 'en', true);
    assertShape(enc);
    assert.equal(enc.result, 'IHHWVC SWFRCP');
    assert.equal(Affine.decode(enc.result, 5, 8, 'en', true).result, 'AFFINE CIPHER');
});

test('Affine: a=1 reduces to a Caesar shift of b', () => {
    assert.equal(Affine.encode('abc', 1, 3, 'en', true).result, Caesar.encode('abc', 3, 'en', true).result);
});

test('Affine: non-coprime "a" is rejected with an error step', () => {
    const out = Affine.encode('abc', 2, 1, 'en', true); // 2 shares a factor with 26
    assert.equal(out.result, '');
    assert.equal(out.steps[0].title, 'Error');
});

test('Affine: Scandinavian alphabet (m=29 prime) — every a is valid and round trips', () => {
    // 29 is prime, so all 28 multipliers 1..28 are coprime and usable.
    assert.equal(affineCoprimes(26).length, 12);
    assert.equal(affineCoprimes(29).length, 28);
    const enc = Affine.encode('Blåbær grød', 4, 6, 'dk-no', true); // a=4 is invalid mod 26, valid mod 29
    assertShape(enc);
    assert.notEqual(enc.result, '');
    assert.equal(Affine.decode(enc.result, 4, 6, 'dk-no', true).result, 'Blåbær grød');
});

test('Playfair: builds the square and round trips (with X padding)', () => {
    const enc = Playfair.encode('instruments', 'MONARCHY', 'en');
    assertShape(enc);
    assert.equal(enc.result.replace(/\s/g, ''), 'GATLMZCLRQXA');
    // Decode recovers the padded, J-folded uppercase plaintext
    assert.equal(Playfair.decode(enc.result, 'MONARCHY', 'en').result.replace(/\s/g, ''), 'INSTRUMENTSX');
});

test('Playfair: I and J share a cell', () => {
    // "JET" folds J→I, so it encodes identically to "IET"
    assert.equal(Playfair.encode('JET', 'KEY', 'en').result, Playfair.encode('IET', 'KEY', 'en').result);
});

test('Playfair: Scandinavian 4×7 grid handles Æ/Ø/Å and round trips', () => {
    const enc = Playfair.encode('blåbær grød', 'NARWHAL', 'dk-no');
    assertShape(enc);
    // Æ/Ø/Å survive the round trip (decoded keeps digraph padding/uppercasing)
    assert.match(Playfair.decode(enc.result, 'NARWHAL', 'dk-no').result, /[ÆØÅ]/);
});

test('Polybius: known value, word breaks, and round trip', () => {
    const enc = Polybius.encode('Hi', 'en');
    assertShape(enc);
    assert.equal(enc.result, '23 24');
    assert.equal(Polybius.decode(Polybius.encode('Hello World', 'en').result, 'en').result,
        'HELLO WORLD');
    assert.equal(Polybius.decode('66', 'en').result, '?'); // out-of-range code
});

test('Polybius: Scandinavian 6×5 grid encodes Æ/Ø/Å and round trips', () => {
    assert.equal(Polybius.encode('Å', 'dk-no').result, '64'); // row 6, col 4
    assert.equal(Polybius.decode(Polybius.encode('Blåbær grød', 'dk-no').result, 'dk-no').result,
        'BLÅBÆR GRØD');
});

test('Bacon: 5-bit A/B groups, word breaks, and round trip', () => {
    const enc = Bacon.encode('AB', 'en');
    assertShape(enc);
    assert.equal(enc.result, 'AAAAA AAAAB'); // A=0, B=1
    assert.equal(Bacon.decode(Bacon.encode('Hi There', 'en').result, 'en').result,
        'HI THERE');
    assert.equal(Bacon.decode('ABABA', 'en').result, 'K'); // 01010b = 10 = K
});

test('Bacon: Scandinavian letters use the 32-pattern space and round trip', () => {
    assert.equal(Bacon.encode('Å', 'dk-no').result, 'BBBAA'); // index 28 = 11100b
    assert.equal(Bacon.decode(Bacon.encode('Höst på ön', 'se').result, 'se').result, 'HÖST PÅ ÖN');
});

test('Columnar transposition: canonical value and exact round trip', () => {
    const enc = Columnar.encode('WEAREDISCOVEREDFLEEATONCE', 'ZEBRAS');
    assertShape(enc);
    assert.equal(enc.result, 'EVLNACDTESEAROFODEECWIREE');
    assert.equal(Columnar.decode(enc.result, 'ZEBRAS').result, 'WEAREDISCOVEREDFLEEATONCE');
});

test('Columnar: transposes spaces, punctuation, and Scandinavian letters intact', () => {
    for (const text of ['attack at dawn, hold!', 'Blåbær grød og øl']) {
        const enc = Columnar.encode(text, 'NØKKEL');
        assert.equal(Columnar.decode(enc.result, 'NØKKEL').result, text);
    }
    // Short keyword is rejected
    assert.equal(Columnar.encode('abc', 'A').steps[0].title, 'Error');
});

test('Scytale: keyless transposition round trips exactly (incl. Scandinavian)', () => {
    for (const text of ['HELLO WORLD FROM THE ROD', 'Blåbær grød']) {
        for (const cols of [3, 4, 5]) {
            const enc = Scytale.encode(text, cols);
            assertShape(enc);
            assert.equal(Scytale.decode(enc.result, cols).result, text,
                `scytale round trip failed for ${cols} cols`);
        }
    }
});

test('Rail Fence: known value and round trips for rails 2-5', () => {
    assert.equal(RailFence.encode('WEAREDISCOVERED', 3, true).result, 'WECRERDSOEEAIVD');
    const text = 'Attack at dawn, hold the east gate!';
    for (let rails = 2; rails <= 5; rails++) {
        const enc = RailFence.encode(text, rails, true);
        assertShape(enc);
        assert.equal(RailFence.decode(enc.result, rails, true).result, text,
            `round trip failed for ${rails} rails`);
    }
});

test('Binary Converter: known value and round trip', () => {
    const enc = BinaryConverter.encode('Hi', null, true);
    assertShape(enc);
    assert.equal(enc.result, '01001000 01101001');
    assert.equal(BinaryConverter.decode(
        BinaryConverter.encode('Hi there', null, true).result, null, true
    ).result, 'Hi there');
});

test('A1Z26: known value; decode uppercases', () => {
    const enc = A1z26.encode('Hello world', null, true);
    assertShape(enc);
    assert.equal(enc.result, '8-5-12-12-15 23-15-18-12-4');
    assert.equal(A1z26.decode(enc.result, null, true).result, 'HELLO WORLD');
});

test('A1Z26: out-of-range numbers decode to "?"', () => {
    assert.equal(A1z26.decode('27-1', null, true).result, '?A');
});

test('A1Z26: Scandinavian alphabets extend to position 29', () => {
    const enc = A1z26.encode('Blåbær', 'dk-no', true);
    assert.equal(enc.result, '2-12-29-2-27-18');
    assert.equal(A1z26.decode(enc.result, 'dk-no', true).result, 'BLÅBÆR');

    const se = A1z26.encode('Höst', 'se', true);
    assert.equal(se.result, '8-29-19-20');
    assert.equal(A1z26.decode(se.result, 'se', true).result, 'HÖST');

    // 27 is valid in dk-no (Æ) but out of range in English
    assert.equal(A1z26.decode('27', 'dk-no', true).result, 'Æ');
    assert.equal(A1z26.decode('27', 'en', true).result, '?');
});

test('Binary Reverse: randomized encoding still round trips in both width modes', () => {
    // Digit choice is random per character, so encode twice: outputs may
    // differ but both must decode back to the same (uppercased) plaintext.
    const text = 'Hello World';
    for (const mode of ['fixed', 'variable']) {
        for (let i = 0; i < 2; i++) {
            const enc = BinaryReverse.encode(text, mode, true);
            assertShape(enc);
            assert.equal(BinaryReverse.decode(enc.result, mode, true).result, 'HELLO WORLD',
                `round trip failed in ${mode} mode`);
        }
    }
    // Variable mode separates numbers with spaces
    assert.ok(BinaryReverse.encode(text, 'variable', true).result.includes(' '));
});

test('Caesar: Æ/Ø/Å round trip in both Scandinavian alphabets', () => {
    const danish = 'Blåbær grød';
    const encDk = Caesar.encode(danish, 5, 'dk-no', true);
    assertShape(encDk);
    assert.equal(Caesar.decode(encDk.result, 5, 'dk-no', true).result, danish);

    const swedish = 'Höst på ön';
    const encSe = Caesar.encode(swedish, 17, 'se', true);
    assert.equal(Caesar.decode(encSe.result, 17, 'se', true).result, swedish);
});

test('Elder Futhark: digraphs collapse to single runes and round trip', () => {
    assert.equal(Futhark.encode('thing', null, true).result, 'ᚦᛁᛜ');
    const enc = Futhark.encode('futhark', null, true);
    assertShape(enc);
    assert.equal(Futhark.decode(enc.result, null, true).result, 'futhark');
});

test('Morse: known value, word breaks, and Scandinavian letters', () => {
    const enc = Morse.encode('SOS', null, true);
    assertShape(enc);
    assert.equal(enc.result, '... --- ...');
    assert.equal(Morse.decode(Morse.encode('Hello world', null, true).result, null, true).result,
        'HELLO WORLD');
    assert.equal(Morse.decode(Morse.encode('Blåbær', null, true).result, null, true).result,
        'BLÅBÆR');
});

test('Morse: unrecognized codes decode to "?"', () => {
    assert.equal(Morse.decode('...---...---', null, true).result, '?');
});

test('Caesar Brute Force: structured candidates contain the plaintext at the right shift', () => {
    const cipher = Caesar.encode('hello world', 7, 'en', true).result;
    const out = CaesarBruteForce.analyze(cipher, 'en');
    assert.ok(Array.isArray(out.candidates));
    assert.equal(out.candidates.length, 26);
    assert.deepEqual(out.candidates[7], { shift: 7, decoded: 'hello world' });
    assert.equal(out.candidates[0].decoded, cipher); // shift 0 = unmodified input
    for (const step of out.steps) {
        assert.equal(typeof step.title, 'string');
        assert.equal(typeof step.content, 'string');
    }
    // Scandinavian alphabets try all 29 shifts
    assert.equal(CaesarBruteForce.analyze('abc', 'dk-no').candidates.length, 29);
    // formatAll reproduces the classic one-line-per-shift listing
    const all = CaesarBruteForce.formatAll(out.candidates);
    assert.ok(all.includes('Shift 07: hello world'));
    assert.equal(all.split('\n').length, 26);
});
