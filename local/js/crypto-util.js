// js/crypto-util.js
const WeddingCrypto = {
    DEFAULT_KEY: "wedding_20270130_secure_key",
    SALT: new TextEncoder().encode("wedding-salt-fixed-2027"),

    async deriveKey(passphrase) {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            "raw",
            enc.encode(passphrase),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );
        return crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: this.SALT,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    },

    // 암호화 (admin에서 사용)
    async encrypt(plainText, keyStr = this.DEFAULT_KEY) {
        if (!plainText) return "";
        const enc = new TextEncoder();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await this.deriveKey(keyStr);
        
        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            enc.encode(plainText)
        );

        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(encrypted), iv.length);

        return btoa(String.fromCharCode(...combined));
    },

    // 복호화 (index에서 사용)
    async decrypt(cipherTextBase64, keyStr = this.DEFAULT_KEY) {
        if (!cipherTextBase64) return "";
        try {
            const rawCipher = Uint8Array.from(atob(cipherTextBase64), c => c.charCodeAt(0));
            const iv = rawCipher.slice(0, 12);
            const data = rawCipher.slice(12);
            const key = await this.deriveKey(keyStr);

            const decrypted = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                key,
                data
            );
            return new TextDecoder().decode(decrypted);
        } catch (e) {
            console.error("복호화 실패:", e);
            return cipherTextBase64;
        }
    }
};