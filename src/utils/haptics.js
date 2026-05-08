export const triggerHaptic = (type = 'light') => {
    // Failsafe for SSR (Next.js) and unsupported browsers (iOS Safari)
    if (typeof window !== 'undefined' && navigator.vibrate) {
        switch (type) {
            case 'light': 
                // A tiny 'tick' for toggles, drawers, and UI interactions
                navigator.vibrate(10);
                break;
            case 'success': 
                // A pleasant double-pulse for sent messages or payments
                navigator.vibrate([15, 50, 15]); 
                break;
            case 'error': 
                // A harsh, jarring triple-pulse for failures or drops
                navigator.vibrate([50, 100, 50]); 
                break;
            default:
                navigator.vibrate(10);
        }
    }
};