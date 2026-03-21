/**
 * ApplicationController - Single Source of Truth for App State
 * ARCHITECTURAL FOUNDATION: Centralized control for all initialization and reload decisions
 * 
 * This controller manages:
 * - Application lifecycle states
 * - Reload requests and throttling
 * - Mobile-specific timeout management
 * - Emergency circuit breaker
 * - Error recovery strategies
 */

type ConnectionType = '4g' | '3g' | '2g' | 'slow-2g' | 'offline' | 'unknown';

enum AppState {
  INITIALIZING = 'initializing',
  READY = 'ready',
  ERROR = 'error',
  MAINTENANCE = 'maintenance'
}

enum ErrorSeverity {
  TEMPORARY = 'temporary',    // Retry with backoff
  NETWORK = 'network',        // Wait for connectivity
  SESSION = 'session',        // Clear session, navigate to auth
  FATAL = 'fatal'            // Enter maintenance mode
}

interface ReloadRequest {
  reason: string;
  timestamp: number;
  severity: ErrorSeverity;
}

interface AppControllerState {
  state: AppState;
  lastReloadAttempt: number | null;
  reloadCount: number;
  reloadWindow: number; // Time window for counting reloads
  connectionType: ConnectionType;
  isMobile: boolean;
}

class ApplicationControllerClass {
  private state: AppControllerState = {
    state: AppState.INITIALIZING,
    lastReloadAttempt: null,
    reloadCount: 0,
    reloadWindow: 30000, // 30 seconds
    connectionType: 'unknown',
    isMobile: false
  };

  private reloadHistory: ReloadRequest[] = [];
  private readonly MAX_RELOADS = 3;
  private readonly RELOAD_WINDOW = 30000; // 30s
  private readonly MIN_RELOAD_INTERVAL = 5000; // 5s between reloads
  
  // Mobile detection
  private readonly MOBILE_PATTERNS = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

  constructor() {
    this.detectEnvironment();
    this.loadState();
  }

  /**
   * Detect mobile and connection type
   */
  private detectEnvironment(): void {
    // Mobile detection
    this.state.isMobile = this.MOBILE_PATTERNS.test(navigator.userAgent);

    // Connection detection
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (!navigator.onLine) {
      this.state.connectionType = 'offline';
    } else if (connection) {
      const effectiveType = connection.effectiveType;
      this.state.connectionType = effectiveType || 'unknown';
    } else {
      this.state.connectionType = 'unknown';
    }

    console.log('📱 Environment:', {
      isMobile: this.state.isMobile,
      connection: this.state.connectionType,
      online: navigator.onLine
    });
  }

