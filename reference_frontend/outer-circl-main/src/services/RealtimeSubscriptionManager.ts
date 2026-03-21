import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Singleton Realtime Subscription Manager
 * Prevents duplicate channel subscriptions and handles React Strict Mode gracefully
 * Pinterest-style architecture: Non-blocking, graceful degradation
 */
class RealtimeSubscriptionManager {
  private static instance: RealtimeSubscriptionManager;
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptionStates: Map<string, 'idle' | 'connecting' | 'connected' | 'error'> = new Map();
  private retryTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY = 1000;

  private constructor() {
    console.log('🔌 RealtimeSubscriptionManager initialized');
  }

  static getInstance(): RealtimeSubscriptionManager {
    if (!RealtimeSubscriptionManager.instance) {
      RealtimeSubscriptionManager.instance = new RealtimeSubscriptionManager();
    }
    return RealtimeSubscriptionManager.instance;
  }

  /**
   * Subscribe to a channel with automatic retry and deduplication
   */
  subscribe(
    channelName: string,
    config: {
      event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      schema: string;
      table: string;
      onData: (payload: any) => void;
      onError?: (error: any) => void;
    }
  ): () => void {
    console.log(`🔌 Subscribe request for channel: ${channelName}`);

    // Check if already subscribed or connecting
    const currentState = this.subscriptionStates.get(channelName);
    if (currentState === 'connected' || currentState === 'connecting') {
      console.log(`✅ Channel ${channelName} already ${currentState}, reusing existing subscription`);
      return this.getUnsubscribeFunction(channelName);
    }

    // Mark as connecting immediately to prevent race conditions
    this.subscriptionStates.set(channelName, 'connecting');
    console.log(`🔄 Creating new subscription for ${channelName}`);

    let state = 'connecting';

    try {
      // PHASE 2: Add 5-second timeout to make subscriptions non-blocking
      const subscriptionTimeout = setTimeout(() => {
        if (state !== 'connected') {
          console.warn(`⏱️ Subscription timeout for ${channelName} - continuing in degraded mode`);
          state = 'error';
          this.subscriptionStates.set(channelName, 'error');
          
          const channel = this.channels.get(channelName);
          if (channel) {
            channel.unsubscribe();
          }
          
          // PHASE 5: Silent error - log only, don't show blocking toast
          console.warn(`⚠️ Realtime subscription for ${channelName} running in degraded mode (slow connection)`);
          
          // Set data attribute for debugging
          if (typeof document !== 'undefined') {
            document.body.setAttribute('data-realtime-degraded', 'true');
          }
        }
      }, 5000);
      
      // Create channel
      const channel = supabase.channel(channelName);

      // Configure subscription
      channel.on(
        'postgres_changes' as any,
        {
          event: config.event,
          schema: config.schema,
          table: config.table,
        },
        (payload) => {
          console.log(`📥 Realtime update received on ${channelName}:`, payload);
          try {
            config.onData(payload);
          } catch (error) {
            console.error(`❌ Error handling realtime data for ${channelName}:`, error);
          }
        }
      );

      // Subscribe with error handling
      channel.subscribe((status) => {
        clearTimeout(subscriptionTimeout); // Clear timeout on any status change
        console.log(`🔌 Subscription status for ${channelName}:`, status);

        if (status === 'SUBSCRIBED') {
          state = 'connected';
          this.subscriptionStates.set(channelName, 'connected');
          console.log(`✅ Successfully subscribed to ${channelName}`);
          
          // Clear any retry timers
          const timer = this.retryTimers.get(channelName);
          if (timer) {
            clearTimeout(timer);
            this.retryTimers.delete(channelName);
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Channel error for ${channelName}`);
          this.subscriptionStates.set(channelName, 'error');
          
          if (config.onError) {
            config.onError(new Error('CHANNEL_ERROR'));
          }

          // Attempt retry with exponential backoff
          this.scheduleRetry(channelName, config);
        } else if (status === 'TIMED_OUT') {
          console.warn(`⏱️ Subscription timeout for ${channelName}`);
          this.subscriptionStates.set(channelName, 'error');
          this.scheduleRetry(channelName, config);
        }
      });

      // Store channel
      this.channels.set(channelName, channel);
      console.log(`📝 Channel ${channelName} stored in registry`);

    } catch (error) {
      console.error(`❌ Failed to create subscription for ${channelName}:`, error);
      this.subscriptionStates.set(channelName, 'error');
      if (config.onError) {
        config.onError(error);
      }
    }

    return this.getUnsubscribeFunction(channelName);
  }

  /**
   * Schedule retry with exponential backoff
   */
  private scheduleRetry(
    channelName: string,
    config: {
      event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      schema: string;
      table: string;
      onData: (payload: any) => void;
      onError?: (error: any) => void;
    }
  ) {
    // Get retry count (stored in channelName metadata)
    const retryKey = `${channelName}_retry_count`;
    const retryCount = parseInt(sessionStorage.getItem(retryKey) || '0', 10);

    if (retryCount >= this.MAX_RETRIES) {
      console.error(`🚫 Max retries reached for ${channelName}, giving up`);
      sessionStorage.removeItem(retryKey);
      return;
    }

    const delay = this.BASE_DELAY * Math.pow(2, retryCount);
    console.log(`🔄 Scheduling retry ${retryCount + 1}/${this.MAX_RETRIES} for ${channelName} in ${delay}ms`);

    const timer = setTimeout(() => {
      console.log(`🔄 Retrying subscription for ${channelName}`);
      
      // Clean up old channel
      this.unsubscribe(channelName);
      
      // Increment retry count
      sessionStorage.setItem(retryKey, String(retryCount + 1));
      
      // Retry subscription
      this.subscribe(channelName, config);
    }, delay);

    this.retryTimers.set(channelName, timer);
  }

  /**
   * Get unsubscribe function for a channel
   */
  private getUnsubscribeFunction(channelName: string): () => void {
    return () => {
      this.unsubscribe(channelName);
    };
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channelName: string) {
    console.log(`🔌 Unsubscribe request for ${channelName}`);

    const channel = this.channels.get(channelName);
    if (channel) {
      try {
        channel.unsubscribe();
        supabase.removeChannel(channel);
        console.log(`✅ Unsubscribed from ${channelName}`);
      } catch (error) {
        console.warn(`⚠️ Error unsubscribing from ${channelName}:`, error);
      }
      
      this.channels.delete(channelName);
    }

    // Clear state
    this.subscriptionStates.delete(channelName);
    
    // Clear retry timer
    const timer = this.retryTimers.get(channelName);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(channelName);
    }
    
    // Clear retry count
    sessionStorage.removeItem(`${channelName}_retry_count`);
  }

  /**
   * Get current subscription state
   */
  getState(channelName: string): 'idle' | 'connecting' | 'connected' | 'error' {
    return this.subscriptionStates.get(channelName) || 'idle';
  }

  /**
   * Check if a channel is connected
   */
  isConnected(channelName: string): boolean {
    return this.subscriptionStates.get(channelName) === 'connected';
  }

  /**
   * Cleanup all subscriptions (for logout or unmount)
   */
  cleanup() {
    console.log('🧹 Cleaning up all realtime subscriptions');
    
    this.channels.forEach((channel, channelName) => {
      this.unsubscribe(channelName);
    });
    
    this.channels.clear();
    this.subscriptionStates.clear();
    this.retryTimers.forEach(timer => clearTimeout(timer));
    this.retryTimers.clear();
  }

  /**
   * Get debug info
   */
  getDebugInfo() {
    return {
      totalChannels: this.channels.size,
      states: Array.from(this.subscriptionStates.entries()),
      activeRetries: this.retryTimers.size,
    };
  }
  
  /**
   * Phase 3: Get performance metrics
   */
  getPerformanceMetrics() {
    const connectedChannels = Array.from(this.subscriptionStates.entries())
      .filter(([_, state]) => state === 'connected').length;
    
    const errorChannels = Array.from(this.subscriptionStates.entries())
      .filter(([_, state]) => state === 'error').length;
    
    // Track message latency (stored in session storage)
    let avgLatency = 0;
    let messageCount = 0;
    
    if (typeof sessionStorage !== 'undefined') {
      avgLatency = parseFloat(sessionStorage.getItem('rt_avg_latency') || '0');
      messageCount = parseInt(sessionStorage.getItem('rt_message_count') || '0', 10);
    }
    
    return {
      totalChannels: this.channels.size,
      connectedChannels,
      errorChannels,
      activeRetries: this.retryTimers.size,
      connectionQuality: connectedChannels === this.channels.size ? 'excellent' : 
                         errorChannels > 0 ? 'poor' : 'good',
      avgMessageLatency: avgLatency > 0 ? avgLatency.toFixed(0) + 'ms' : 'N/A',
      messagesReceived: messageCount,
      channels: Array.from(this.subscriptionStates.entries()).map(([name, state]) => ({
        name,
        state,
        connected: state === 'connected'
      }))
    };
  }
  
  /**
   * Track realtime message latency
   */
  trackMessageLatency(latency: number) {
    if (typeof sessionStorage !== 'undefined') {
      const currentAvg = parseFloat(sessionStorage.getItem('rt_avg_latency') || '0');
      const count = parseInt(sessionStorage.getItem('rt_message_count') || '0', 10);
      
      const newAvg = (currentAvg * count + latency) / (count + 1);
      
      sessionStorage.setItem('rt_avg_latency', String(newAvg));
      sessionStorage.setItem('rt_message_count', String(count + 1));
    }
  }
}

export const realtimeManager = RealtimeSubscriptionManager.getInstance();
