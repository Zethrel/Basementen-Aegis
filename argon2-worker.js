/**
 * Basementen Aegis - Argon2id Worker
 * Runs Argon2id key derivation off the main thread. The WASM implementation
 * (vendored argon2-bundled.min.js, MIT) computes synchronously on its calling
 * thread, so doing it here keeps the UI responsive at strong parameters.
 *
 * Message in:  { id, pass, salt (Uint8Array), time, mem, parallelism, hashLen }
 * Message out: { id, hash (Uint8Array) } or { id, error }
 */

importScripts('argon2-bundled.min.js');

self.onmessage = async (e) => {
    const { id, pass, salt, time, mem, parallelism, hashLen } = e.data;
    try {
        const result = await argon2.hash({
            pass,
            salt,
            time,
            mem,
            parallelism,
            hashLen,
            type: argon2.ArgonType.Argon2id
        });
        self.postMessage({ id, hash: result.hash }, [result.hash.buffer]);
    } catch (err) {
        self.postMessage({ id, error: String((err && err.message) || err) });
    }
};