  /**
   * Load persisted state from sessionStorage
   */
  private loadState(): void {
    try {
      const savedState = sessionStorage.getItem('app_controller_state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        
        // Only restore reload tracking if within time window
        const now = Date.now();
        if (parsed.lastReloadAttempt && now - parsed.lastReloadAttempt < this.RELOAD_WINDOW) {
          this.state.reloadCount = parsed.reloadCount || 0;
          this.state.lastReloadAttempt = parsed.lastReloadAttempt;
          
          console.log('🔄 Restored reload state:', {
            count: this.state.reloadCount,
            timeSinceLastReload: now - this.state.lastReloadAttempt
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load controller state:', error);
    }
  }

  /**
   * Persist state to sessionStorage
   */
  private saveState(): void {
    try {
      sessionStorage.setItem('app_controller_state', JSON.stringify({
        reloadCount: this.state.reloadCount,
        lastReloadAttempt: this.state.lastReloadAttempt,
        state: this.state.state
      }));
    } catch (error) {
      console.warn('⚠️ Failed to save controller state:', error);
    }
  }

  /**
   * Get timeout values based on connection and device type
   */
  public getTimeouts(): { initialization: number; auth: number; cache: number } {
    const { connectionType, isMobile } = this.state;

    // Base timeouts for desktop 4G
    let initTimeout = 5000;
    let authTimeout = 2500;
    let cacheTimeout = 50;

    // Mobile multiplier
    if (isMobile) {
      initTimeout *= 2;
      authTimeout *= 2;
      cacheTimeout *= 2;
    }

    // Connection multiplier
    switch (connectionType) {
      case 'slow-2g':
      case '2g':
        initTimeout *= 4;
        authTimeout *= 4;
        cacheTimeout *= 3;
        break;
      case '3g':
        initTimeout *= 2;
        authTimeout *= 2;
        cacheTimeout *= 1.5;
        break;
      case 'offline':
        initTimeout = Infinity; // Don't timeout offline
        authTimeout = Infinity;
        break;
    }

    return {
      initialization: Math.min(initTimeout, 30000), // Max 30s
      auth: Math.min(authTimeout, 15000), // Max 15s
      cache: Math.min(cacheTimeout, 200) // Max 200ms
    };
  }

  /**
   * Check if reload is allowed
   */
  private canReload(): boolean {
    const now = Date.now();

    // Check if in maintenance mode
    if (this.state.state === AppState.MAINTENANCE) {
      console.warn('🚫 Reload blocked: In maintenance mode');
      return false;
    }

    // Check minimum interval since last reload
    if (this.state.lastReloadAttempt && now - this.state.lastReloadAttempt < this.MIN_RELOAD_INTERVAL) {
      console.warn('🚫 Reload blocked: Too soon since last reload');
      return false;
    }

    // Clean old reload history (outside time window)
    this.reloadHistory = this.reloadHistory.filter(
      req => now - req.timestamp < this.RELOAD_WINDOW
    );

    // Check reload count within window
    if (this.reloadHistory.length >= this.MAX_RELOADS) {
      console.error('🚨 Circuit breaker triggered: Too many reloads');
      this.enterMaintenanceMode('Too many reload attempts');
      return false;
    }

    return true;
  }

  /**
   * Enter maintenance mode - prevents all automatic actions
   */
  private enterMaintenanceMode(reason: string): void {
    console.error('🔧 Entering maintenance mode:', reason);
    this.state.state = AppState.MAINTENANCE;
    this.saveState();
    
    // Notify user
    this.showMaintenanceScreen(reason);
  }

  /**
   * Show maintenance screen to user
   */
  private showMaintenanceScreen(reason: string): void {
    const container = document.createElement('div');
    container.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-family: system-ui, -apple-system, sans-serif;
        padding: 20px;
      ">
        <div style="text-align: center; max-width: 400px;">
          <div style="
            width: 80px;
            height: 80px;
            background: #E60023;
            border-radius: 50%;
            margin: 0 auto 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
          ">⚠️</div>
          
          <h2 style="color: #E60023; margin-bottom: 16px; font-size: 24px; font-weight: 600;">
            Maintenance Mode
          </h2>
          
          <p style="color: #666; margin-bottom: 8px; line-height: 1.5;">
            The app detected unusual behavior and paused to prevent issues.
          </p>
          
          <p style="color: #999; margin-bottom: 24px; font-size: 14px;">
            ${reason}
          </p>
          
          <button 
            onclick="sessionStorage.clear(); localStorage.removeItem('app_controller_state'); window.location.href='/';" 
            style="
              background: #E60023;
              color: white;
              padding: 14px 32px;
              border: none;
              border-radius: 24px;
              cursor: pointer;
              font-weight: 600;
              font-size: 16px;
              margin-bottom: 12px;
              width: 100%;
            "
          >
            Reset & Continue
          </button>
          
          <button 
            onclick="window.location.href='/help';" 
            style="
              background: transparent;
              color: #666;
              padding: 12px 24px;
              border: 1px solid #ddd;
              border-radius: 24px;
              cursor: pointer;
              font-size: 14px;
              width: 100%;
            "
          >
            Get Help
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(container);
  }

  /**
   * Request a reload with reason tracking
   */
  public requestReload(reason: string, severity: ErrorSeverity = ErrorSeverity.TEMPORARY): boolean {
    console.log('🔄 Reload requested:', { reason, severity });

    const now = Date.now();
    const request: ReloadRequest = { reason, timestamp: now, severity };

    // Add to history
    this.reloadHistory.push(request);

    // Check if reload is allowed
    if (!this.canReload()) {
      return false;
    }

    // Handle based on severity
    switch (severity) {
      case ErrorSeverity.NETWORK:
        if (!navigator.onLine) {
          console.warn('📴 Reload blocked: Offline');
          return false;
        }
        break;

      case ErrorSeverity.SESSION:
        // Clear session data before reload
        try {
          localStorage.removeItem('sb-bommnpdpzmvqufurwwik-auth-token');
          sessionStorage.removeItem('session');
        } catch (e) {
          console.warn('Failed to clear session:', e);
        }
        break;

      case ErrorSeverity.FATAL:
        this.enterMaintenanceMode(reason);
        return false;
    }

    // Update state
    this.state.reloadCount++;
    this.state.lastReloadAttempt = now;
    this.saveState();

    // Perform reload
    console.log('✅ Reload allowed - executing');
    setTimeout(() => window.location.reload(), 100);
    return true;
  }

  /**
   * Request navigation recovery (without reload)
   */
  public recoverNavigation(targetPath: string): void {
    console.log('🧭 Navigation recovery to:', targetPath);
    try {
      window.location.href = targetPath;
    } catch (error) {
      console.error('Navigation recovery failed:', error);
      this.requestReload('Navigation recovery failed', ErrorSeverity.TEMPORARY);
    }
  }

  /**
   * Request a retry with exponential backoff
   */
  public requestRetry(action: () => Promise<void>, maxAttempts: number = 3): void {
    let attempts = 0;
    
    const retry = async () => {
      attempts++;
      try {
        await action();
        console.log('✅ Retry successful');
      } catch (error) {
        console.warn(`⚠️ Retry attempt ${attempts} failed:`, error);
        
        if (attempts < maxAttempts) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempts), 10000);
          console.log(`🔄 Retrying in ${backoffMs}ms...`);
          setTimeout(retry, backoffMs);
        } else {
          console.error('❌ Max retry attempts reached');
          this.requestReload('Max retry attempts exceeded', ErrorSeverity.TEMPORARY);
        }
      }
    };
    
    retry();
  }

  /**
   * Mark initialization as complete
   */
  public markReady(): void {
    console.log('✅ Application ready');
    this.state.state = AppState.READY;
    this.saveState();
  }

  /**
   * Get current state
   */
  public getState(): AppState {
    return this.state.state;
  }

  /**
   * Check if mobile
   */
  public isMobileDevice(): boolean {
    return this.state.isMobile;
  }

  /**
   * Check if online
   */
  public isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Get connection type
   */
  public getConnectionType(): ConnectionType {
    // Re-detect in case connection changed
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (!navigator.onLine) {
      return 'offline';
    } else if (connection && connection.effectiveType) {
      return connection.effectiveType as ConnectionType;
    }
    return this.state.connectionType;
  }

  /**
   * Reset controller (for manual user action)
   */
  public reset(): void {
    console.log('🔄 ApplicationController reset');
    this.reloadHistory = [];
    this.state.reloadCount = 0;
    this.state.lastReloadAttempt = null;
    this.state.state = AppState.INITIALIZING;
    sessionStorage.removeItem('app_controller_state');
  }
}

// Singleton instance
export const ApplicationController = new ApplicationControllerClass();
