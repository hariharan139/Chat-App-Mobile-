# URL Configuration Guide

## Current Configuration

Your app is currently configured to use:
- **Android**: `http://192.168.29.161:3000`
- **iOS Simulator**: `http://localhost:3000`

## Files That Contain URLs

You need to update URLs in **2 files** if your setup changes:

1. **`mobile/services/api.js`** - For REST API calls (login, register, get users, etc.)
2. **`mobile/context/SocketContext.js`** - For Socket.IO real-time connections

**IMPORTANT**: Both files must have the **same URL**!

## When to Change URLs

### ✅ Current Setup (Should Work)
Your IP address is: `192.168.29.161`
- Both files are already set to this IP
- **No changes needed** if you're using Android emulator or physical device on the same network

### When You NEED to Change:

1. **Different WiFi Network**
   - If you connect to a different WiFi, your IP changes
   - Run `ipconfig` to get new IP
   - Update both files with new IP

2. **Using Android Emulator (Alternative)**
   - If `192.168.29.161` doesn't work, try `10.0.2.2`
   - This is the standard Android emulator address
   - Update both files to use `http://10.0.2.2:3000`

3. **Using iOS Simulator**
   - Already configured to use `localhost:3000`
   - No changes needed

4. **Using Physical Device**
   - Must use your computer's IP address (not localhost)
   - Find IP with `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
   - Update both files with your IP

## How to Update URLs

### Step 1: Find Your IP Address

**Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address" (e.g., `192.168.1.100`)

**Mac/Linux:**
```bash
ifconfig
# or
ip addr
```

### Step 2: Update Both Files

**File 1: `mobile/services/api.js`**
```javascript
const getApiUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://YOUR_IP_HERE:3000';  // ← Change this
  }
  return 'http://localhost:3000';
};
```

**File 2: `mobile/context/SocketContext.js`**
```javascript
const getApiUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://YOUR_IP_HERE:3000';  // ← Change this (same IP!)
  }
  return 'http://localhost:3000';
};
```

### Step 3: Restart Expo
After changing URLs, restart Expo:
```bash
# Stop Expo (Ctrl+C)
npm start
# Press 'a' for Android or 'i' for iOS
```

## Quick Reference

| Setup | Android URL | iOS URL |
|-------|-------------|---------|
| Android Emulator (Standard) | `http://10.0.2.2:3000` | `http://localhost:3000` |
| Android Emulator (Alternative) | `http://192.168.29.161:3000` | `http://localhost:3000` |
| Physical Device | `http://YOUR_COMPUTER_IP:3000` | `http://YOUR_COMPUTER_IP:3000` |
| iOS Simulator | `http://localhost:3000` | `http://localhost:3000` |

## Current Status

✅ **Your URLs are correctly configured!**
- IP: `192.168.29.161`
- Both files match
- Should work for Android emulator and physical devices

## Troubleshooting

**If messages aren't working:**
1. Check console logs for "API URL: ..." - should show your IP
2. Check socket connection: Look for "✅ Socket connected successfully"
3. Verify server is running on port 3000
4. Make sure both files have the same URL

**If connection fails:**
1. Verify IP hasn't changed: Run `ipconfig` again
2. Try `10.0.2.2` for Android emulator
3. Check Windows Firewall allows Node.js
4. Ensure server is listening on `0.0.0.0:3000` (already configured)

