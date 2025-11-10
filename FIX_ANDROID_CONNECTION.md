# Fix Android Emulator Connection Issue

## Problem
Cannot connect to server at `http://10.0.2.2:3000` from Android emulator.

## Solutions (Try in order)

### Solution 1: Restart Server (Most Common Fix)
The server needs to be restarted to listen on all interfaces:

```bash
cd server
# Stop server (Ctrl+C)
npm start
```

**Verify it shows:**
```
Server running on port 3000
Server accessible at http://localhost:3000
For Android emulator: http://10.0.2.2:3000
Connected to MongoDB
```

### Solution 2: Use Your Computer's IP Address
If `10.0.2.2` doesn't work, use your actual IP:

1. **Find your IP address:**
   ```powershell
   ipconfig
   ```
   Look for "IPv4 Address" (e.g., `192.168.1.100`)

2. **Update `mobile/services/api.js`:**
   ```javascript
   const getApiUrl = () => {
     if (Platform.OS === 'android') {
       return 'http://192.168.1.100:3000'; // Your IP
     }
     return 'http://localhost:3000';
   };
   ```

3. **Also update `mobile/context/SocketContext.js` with the same IP**

4. **Restart Expo app**

### Solution 3: Check Windows Firewall
Windows Firewall might be blocking the connection:

1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Find "Node.js" and ensure both Private and Public are checked
4. If Node.js isn't listed, click "Allow another app" and add Node.js

**Or via PowerShell (Run as Administrator):**
```powershell
New-NetFirewallRule -DisplayName "Node.js Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### Solution 4: Check Android Emulator Network
1. Open Android Emulator
2. Go to Settings > Network
3. Ensure it's using the default network settings
4. Try restarting the emulator

### Solution 5: Use ADB Port Forwarding
Forward the port from emulator to host:

```bash
adb reverse tcp:3000 tcp:3000
```

Then in `mobile/services/api.js`, use:
```javascript
if (Platform.OS === 'android') {
  return 'http://localhost:3000'; // After port forwarding
}
```

### Solution 6: Test Connection from Emulator
1. Open browser in Android emulator
2. Go to: `http://10.0.2.2:3000/health`
3. Should see: `{"status":"ok","message":"Server is running"}`
4. If this works, the issue is in the app code
5. If this doesn't work, it's a network/firewall issue

## Quick Test Commands

**Test server from host:**
```bash
curl http://localhost:3000/health
```

**Test from PowerShell:**
```powershell
Invoke-WebRequest -Uri http://localhost:3000/health
```

**Check if port is listening:**
```powershell
netstat -an | Select-String ":3000"
```

Should show: `TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING`

## Most Likely Fix
**Restart the server** - The server needs to be restarted after the `0.0.0.0` configuration change.

