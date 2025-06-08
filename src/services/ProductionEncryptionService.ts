
import { registerPlugin } from '@capacitor/core';

export interface ProductionEncryptionPlugin {
  generateSecureKey(options: { alias: string }): Promise<{ success: boolean; error?: string }>;
  encryptData(options: { alias: string; data: string }): Promise<{ success: boolean; encryptedData?: string; error?: string }>;
  decryptData(options: { alias: string; encryptedData: string }): Promise<{ success: boolean; data?: string; error?: string }>;
  deleteKey(options: { alias: string }): Promise<{ success: boolean; error?: string }>;
  verifyIntegrity(options: { data: string; checksum: string }): Promise<{ success: boolean; valid?: boolean; error?: string }>;
  secureMemoryWipe(): Promise<{ success: boolean; error?: string }>;
}

const ProductionEncryption = registerPlugin<ProductionEncryptionPlugin>('ProductionEncryption');

export class ProductionEncryptionService {
  private static instance: ProductionEncryptionService;
  private keyAliases: Map<string, string> = new Map();

  static getInstance(): ProductionEncryptionService {
    if (!ProductionEncryptionService.instance) {
      ProductionEncryptionService.instance = new ProductionEncryptionService();
    }
    return ProductionEncryptionService.instance;
  }

  async initializeEncryption(): Promise<void> {
    try {
      // Generate master key for the application
      const result = await ProductionEncryption.generateSecureKey({
        alias: 'vaultix_master_key'
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate master key');
      }
      
      this.keyAliases.set('master', 'vaultix_master_key');
      console.log('Production encryption initialized');
    } catch (error) {
      console.error('Failed to initialize production encryption:', error);
      throw error;
    }
  }

  async encryptFile(fileData: ArrayBuffer, fileName: string): Promise<string> {
    try {
      const dataArray = new Uint8Array(fileData);
      const dataString = Array.from(dataArray).map(byte => String.fromCharCode(byte)).join('');
      
      const result = await ProductionEncryption.encryptData({
        alias: 'vaultix_master_key',
        data: btoa(dataString) // Base64 encode binary data
      });
      
      if (!result.success || !result.encryptedData) {
        throw new Error(result.error || 'Encryption failed');
      }
      
      return result.encryptedData;
    } catch (error) {
      console.error('File encryption failed:', error);
      throw error;
    }
  }

  async decryptFile(encryptedData: string): Promise<ArrayBuffer> {
    try {
      const result = await ProductionEncryption.decryptData({
        alias: 'vaultix_master_key',
        encryptedData
      });
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Decryption failed');
      }
      
      const decodedString = atob(result.data);
      const bytes = new Uint8Array(decodedString.length);
      for (let i = 0; i < decodedString.length; i++) {
        bytes[i] = decodedString.charCodeAt(i);
      }
      
      return bytes.buffer;
    } catch (error) {
      console.error('File decryption failed:', error);
      throw error;
    }
  }

  async encryptText(text: string): Promise<string> {
    try {
      const result = await ProductionEncryption.encryptData({
        alias: 'vaultix_master_key',
        data: text
      });
      
      if (!result.success || !result.encryptedData) {
        throw new Error(result.error || 'Text encryption failed');
      }
      
      return result.encryptedData;
    } catch (error) {
      console.error('Text encryption failed:', error);
      throw error;
    }
  }

  async decryptText(encryptedText: string): Promise<string> {
    try {
      const result = await ProductionEncryption.decryptData({
        alias: 'vaultix_master_key',
        encryptedData: encryptedText
      });
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Text decryption failed');
      }
      
      return result.data;
    } catch (error) {
      console.error('Text decryption failed:', error);
      throw error;
    }
  }

  async generateFileChecksum(data: ArrayBuffer): Promise<string> {
    try {
      const dataArray = new Uint8Array(data);
      const dataString = Array.from(dataArray).map(byte => String.fromCharCode(byte)).join('');
      
      // Generate SHA-256 hash for integrity verification
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataString));
      const hashArray = new Uint8Array(hashBuffer);
      return Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('Checksum generation failed:', error);
      throw error;
    }
  }

  async verifyFileIntegrity(data: ArrayBuffer, checksum: string): Promise<boolean> {
    try {
      const currentChecksum = await this.generateFileChecksum(data);
      
      const result = await ProductionEncryption.verifyIntegrity({
        data: currentChecksum,
        checksum
      });
      
      return result.success && result.valid === true;
    } catch (error) {
      console.error('Integrity verification failed:', error);
      return false;
    }
  }

  async secureWipeMemory(): Promise<void> {
    try {
      await ProductionEncryption.secureMemoryWipe();
      this.keyAliases.clear();
    } catch (error) {
      console.error('Secure memory wipe failed:', error);
    }
  }

  async deleteAllKeys(): Promise<void> {
    try {
      for (const alias of this.keyAliases.values()) {
        await ProductionEncryption.deleteKey({ alias });
      }
      this.keyAliases.clear();
    } catch (error) {
      console.error('Failed to delete keys:', error);
    }
  }
}
