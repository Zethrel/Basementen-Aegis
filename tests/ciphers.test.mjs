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
