# Debug Steps - Network Error Resolution

## Current Status
✅ Server is listening on `0.0.0.0:3000` (all interfaces)
✅ Comprehensive logging added to frontend and backend
✅ Connection test function added

## Next Steps to Debug

### 1. Restart the Server
```bash
cd server
# Stop current server (Ctrl+C)
npm start
```

**Look for these logs:**
- "Server running on port 3000"
- "Server accessible at http://localhost:3000"
- "For Android emulator: http://10.0.2.2:3000"
- "Connected to MongoDB"

### 2. Test Server Manually
Open browser and go to: `http://localhost:3000/health`
Should see: `{"status":"ok","message":"Server is running"}`

### 3. Restart Expo App
```bash
cd mobile
# Stop current Expo (Ctrl+C)
npm start
# Press 'a' for Android
```

### 4. Check Console Logs

**In Expo Console, you should see:**
```
=== API Configuration ===
API URL: http://10.0.2.2:3000  (for Android)
Platform: android
==========================
```

**When you try to register, you'll see:**
```
Testing server connection before registration...
=== API Error Details ===
Error message: ...
Error code: ...
Full error object: ...
========================
```

### 5. Check Server Console

**When registration is attempted, server should show:**
```
[2025-11-09T...] POST /auth/register
Headers: {...}
Body: { username: '...', email: '...', password: '...' }
=== Registration Request ===
...
```

## Common Issues & Solutions

### Issue: "Network Error" with no server logs
**Problem:** Request never reaches server
**Solutions:**
- Check Windows Firewall allows Node.js
- Verify server is actually running
- Check API URL in console matches your setup

### Issue: "ECONNREFUSED"
**Problem:** Can't connect to server
**Solutions:**
- Server not running → Start server
- Wrong port → Check .env file
- Firewall blocking → Allow Node.js in Windows Firewall

### Issue: "ENOTFOUND" or "getaddrinfo failed"
**Problem:** Can't resolve hostname
**Solutions:**
- For Android: Use `10.0.2.2` (already configured)
- For iOS: Use `localhost` (already configured)
- For physical device: Use your computer's IP address

### Issue: Server logs show request but app shows error
**Problem:** CORS or response issue
**Solutions:**
- Check CORS is enabled (already configured)
- Check response format matches expected

## Get Your Computer's IP (for physical device)

**Windows:**
```powershell
ipconfig
# Look for "IPv4 Address" under your active network adapter
```

**Then update in `mobile/services/api.js`:**
```javascript
const getApiUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://YOUR_IP_ADDRESS:3000';  // e.g., 'http://192.168.1.100:3000'
  }
  return 'http://localhost:3000';
};
```

## What to Share for Further Debugging

If still having issues, share:
1. **Expo Console Output** - All the error logs
2. **Server Console Output** - Any request logs
3. **Platform** - Android emulator, iOS simulator, or physical device
4. **API URL** - What the console shows for "API URL:"

