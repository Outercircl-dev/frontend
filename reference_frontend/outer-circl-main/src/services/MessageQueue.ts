// Phase 6: Optimized message queue with intelligent backoff and batch processing
interface QueuedMessage {
  id: string;
  type: 'message' | 'notification' | 'read_update';
  data: any;
  timestamp: number;
  retries: number;
  status: 'pending' | 'processing' | 'sent' | 'failed';
}

export class MessageQueue {
  private static instance: MessageQueue;
  private queue = new Map<string, QueuedMessage>();
  private processing = false;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second base delay
  private readonly MAX_QUEUE_SIZE = 100;
  
  // Phase 6: Adaptive polling intervals
  private readonly MIN_POLL_INTERVAL = 2000;  // 2 seconds when active
  private readonly MAX_POLL_INTERVAL = 30000; // 30 seconds when idle
  private currentPollInterval = this.MIN_POLL_INTERVAL;
  private consecutiveEmptyPolls = 0;
  private pollTimer: NodeJS.Timeout | null = null;
  private lastActivityTime = Date.now();

  static getInstance(): MessageQueue {
    if (!MessageQueue.instance) {
      MessageQueue.instance = new MessageQueue();
    }
    return MessageQueue.instance;
  }

  private constructor() {
    // Phase 6: Start with adaptive polling
    this.scheduleNextPoll();
    
    // Handle online/offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('📡 Connection restored, processing queue');
        this.resetPollInterval(); // Reset to fast polling
        this.processQueue();
      });
      
      window.addEventListener('offline', () => {
        console.log('📡 Connection lost, queuing messages');
      });

      // Phase 6: Process immediately when tab becomes visible
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.queue.size > 0) {
          this.resetPollInterval();
          this.processQueue();
        }
      });
    }
  }

  // Phase 6: Adaptive polling scheduler
  private scheduleNextPoll(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
    }

    this.pollTimer = setTimeout(() => {
      this.processQueue();
      this.scheduleNextPoll();
    }, this.currentPollInterval);
  }

  // Phase 6: Reset to fast polling when there's activity
  private resetPollInterval(): void {
    this.currentPollInterval = this.MIN_POLL_INTERVAL;
    this.consecutiveEmptyPolls = 0;
    this.lastActivityTime = Date.now();
  }

  // Phase 6: Increase polling interval when idle
  private increasePollInterval(): void {
    this.consecutiveEmptyPolls++;
    
    // Exponential backoff: 2s -> 5s -> 10s -> 20s -> 30s (max)
    if (this.consecutiveEmptyPolls >= 3) {
      this.currentPollInterval = Math.min(
        this.currentPollInterval * 1.5,
        this.MAX_POLL_INTERVAL
      );
    }

    // Only log when we actually slow down significantly
    if (this.currentPollInterval >= this.MAX_POLL_INTERVAL) {
      console.log(`⏱️ Queue polling slowed to ${this.currentPollInterval / 1000}s (idle)`);
    }
  }

  // Add message to queue
  add(message: any, type: 'message' | 'notification' | 'read_update' = 'message'): string {
    // Prevent queue overflow
    if (this.queue.size >= this.MAX_QUEUE_SIZE) {
      this.cleanup();
    }

    const queueItem: QueuedMessage = {
      id: message.id || crypto.randomUUID(),
      type,
      data: message,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending'
    };

    this.queue.set(queueItem.id, queueItem);
    console.log(`📤 Queue ADD: ${queueItem.id} (type: ${type})`);

    // Phase 6: Reset to fast polling and trigger immediate processing
    this.resetPollInterval();
    
    if (navigator.onLine) {
      // Process immediately on next tick
      setTimeout(() => this.processQueue(), 0);
    }

    return queueItem.id;
  }

  // Remove message from queue
  remove(messageId: string): boolean {
    const removed = this.queue.delete(messageId);
    if (removed) {
      console.log(`📤 Queue REMOVE: ${messageId}`);
    }
    return removed;
  }

  // Check if message is in queue
  has(messageId: string): boolean {
    return this.queue.has(messageId);
  }

  // Get queue status
  getStatus() {
    const stats = {
      pending: 0,
      processing: 0,
      failed: 0,
      total: this.queue.size
    };

    for (const item of this.queue.values()) {
      stats[item.status]++;
    }

    return stats;
  }

  // Phase 6: Optimized queue processing with batch support
  private async processQueue(): Promise<void> {
    if (this.processing || !navigator.onLine) {
      return;
    }

    const pendingItems = Array.from(this.queue.values())
      .filter(item => item.status === 'pending' || item.status === 'failed');

    // Phase 6: Silent operation when queue is empty
    if (pendingItems.length === 0) {
      this.increasePollInterval();
      return;
    }

    this.processing = true;
    console.log(`📤 Queue PROCESS: ${pendingItems.length} items`);
    this.resetPollInterval(); // Reset interval when we have work

    try {
      // Sort by timestamp for FIFO processing
      pendingItems.sort((a, b) => a.timestamp - b.timestamp);

      // Phase 6: Batch processing for same-type operations
      const batches = this.batchItemsByType(pendingItems);
      
      for (const [type, items] of batches.entries()) {
        if (items.length > 3) {
          // Process as batch if 3+ items
          await this.processBatch(type, items);
        } else {
          // Process individually if small count
          for (const item of items) {
            await this.processItem(item);
          }
        }
      }

    } catch (error) {
      console.error('📤 Queue PROCESS error:', error);
    } finally {
      this.processing = false;
      console.log(`📤 Queue PROCESS: Complete (${this.queue.size} remaining)`);
    }
  }

  // Phase 6: Group items by type for batch processing
  private batchItemsByType(items: QueuedMessage[]): Map<string, QueuedMessage[]> {
    const batches = new Map<string, QueuedMessage[]>();
    
    for (const item of items) {
      const key = item.type;
      if (!batches.has(key)) {
        batches.set(key, []);
      }
      batches.get(key)!.push(item);
    }
    
    return batches;
  }

  // Phase 6: Batch process multiple items of same type
  private async processBatch(type: string, items: QueuedMessage[]): Promise<void> {
    console.log(`📦 Batch processing ${items.length} ${type} items`);
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      switch (type) {
        case 'message':
          const messageData = items.map(item => item.data);
          const { error: msgError } = await supabase
            .from('messages')
            .insert(messageData);
          
          if (msgError) throw msgError;
          
          // Remove all successful items
          items.forEach(item => {
            console.log(`📤 Queue SUCCESS: ${item.id} (batch)`);
            this.queue.delete(item.id);
          });
          break;

        case 'notification':
          const notifData = items.map(item => item.data);
          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notifData);
          
          if (notifError) throw notifError;
          
          items.forEach(item => {
            console.log(`📤 Queue SUCCESS: ${item.id} (batch)`);
            this.queue.delete(item.id);
          });
          break;

        case 'read_update':
          // Process read updates individually as they may target different tables
          for (const item of items) {
            await this.processItem(item);
          }
          break;
      }
      
    } catch (error) {
      console.error(`📦 Batch processing failed for ${type}:`, error);
      // Fall back to individual processing
      for (const item of items) {
        await this.processItem(item);
      }
    }
  }

  // Process individual queue item
  private async processItem(item: QueuedMessage): Promise<void> {
    if (item.retries >= this.MAX_RETRIES) {
      console.log(`📤 Queue FAILED: ${item.id} (max retries exceeded)`);
      item.status = 'failed';
      return;
    }

    item.status = 'processing';
    item.retries++;

    try {
      await this.sendToDatabase(item);
      
      // Success - remove from queue
      console.log(`📤 Queue SUCCESS: ${item.id}`);
      this.queue.delete(item.id);
      
    } catch (error) {
      console.error(`📤 Queue ERROR: ${item.id}`, error);
      
      // Mark as failed and retry later
      item.status = 'failed';
      
      // Exponential backoff for retries
      const delay = this.RETRY_DELAY * Math.pow(2, item.retries - 1);
      setTimeout(() => {
        if (this.queue.has(item.id)) {
          item.status = 'pending';
        }
      }, delay);
    }
  }

  // Send queued item to database
  private async sendToDatabase(item: QueuedMessage): Promise<void> {
    const { supabase } = await import('@/integrations/supabase/client');

    switch (item.type) {
      case 'message':
        const { error: messageError } = await supabase
          .from('messages')
          .insert(item.data);
        
        if (messageError) throw messageError;
        break;

      case 'notification':
        const { error: notificationError } = await supabase
          .from('notifications') 
          .insert(item.data);
        
        if (notificationError) throw notificationError;
        break;

      case 'read_update':
        const { ids, table } = item.data;
        const { error: readError } = await supabase
          .from(table)
          .update({ read_at: new Date().toISOString() })
          .in('id', ids);
        
        if (readError) throw readError;
        break;

      default:
        throw new Error(`Unknown queue item type: ${item.type}`);
    }
  }

  // Cleanup failed and old messages
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let cleanedCount = 0;

    for (const [id, item] of this.queue.entries()) {
      // Remove very old items or items that failed too many times
      if (
        (now - item.timestamp > maxAge) ||
        (item.status === 'failed' && item.retries >= this.MAX_RETRIES)
      ) {
        this.queue.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`📤 Queue CLEANUP: Removed ${cleanedCount} old/failed items`);
    }
  }

  // Clear all queue items
  clear(): void {
    const size = this.queue.size;
    this.queue.clear();
    console.log(`📤 Queue CLEAR: Removed ${size} items`);
    this.resetPollInterval();
  }

  // Get queue contents (for debugging)
  getQueue(): QueuedMessage[] {
    return Array.from(this.queue.values());
  }

  // Force process queue (for manual trigger)
  forceProcess(): Promise<void> {
    this.resetPollInterval();
    return this.processQueue();
  }

  // Phase 6: Get performance metrics
  getMetrics() {
    return {
      queueSize: this.queue.size,
      pollInterval: this.currentPollInterval,
      consecutiveEmptyPolls: this.consecutiveEmptyPolls,
      isIdle: this.currentPollInterval >= this.MAX_POLL_INTERVAL,
      lastActivity: new Date(this.lastActivityTime).toISOString(),
      idleTime: Date.now() - this.lastActivityTime,
    };
  }
}
