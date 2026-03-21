# AdSense Troubleshooting Guide

## Quick Diagnosis Checklist

### 1. **Critical Issue: Test Ad Slot IDs**
**Status**: 🚨 **BLOCKING ADS FROM SHOWING**

The current implementation uses placeholder ad slot IDs that will never display real ads:
- `1234567890` (Banner)
- `9876543210` (Sidebar) 
- `5432198765` (Pinterest Style)

**Solution**: Replace with real ad slot IDs from your Google AdSense dashboard.

### 2. **Membership Status**
✅ **Implemented**: Ads only show for standard membership users
- Premium users see no ads (working as intended)
- Check membership tier in debug panel

### 3. **AdSense Script Loading**
✅ **Implemented**: Script loads from Google CDN
- Script URL: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2506170791039308`
- Check script loading status in debug panel

### 4. **Content Security Policy (CSP)**
✅ **Configured**: AdSense domains whitelisted
- `pagead2.googlesyndication.com`
- `googleads.g.doubleclick.net`

## Debug Tools Available

### 1. **AdSenseDebugPanel** (New)
- Real-time ad status monitoring
- Script loading verification
- Ad slot scanning and status
- Network request monitoring
- Manual ad refresh capability

### 2. **AdSenseUnit Debug Mode**
- Per-ad debugging information
- Loading state tracking
- Error detection and reporting
- Test slot ID warnings

### 3. **Enhanced Console Logging**
Every ad now logs detailed information:
```
🔍 AdSense[SLOT_ID]: Initial state
🔍 AdSense[SLOT_ID]: Script loading status
🔍 AdSense[SLOT_ID]: Ad request status
```

## Common Issues & Solutions

### Issue: "No ads showing at all"

**Check these in order:**

1. **Membership Tier**
   ```
   Navigate to debug panel → Check "Membership: standard"
   If premium → Ads are disabled (working as intended)
   ```

2. **AdSense Script Loading**
   ```
   Debug panel → Check "AdSense Script: Loaded"
   If failed → Check network connectivity and CSP
   ```

3. **Ad Slots Configuration**
   ```
   Debug panel → Check "Ad Slots Found: > 0"
   If 0 → Page may not have ads or components not rendering
   ```

### Issue: "Ads requested but not loading"

**Most likely cause: Test ad slot IDs**

Test slots like `1234567890` will never show real ads. You need:

1. **Google AdSense Account**
   - Account must be approved
   - Payment information configured
   - Ad serving enabled

2. **Real Ad Units**
   - Create ad units in AdSense dashboard
   - Get real slot IDs (usually 10-digit numbers)
   - Replace test IDs in components

3. **ads.txt File**
   - Already configured: `google.com, pub-2506170791039308, DIRECT`
   - Verify it's accessible at `/ads.txt`

### Issue: "Script loading but ads still not showing"

1. **Check Console Errors**
   ```
   Browser console → Look for AdSense-related errors
   Common: Rate limiting, invalid slots, account issues
   ```

2. **Verify Account Status**
   ```
   Check Google AdSense dashboard for:
   - Account approval status
   - Policy violations
   - Ad serving status
   ```

3. **Test with Real Slot IDs**
   ```
   Replace test IDs with real ones from AdSense dashboard
   ```

## Development vs Production

### Development Mode
- Debug panels visible
- Enhanced logging enabled
- Test slot ID warnings shown
- Perfect for troubleshooting

### Production Mode
- Debug panels hidden
- Minimal logging
- Real ad slot IDs required
- Performance optimized

## Next Steps

### Immediate Actions Required

1. **Create Google AdSense Account** (if not done)
2. **Get Account Approval** from Google
3. **Create Ad Units** in AdSense dashboard
4. **Replace Test Slot IDs** with real ones
5. **Test on staging** environment
6. **Monitor performance** after deployment

### File Locations to Update

```
src/components/ads/BannerAd.tsx     → slot = "YOUR_REAL_BANNER_SLOT"
src/components/ads/SidebarAd.tsx    → slot = "YOUR_REAL_SIDEBAR_SLOT"  
src/components/ads/PinterestStyleAd.tsx → slot = "YOUR_REAL_PINTEREST_SLOT"
```

### Testing Access

1. **Security Admin Panel**: `/security-admin`
2. **AdSense Test Tab**: Shows all debug tools
3. **Standard Membership Account**: Required to see ads

## Performance Considerations

### Current Optimizations
- ✅ Lazy loading below the fold
- ✅ Script loading with timeout handling
- ✅ CSP optimized for AdSense
- ✅ Mobile-first loading strategy

### Recommended Monitoring
- Ad viewability rates
- Page load impact
- User engagement metrics
- Revenue per impression

## Support Resources

- **Google AdSense Help**: https://support.google.com/adsense
- **Debug Panel**: Built-in real-time monitoring
- **Browser Console**: Detailed logging available
- **CSP Configuration**: Already optimized in `index.html`

---

**Key Takeaway**: The implementation is complete and working correctly. The only blocking issue is using test ad slot IDs instead of real ones from Google AdSense.