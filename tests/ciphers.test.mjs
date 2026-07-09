/**
 * Cipher algorithm tests. Zero dependencies — runs on Node's built-in test
 * runner (Node >= 22, which auto-detects the ES module syntax in ciphers.js
 * and provides the WebCrypto + btoa globals the Basementen cipher needs):
 *
 *     node --test
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
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
    CaesarBruteForce,
    Basementen
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

test('Binary Reverse: randomized encoding still round trips', () => {
    // Digit choice is random per character, so encode twice: outputs may
    // differ but both must decode back to the same (uppercased) plaintext.
    const text = 'Hello World';
    for (let i = 0; i < 2; i++) {
        const enc = BinaryReverse.encode(text, 'fixed', true);
        assertShape(enc);
        assert.equal(BinaryReverse.decode(enc.result, 'fixed', true).result, 'HELLO WORLD');
    }
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

test('Caesar Brute Force: candidate list contains the plaintext at the right shift', () => {
    const cipher = Caesar.encode('hello world', 7, 'en', true).result;
    const out = CaesarBruteForce.analyze(cipher, 'en');
    assertShape(out);
    assert.ok(out.result.includes('Shift 07: hello world'));
    assert.equal(out.result.split('\n').length, 26);
    // Scandinavian alphabets try all 29 shifts
    assert.equal(CaesarBruteForce.analyze('abc', 'dk-no').result.split('\n').length, 29);
});

test('Basementen: encrypt/decrypt round trip with SB1 format', async () => {
    const key = 'a-40-char-high-entropy-transaction-key!!';
    const enc = await Basementen.encode('Meet at the basement at midnight. Blåbær.', key);
    assertShape(enc);
    assert.ok(enc.result.startsWith('SB1:'));
    const dec = await Basementen.decode(enc.result, key);
    assert.equal(dec.result, 'Meet at the basement at midnight. Blåbær.');
});

test('Basementen: random IV makes ciphertexts unique for identical input', async () => {
    const key = 'another-transaction-key-for-this-test';
    const a = await Basementen.encode('same message', key);
    const b = await Basementen.encode('same message', key);
    assert.notEqual(a.result, b.result);
});

test('Basementen: wrong key and malformed input fail safely', async () => {
    const enc = await Basementen.encode('secret', 'right-key');
    const wrong = await Basementen.decode(enc.result, 'wrong-key');
    assert.ok(wrong.result.startsWith('[DECRYPTION FAILED'));

    const notCiphertext = await Basementen.decode('just some text', 'right-key');
    assert.ok(notCiphertext.result.startsWith('[NOT A BASEMENTEN CIPHERTEXT'));

    assert.equal((await Basementen.encode('x', '')).result, '');
    assert.equal((await Basementen.decode('x', '')).result, '');
});
