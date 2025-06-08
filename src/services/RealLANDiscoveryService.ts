
import { Network } from '@capacitor/network';
import { DeviceDetectionService } from './DeviceDetectionService';

export interface RealLANDevice {
  id: string;
  name: string;
  ip: string;
  port: number;
  deviceType: string;
  isOnline: boolean;
  version: string;
  capabilities: string[];
}

export class RealLANDiscoveryService {
  private static instance: RealLANDiscoveryService;
  private discoveredDevices: RealLANDevice[] = [];
  private scanningInProgress: boolean = false;

  static getInstance(): RealLANDiscoveryService {
    if (!RealLANDiscoveryService.instance) {
      RealLANDiscoveryService.instance = new RealLANDiscoveryService();
    }
    return RealLANDiscoveryService.instance;
  }

  async startDiscovery(): Promise<void> {
    if (this.scanningInProgress) return;

    try {
      this.scanningInProgress = true;
      console.log('Starting real LAN discovery...');

      const deviceDetection = DeviceDetectionService.getInstance();
      const isWeb = await deviceDetection.isWebPlatform();

      if (isWeb) {
        await this.webDiscovery();
      } else {
        await this.nativeDiscovery();
      }
    } catch (error) {
      console.error('LAN discovery failed:', error);
    } finally {
      this.scanningInProgress = false;
    }
  }

  private async webDiscovery(): Promise<void> {
    try {
      // Web-based discovery using WebRTC and mDNS-like techniques
      console.log('Starting web-based LAN discovery...');
      
      // Check network status
      const networkStatus = await Network.getStatus();
      if (!networkStatus.connected) {
        console.log('No network connection available');
        return;
      }

      // In a real implementation, you would:
      // 1. Use WebRTC to discover local peers
      // 2. Scan common ports using WebSocket connections
      // 3. Use service workers for background scanning
      
      // For now, we'll implement a basic port scanning approach
      await this.scanLocalNetwork();
      
    } catch (error) {
      console.error('Web discovery failed:', error);
    }
  }

  private async nativeDiscovery(): Promise<void> {
    try {
      console.log('Starting native LAN discovery...');
      
      // Native discovery would use platform-specific APIs
      // This would require a native plugin for actual implementation
      await this.scanLocalNetwork();
      
    } catch (error) {
      console.error('Native discovery failed:', error);
    }
  }

  private async scanLocalNetwork(): Promise<void> {
    try {
      // Get local IP to determine network range
      const localIP = await this.getLocalIP();
      if (!localIP) {
        console.log('Could not determine local IP');
        return;
      }

      console.log('Scanning network range for local IP:', localIP);
      
      // Extract network base (e.g., 192.168.1.x)
      const networkBase = localIP.substring(0, localIP.lastIndexOf('.'));
      
      // Scan common Vaultix ports on local network
      const ports = [8765, 8080, 3000, 5000];
      const promises: Promise<void>[] = [];
      
      // Scan a limited range for performance
      for (let i = 1; i <= 20; i++) {
        const ip = `${networkBase}.${i}`;
        for (const port of ports) {
          promises.push(this.checkDevice(ip, port));
        }
      }
      
      await Promise.allSettled(promises);
      
    } catch (error) {
      console.error('Network scan failed:', error);
    }
  }

  private async getLocalIP(): Promise<string | null> {
    try {
      // This is a simplified approach - in production you'd use native APIs
      // For web, we can try to get it through WebRTC
      if (typeof window !== 'undefined' && window.RTCPeerConnection) {
        return new Promise((resolve) => {
          const pc = new RTCPeerConnection({ iceServers: [] });
          pc.createDataChannel('');
          pc.createOffer().then(offer => pc.setLocalDescription(offer));
          
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              const candidate = event.candidate.candidate;
              const match = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
              if (match && match[1] && !match[1].startsWith('127.')) {
                pc.close();
                resolve(match[1]);
              }
            }
          };
          
          // Timeout after 2 seconds
          setTimeout(() => {
            pc.close();
            resolve(null);
          }, 2000);
        });
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get local IP:', error);
      return null;
    }
  }

  private async checkDevice(ip: string, port: number): Promise<void> {
    try {
      // Try to connect to potential Vaultix device
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      
      const response = await fetch(`http://${ip}:${port}/status`, {
        method: 'GET',
        signal: controller.signal,
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.deviceId && data.status === 'online') {
          const device: RealLANDevice = {
            id: data.deviceId,
            name: data.deviceName || `Device ${ip}`,
            ip,
            port,
            deviceType: data.deviceType || 'unknown',
            isOnline: true,
            version: data.version || '1.0.0',
            capabilities: data.capabilities || []
          };
          
          // Add device if not already discovered
          if (!this.discoveredDevices.find(d => d.id === device.id)) {
            this.discoveredDevices.push(device);
            console.log('Discovered Vaultix device:', device);
          }
        }
      }
    } catch (error) {
      // Connection failed - device not available or not a Vaultix device
      // This is expected for most IPs, so we don't log errors
    }
  }

  getDiscoveredDevices(): RealLANDevice[] {
    return [...this.discoveredDevices];
  }

  clearDiscoveredDevices(): void {
    this.discoveredDevices = [];
  }

  isScanning(): boolean {
    return this.scanningInProgress;
  }
}
