// js/crypto-util.js
const WeddingCrypto = {
    DEFAULT_KEY: "__ENCRYPTION_KEY__",
    SALT: new TextEncoder().encode("__SALT__"),

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
        if (!cipherTextBase64 || typeof cipherTextBase64 !== 'string') return "";

        // 🌟 한글 등 Base64가 아닌 일반 평문이면 atob 실행 안 하고 그대로 반환
        const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
        if (!base64Regex.test(cipherTextBase64) || cipherTextBase64.length % 4 !== 0) {
            return cipherTextBase64;
        }

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
            // 복호화 실패 시(또는 일반 영문 평문일 때) 에러 대신 원본 텍스트 반환
            return cipherTextBase64;
        }
    }
};