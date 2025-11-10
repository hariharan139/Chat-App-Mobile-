# Troubleshooting Guide

## Network Error When Registering/Logging In

### Issue: "Network Error" or "Cannot connect to server"

### Solutions:

1. **Make sure the server is running:**
   ```bash
   cd server
   npm start
   ```
   You should see:
   - "Server running on port 3000"
   - "Connected to MongoDB"

2. **Check if server is accessible:**
   - Open browser and go to: `http://localhost:3000/health`
   - Should return: `{"status":"ok","message":"Server is running"}`

3. **For Android Emulator:**
   - The app automatically uses `http://10.0.2.2:3000`
   - Make sure the server is listening on `0.0.0.0` (already configured)
   - Restart the server after any changes

4. **For iOS Simulator:**
   - The app uses `http://localhost:3000`
   - Should work automatically

5. **For Physical Device:**
   - Find your computer's IP address:
     - Windows: Run `ipconfig` and look for IPv4 Address
     - Mac/Linux: Run `ifconfig` or `ip addr`
   - Update `mobile/services/api.js` and `mobile/context/SocketContext.js`:
     ```javascript
     return 'http://YOUR_IP_ADDRESS:3000';
     ```
   - Make sure your phone and computer are on the same WiFi network
   - Make sure Windows Firewall allows Node.js connections

6. **Check MongoDB:**
   - Make sure MongoDB is running
   - Check `.env` file has correct `MONGODB_URI`
   - Default: `mongodb://localhost:27017/chat-app`

7. **Restart Everything:**
   ```bash
   # Stop server (Ctrl+C)
   # Restart server
   cd server
   npm start
   
   # In another terminal, restart Expo
   cd mobile
   npm start
   # Press 'a' for Android or 'i' for iOS
   ```

8. **Check Console Logs:**
   - Look at the Expo console for: "API URL: ..." and "Platform: ..."
   - Check server console for any error messages
   - Check React Native debugger for network errors

### Common Issues:

- **"ECONNREFUSED"**: Server is not running
- **"Network Error"**: Can't reach server (check IP/URL)
- **"Timeout"**: Server is slow or not responding
- **"MongoDB connection error"**: MongoDB is not running

### Test Server Manually:

```bash
# Test registration endpoint
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"test123"}'

# Should return a token and user object
```

