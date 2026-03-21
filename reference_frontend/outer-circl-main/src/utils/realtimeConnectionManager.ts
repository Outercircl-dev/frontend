import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Manages Supabase Realtime connections with automatic retry and exponential backoff
 * Prevents channel accumulation and handles CHANNEL_ERROR gracefully
 */
export class RealtimeConnectionManager {
  private static retries = new Map<string, number>();
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY = 1000; // 1 second

  /**
   * Handle channel errors with exponential backoff retry logic
   * @param channelName - Stable channel name (e.g., "notifications:user-id")
   * @param recreateChannel - Function that recreates and subscribes to the channel
   */
  static async handleChannelError(
    channelName: string,
    recreateChannel: () => RealtimeChannel
  ): Promise<void> {
    const currentRetries = this.retries.get(channelName) || 0;
    
    if (currentRetries >= this.MAX_RETRIES) {
      console.error(`🚫 Max retries (${this.MAX_RETRIES}) reached for channel: ${channelName}`);
      this.retries.delete(channelName);
      return;
    }

    // Exponential backoff: 1s, 2s, 4s
    const delay = this.BASE_DELAY * Math.pow(2, currentRetries);
    console.log(`🔄 Retrying channel "${channelName}" in ${delay}ms (attempt ${currentRetries + 1}/${this.MAX_RETRIES})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    this.retries.set(channelName, currentRetries + 1);
    
    // Remove old channel before creating new one (critical for preventing accumulation)
    try {
      const oldChannel = supabase.channel(channelName);
      await supabase.removeChannel(oldChannel);
      console.log(`🧹 Cleaned up old channel: ${channelName}`);
    } catch (cleanupError) {
      console.warn(`⚠️ Channel cleanup warning for ${channelName}:`, cleanupError);
    }
    
    // Recreate channel
    recreateChannel();
  }

  /**
   * Reset retry counter when channel successfully connects
   * @param channelName - The channel name that successfully connected
   */
  static resetRetries(channelName: string): void {
    this.retries.delete(channelName);
    console.log(`✅ Reset retries for channel: ${channelName}`);
  }

  /**
   * Get current retry count for a channel
   * @param channelName - The channel name to check
   */
  static getRetryCount(channelName: string): number {
    return this.retries.get(channelName) || 0;
  }

  /**
   * Clear all retry counters (useful for cleanup or testing)
   */
  static clearAllRetries(): void {
    this.retries.clear();
    console.log('🧹 Cleared all retry counters');
  }
}
