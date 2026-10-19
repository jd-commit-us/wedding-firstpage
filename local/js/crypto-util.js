// local/js/crypto-util.js
const WeddingCrypto = {
    // ⚠️ 두 값이 admin.html과 index.html에서 완전히 동일해야 합니다.
    //DEFAULT_KEY: "wedding-secret-fixed-key", 
    //SALT: new TextEncoder().encode("wedding-salt-fixed-unique-bytes"),
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

    async decrypt(cipherTextBase64, keyStr = this.DEFAULT_KEY) {
        if (!cipherTextBase64 || typeof cipherTextBase64 !== 'string') return "";

        // Base64 형식 검사
        const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
        if (!base64Regex.test(cipherTextBase64) || cipherTextBase64.length % 4 !== 0) {
            return cipherTextBase64;
        }

        try {
            const rawCipher = Uint8Array.from(atob(cipherTextBase64), c => c.charCodeAt(0));

            // IV(12바이트) + AuthTag(16바이트) = 최소 28바이트 이상이어야 정상 암호문
            if (rawCipher.length < 28) {
                return cipherTextBase64;
            }

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
            // 복호화 검증 실패(키 불일치 또는 일반 문자열) 시 원본 유지
            console.warn("복호화 스킵 또는 실패 (원본 반환):", cipherTextBase64);
            return cipherTextBase64;
        }
    }
};