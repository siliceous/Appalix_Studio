import { VideoProviderInterface, VideoProvider, ProviderConfig } from './types.js';
import { KlingProvider } from './providers/kling.js';
import { RunwayProvider } from './providers/runway.js';
import { VeoProvider } from './providers/veo.js';

export class ProviderFactory {
  private static providers: Map<VideoProvider, VideoProviderInterface> = new Map();

  static getProvider(provider: VideoProvider, config: ProviderConfig): VideoProviderInterface {
    // For now, we're not caching providers to ensure fresh configs
    // In production, consider singleton pattern with config updates

    switch (provider) {
      case 'kling':
        return new KlingProvider(config);
      case 'runway':
        return new RunwayProvider(config);
      case 'veo':
        return new VeoProvider(config);
      case 'sora':
        // Sora requires OpenAI API, will be implemented in Phase 2
        throw new Error('Sora provider not yet implemented. Use Kling for MVP.');
      default:
        throw new Error(`Unknown video provider: ${provider}`);
    }
  }

  static getDefaultProvider(): VideoProvider {
    return 'kling'; // MVP default
  }

  static getSupportedProviders(): VideoProvider[] {
    return ['kling', 'runway', 'veo']; // Sora in Phase 2
  }
}
