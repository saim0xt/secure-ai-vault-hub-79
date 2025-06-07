
import CryptoJS from 'crypto-js';

export class FileEncryption {
  static encryptFile(data: string, password: string): string {
    try {
      return CryptoJS.AES.encrypt(data, password).toString();
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt file');
    }
  }

  static decryptFile(encryptedData: string, password: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, password);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedData) {
        throw new Error('Invalid password or corrupted data');
      }
      
      return decryptedData;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt file');
    }
  }
}
