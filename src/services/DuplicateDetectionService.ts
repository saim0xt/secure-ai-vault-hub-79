
import CryptoJS from 'crypto-js';

export interface DuplicateGroup {
  id: string;
  files: any[];
  similarity: number;
  type: 'exact' | 'similar' | 'name';
  totalSize: number;
  potentialSavings: number;
}

export interface DuplicateAnalysis {
  totalDuplicates: number;
  duplicateGroups: DuplicateGroup[];
  potentialSavings: number;
  analysisDate: string;
}

export class DuplicateDetectionService {
  private static instance: DuplicateDetectionService;

  static getInstance(): DuplicateDetectionService {
    if (!DuplicateDetectionService.instance) {
      DuplicateDetectionService.instance = new DuplicateDetectionService();
    }
    return DuplicateDetectionService.instance;
  }

  async findDuplicates(files: any[]): Promise<DuplicateGroup[]> {
    try {
      const duplicateGroups: DuplicateGroup[] = [];
      
      // Find exact duplicates by hash
      const exactDuplicates = await this.findExactDuplicates(files);
      duplicateGroups.push(...exactDuplicates);
      
      // Find similar images
      const similarImages = await this.findSimilarImages(files);
      duplicateGroups.push(...similarImages);
      
      // Find name duplicates
      const nameDuplicates = await this.findNameDuplicates(files);
      duplicateGroups.push(...nameDuplicates);
      
      return duplicateGroups;
    } catch (error) {
      console.error('Duplicate detection failed:', error);
      return [];
    }
  }

  private async findExactDuplicates(files: any[]): Promise<DuplicateGroup[]> {
    const hashGroups: Map<string, any[]> = new Map();
    
    // Group files by content hash
    for (const file of files) {
      try {
        const hash = this.calculateFileHash(file.encryptedData);
        
        if (!hashGroups.has(hash)) {
          hashGroups.set(hash, []);
        }
        hashGroups.get(hash)!.push(file);
      } catch (error) {
        console.error('Failed to hash file:', file.name, error);
      }
    }
    
    // Create duplicate groups for files with same hash
    const duplicateGroups: DuplicateGroup[] = [];
    let groupId = 1;
    
    for (const [hash, groupFiles] of hashGroups) {
      if (groupFiles.length > 1) {
        const totalSize = groupFiles.reduce((sum, f) => sum + f.size, 0);
        const potentialSavings = totalSize - groupFiles[0].size; // Keep one file
        
        duplicateGroups.push({
          id: `exact_${groupId++}`,
          files: groupFiles,
          similarity: 1.0,
          type: 'exact',
          totalSize,
          potentialSavings
        });
      }
    }
    
    return duplicateGroups;
  }

  private async findSimilarImages(files: any[]): Promise<DuplicateGroup[]> {
    const imageFiles = files.filter(f => f.type === 'image');
    const duplicateGroups: DuplicateGroup[] = [];
    const processed = new Set<string>();
    let groupId = 1;
    
    for (let i = 0; i < imageFiles.length - 1; i++) {
      if (processed.has(imageFiles[i].id)) continue;
      
      const similarFiles = [imageFiles[i]];
      processed.add(imageFiles[i].id);
      
      try {
        const hash1 = await this.calculateImageHash(imageFiles[i]);
        
        for (let j = i + 1; j < imageFiles.length; j++) {
          if (processed.has(imageFiles[j].id)) continue;
          
          const hash2 = await this.calculateImageHash(imageFiles[j]);
          const similarity = this.compareImageHashes(hash1, hash2);
          
          if (similarity > 0.85) { // 85% similarity threshold
            similarFiles.push(imageFiles[j]);
            processed.add(imageFiles[j].id);
          }
        }
        
        if (similarFiles.length > 1) {
          const totalSize = similarFiles.reduce((sum, f) => sum + f.size, 0);
          const averageSize = totalSize / similarFiles.length;
          const potentialSavings = totalSize - averageSize;
          
          duplicateGroups.push({
            id: `similar_${groupId++}`,
            files: similarFiles,
            similarity: 0.9, // Average similarity
            type: 'similar',
            totalSize,
            potentialSavings
          });
        }
      } catch (error) {
        console.error('Failed to compare images:', error);
      }
    }
    
    return duplicateGroups;
  }

