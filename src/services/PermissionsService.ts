
import { RealPermissionsService, PermissionStatus } from './RealPermissionsService';

// Export the real implementation
export { RealPermissionsService as PermissionsService };

// Re-export types
export type { PermissionStatus } from './RealPermissionsService';
