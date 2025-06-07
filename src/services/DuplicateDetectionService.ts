import { VaultFile } from '@/contexts/VaultContext';
import CryptoJS from 'crypto-js';

export interface DuplicateGroup {
  hash: string;
  files: VaultFile[];
  totalSize: number;
}

export class DuplicateDetectionService {
  static async findDuplicates(files: VaultFile[]): Promise<DuplicateGroup[]> {
    const hashGroups = new Map<string, VaultFile[]>();

    // Group files by content hash
    for (const file of files) {
      try {
        const hash = await this.generateFileHash(file);
        if (!hashGroups.has(hash)) {
          hashGroups.set(hash, []);
        }
        hashGroups.get(hash)!.push(file);
      } catch (error) {
        console.error(`Failed to hash file ${file.name}:`, error);
      }
    }

    // Filter groups with duplicates
    const duplicateGroups: DuplicateGroup[] = [];
    for (const [hash, groupFiles] of hashGroups) {
      if (groupFiles.length > 1) {
        const totalSize = groupFiles.reduce((sum, f) => sum + f.size, 0);
        duplicateGroups.push({
          hash,
          files: groupFiles,
          totalSize
        });
      }
    }

    return duplicateGroups.sort((a, b) => b.totalSize - a.totalSize);
  }

  static async findSimilarNames(files: VaultFile[]): Promise<VaultFile[][]> {
    const similarGroups: VaultFile[][] = [];
    const processed = new Set<string>();

    for (const file of files) {
      if (processed.has(file.id)) continue;

      const similar = files.filter(f => 
        f.id !== file.id && 
        !processed.has(f.id) &&
        this.calculateNameSimilarity(file.name, f.name) > 0.8
      );

      if (similar.length > 0) {
        const group = [file, ...similar];
        group.forEach(f => processed.add(f.id));
        similarGroups.push(group);
      }
    }

    return similarGroups;
  }

  private static async generateFileHash(file: VaultFile): Promise<string> {
    // For this implementation, we'll use a combination of name, size, and part of content
    const hashInput = `${file.name}_${file.size}_${file.encryptedData.substring(0, 1000)}`;
    return CryptoJS.MD5(hashInput).toString();
  }

  private static calculateNameSimilarity(name1: string, name2: string): number {
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const n1 = normalize(name1);
    const n2 = normalize(name2);

    if (n1 === n2) return 1;

    const maxLength = Math.max(n1.length, n2.length);
    const distance = this.levenshteinDistance(n1, n2);
    
    return 1 - (distance / maxLength);
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  static async analyzeDuplicateSpaceSavings(duplicateGroups: DuplicateGroup[]): Promise<number> {
    let totalSavings = 0;
    
    for (const group of duplicateGroups) {
      // Keep one file, delete others
      const keepFile = group.files[0];
      const duplicateFiles = group.files.slice(1);
      totalSavings += duplicateFiles.reduce((sum, f) => sum + f.size, 0);
    }

    return totalSavings;
  }
}
