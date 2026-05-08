// Generate an ECDH Key Pair (P-256 curve)
const generateKeyPair = async () => {
    return await window.crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true, // extractable
        ["deriveKey", "deriveBits"]
    );
};

// Export the Public Key to base64 string so it can be sent to the backend
const exportPublicKey = async (key) => {
    const exported = await window.crypto.subtle.exportKey("spki", key);
    const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
    return window.btoa(exportedAsString);
};

export const generateE2EBundle = async () => {
    try {
        // 1. Generate the 3 necessary key pairs
        const identityKeyPair = await generateKeyPair();
        const signedPreKeyPair = await generateKeyPair();
        
        // Generate a pool of 10 One-Time Pre-Keys for asynchronous messaging
        const oneTimePreKeysPairs = await Promise.all(
            Array.from({ length: 10 }).map(() => generateKeyPair())
        );

        // 2. Export ONLY the Public Keys for the backend
        const publicBundle = {
            identityKey: await exportPublicKey(identityKeyPair.publicKey),
            signedPreKey: await exportPublicKey(signedPreKeyPair.publicKey),
            oneTimePreKeys: await Promise.all(oneTimePreKeysPairs.map(kp => exportPublicKey(kp.publicKey)))
        };

        // 3. Return the bundle (In a real scenario, you'd save the private keys to IndexedDB here)
        return { publicBundle, identityKeyPair, signedPreKeyPair, oneTimePreKeysPairs };
    } catch (error) {
        console.error("Cryptographic Engine Failed:", error);
        return null;
    }
};