const CryptoJS = require('crypto-js');

const ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY || 'gst-secure-demo-2024-secret-key';

const encryptData = (data) => {
    if (!data) return data;
    try {
        const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
        return ciphertext;
    } catch (error) {
        console.error('Encryption error:', error);
        return data;
    }
};

module.exports = { encryptData };
