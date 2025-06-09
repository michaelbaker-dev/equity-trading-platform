// Smart Update Frequency Manager
class UpdateFrequencyManager {
    constructor() {
        this.isMarketHours = true;
        this.isPageVisible = true;
        this.userActivity = Date.now();
        this.currentInterval = null;
        
        // Base intervals (in milliseconds)
        this.intervals = {
            // Market hours vs after hours
            marketHours: {
                active: 5000,      // 5 seconds when market is open and user active
                inactive: 10000,   // 10 seconds when market open but user inactive
                background: 15000  // 15 seconds when market open but tab hidden
            },
            afterHours: {
                active: 10000,     // 10 seconds when market closed and user active
                inactive: 30000,   // 30 seconds when market closed and user inactive
                background: 60000  // 1 minute when market closed and tab hidden
            }
        };
        
        this.initializeListeners();
        this.checkMarketHours();
    }

    initializeListeners() {
        // Page visibility changes
        document.addEventListener('visibilitychange', () => {
            this.isPageVisible = !document.hidden;
            this.updateFrequency();
        });
        
        // User activity tracking
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
            document.addEventListener(event, () => {
                this.userActivity = Date.now();
                this.updateFrequency();
            }, { passive: true });
        });
        
        // Check market hours every 10 minutes
        setInterval(() => {
            this.checkMarketHours();
        }, 10 * 60 * 1000);
    }

    checkMarketHours() {
        const now = new Date();
        const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
        const est = new Date(utc.getTime() + (-5 * 3600000)); // EST timezone
        
        const day = est.getDay(); // 0 = Sunday, 6 = Saturday
        const hour = est.getHours();
        const minute = est.getMinutes();
        const timeInMinutes = hour * 60 + minute;
        
        // Market hours: Monday-Friday 9:30 AM - 4:00 PM EST
        const marketOpen = 9 * 60 + 30;  // 9:30 AM
        const marketClose = 16 * 60;     // 4:00 PM
        
        const wasMarketHours = this.isMarketHours;
        this.isMarketHours = (day >= 1 && day <= 5) && 
                            (timeInMinutes >= marketOpen && timeInMinutes < marketClose);
        
        // If market status changed, update frequency
        if (wasMarketHours !== this.isMarketHours) {
            console.log(`Market ${this.isMarketHours ? 'opened' : 'closed'}, adjusting update frequency`);
            this.updateFrequency();
        }
    }

    getUserActivityLevel() {
        const timeSinceActivity = Date.now() - this.userActivity;
        
        if (!this.isPageVisible) return 'background';
        if (timeSinceActivity < 30000) return 'active';     // Active in last 30 seconds
        return 'inactive';                                   // Inactive but page visible
    }

    getCurrentInterval() {
        const activityLevel = this.getUserActivityLevel();
        const timeSet = this.isMarketHours ? this.intervals.marketHours : this.intervals.afterHours;
        
        return timeSet[activityLevel];
    }

    updateFrequency() {
        const newInterval = this.getCurrentInterval();
        
        // Only restart if interval actually changed
        if (this.currentInterval !== newInterval) {
            console.log(`Updating refresh frequency: ${newInterval}ms (Market: ${this.isMarketHours ? 'open' : 'closed'}, Activity: ${this.getUserActivityLevel()})`);
            
            this.currentInterval = newInterval;
            
            // Notify the main app to restart its interval
            if (window.updateFrequencyChanged) {
                window.updateFrequencyChanged(newInterval);
            }
            
            // Dispatch custom event
            window.dispatchEvent(new CustomEvent('frequencyChanged', {
                detail: { interval: newInterval, isMarketHours: this.isMarketHours }
            }));
        }
    }

    // Get recommended WebSocket frequency for the backend
    getWebSocketFrequency() {
        const base = this.isMarketHours ? 2000 : 5000;
        const activityLevel = this.getUserActivityLevel();
        
        switch (activityLevel) {
            case 'active': return base;
            case 'inactive': return base * 1.5;
            case 'background': return base * 2;
            default: return base;
        }
    }

    // Get current status for debugging
    getStatus() {
        return {
            isMarketHours: this.isMarketHours,
            isPageVisible: this.isPageVisible,
            activityLevel: this.getUserActivityLevel(),
            currentInterval: this.currentInterval,
            recommendedWebSocketFreq: this.getWebSocketFrequency()
        };
    }
}

// Global instance
window.updateFrequencyManager = new UpdateFrequencyManager();

console.log('Update frequency manager loaded successfully');