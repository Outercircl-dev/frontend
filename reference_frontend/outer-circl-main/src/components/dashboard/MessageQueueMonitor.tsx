import React, { useState, useEffect } from 'react';
import { MessageQueue } from '@/services/MessageQueue';

/**
 * Phase 6: Message Queue Performance Monitor
 * Shows real-time queue metrics in development mode
 */
export const MessageQueueMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const queue = MessageQueue.getInstance();
    
    const updateMetrics = () => {
      setMetrics(queue.getMetrics());
      setStatus(queue.getStatus());
    };

    // Update every 5 seconds
    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);

    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV !== 'development' || !metrics) {
    return null;
  }

  const isHealthy = metrics.queueSize < 10 && status?.failed === 0;
  const statusColor = isHealthy ? 'text-green-600' : 'text-yellow-600';

  return (
    <div className="mt-4 p-4 bg-muted rounded-lg border border-border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground">
          📤 Message Queue Status
        </h3>
        <span className={`text-xs font-medium ${statusColor}`}>
          {isHealthy ? '✓ Healthy' : '⚠ Active'}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Queue Size:</span>
          <span className="ml-2 font-medium text-foreground">{metrics.queueSize}</span>
        </div>
        
        <div>
          <span className="text-muted-foreground">Poll Interval:</span>
          <span className="ml-2 font-medium text-foreground">
            {(metrics.pollInterval / 1000).toFixed(1)}s
          </span>
        </div>
        
        <div>
          <span className="text-muted-foreground">Status:</span>
          <span className="ml-2 font-medium text-foreground">
            {metrics.isIdle ? '💤 Idle' : '⚡ Active'}
          </span>
        </div>
        
        <div>
          <span className="text-muted-foreground">Idle Time:</span>
          <span className="ml-2 font-medium text-foreground">
            {(metrics.idleTime / 1000).toFixed(0)}s
          </span>
        </div>

        {status && (
          <>
            <div>
              <span className="text-muted-foreground">Pending:</span>
              <span className="ml-2 font-medium text-foreground">{status.pending}</span>
            </div>
            
            <div>
              <span className="text-muted-foreground">Failed:</span>
              <span className="ml-2 font-medium text-red-600">{status.failed}</span>
            </div>
          </>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Empty polls: {metrics.consecutiveEmptyPolls} • 
          Last activity: {new Date(metrics.lastActivity).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};
