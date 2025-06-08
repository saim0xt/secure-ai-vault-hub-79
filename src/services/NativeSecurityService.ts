
import { RealNativeSecurityService } from './RealNativeSecurityService';

// Export the real implementation
export { RealNativeSecurityService as NativeSecurityService };

// Re-export types
export type {
  NativeSecurityPlugin,
  SecureStoragePlugin
} from './RealNativeSecurityService';