  private async findNameDuplicates(files: any[]): Promise<DuplicateGroup[]> {
    const nameGroups: Map<string, any[]> = new Map();
    
    // Group files by normalized name
    for (const file of files) {
      const normalizedName = this.normalizeName(file.name);
      
      if (!nameGroups.has(normalizedName)) {
        nameGroups.set(normalizedName, []);
      }
      nameGroups.get(normalizedName)!.push(file);
    }
    
    const duplicateGroups: DuplicateGroup[] = [];
    let groupId = 1;
    
    for (const [name, groupFiles] of nameGroups) {
      if (groupFiles.length > 1) {
        // Only consider as duplicates if they have different content
        const uniqueHashes = new Set(
          groupFiles.map(f => this.calculateFileHash(f.encryptedData))
        );
        
        if (uniqueHashes.size > 1) {
          const totalSize = groupFiles.reduce((sum, f) => sum + f.size, 0);
          const potentialSavings = 0; // Name duplicates don't save space unless content is same
          
          duplicateGroups.push({
            id: `name_${groupId++}`,
            files: groupFiles,
            similarity: 0.7,
            type: 'name',
            totalSize,
            potentialSavings
          });
        }
      }
    }
    
    return duplicateGroups;
  }

  private calculateFileHash(encryptedData: string): string {
    return CryptoJS.SHA256(encryptedData).toString();
  }

  private async calculateImageHash(file: any): Promise<string> {
    try {
      // Decrypt and get image data
      const decryptedData = this.decryptFileData(file.encryptedData);
      
      // Create image and canvas for perceptual hashing
      const img = await this.loadImage(decryptedData);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Resize to 8x8 for perceptual hashing
      canvas.width = 8;
      canvas.height = 8;
      ctx.drawImage(img, 0, 0, 8, 8);
      
      // Get image data and calculate average
      const imageData = ctx.getImageData(0, 0, 8, 8);
      const data = imageData.data;
      let total = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        // Convert to grayscale
        total += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      }
      
      const average = total / 64;
      
      // Create hash based on whether each pixel is above/below average
      let hash = '';
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        hash += gray > average ? '1' : '0';
      }
      
      return hash;
    } catch (error) {
      console.error('Failed to calculate image hash:', error);
      return '';
    }
  }

  private loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  private compareImageHashes(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) return 0;
    
    let matches = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] === hash2[i]) matches++;
    }
    
    return matches / hash1.length;
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/\s+/g, '');
  }

  private decryptFileData(encryptedData: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, 'vaultix_secret_key');
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new Error('Failed to decrypt file data');
    }
  }

  async generateDuplicateReport(files: any[]): Promise<DuplicateAnalysis> {
    const duplicateGroups = await this.findDuplicates(files);
    const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.files.length - 1, 0);
    const potentialSavings = duplicateGroups.reduce((sum, group) => sum + group.potentialSavings, 0);
    
    return {
      totalDuplicates,
      duplicateGroups,
      potentialSavings,
      analysisDate: new Date().toISOString()
    };
  }

  async cleanupDuplicates(duplicateGroups: DuplicateGroup[], keepStrategy: 'newest' | 'oldest' | 'largest' | 'smallest' = 'newest'): Promise<string[]> {
    const deletedIds: string[] = [];
    
    for (const group of duplicateGroups) {
      if (group.type === 'exact' || group.type === 'similar') {
        const sortedFiles = this.sortFilesByStrategy(group.files, keepStrategy);
        const fileToKeep = sortedFiles[0];
        const filesToDelete = sortedFiles.slice(1);
        
        deletedIds.push(...filesToDelete.map(f => f.id));
      }
    }
    
    return deletedIds;
  }

  private sortFilesByStrategy(files: any[], strategy: string): any[] {
    switch (strategy) {
      case 'newest':
        return [...files].sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
      case 'oldest':
        return [...files].sort((a, b) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime());
      case 'largest':
        return [...files].sort((a, b) => b.size - a.size);
      case 'smallest':
        return [...files].sort((a, b) => a.size - b.size);
      default:
        return files;
    }
  }
}
