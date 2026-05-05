import CryptoJS from 'crypto-js';

// This key MUST match the one in the backend
const ENCRYPTION_KEY = 'gst-secure-demo-2024-secret-key';

export const decryptData = (ciphertext) => {
    if (!ciphertext || typeof ciphertext !== 'string') return ciphertext;
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
        const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        return decryptedData;
    } catch (error) {
        console.error('Decryption error:', error);
        return ciphertext; // Return as is if decryption fails
    }
};
