# Quick Start Guide

## Prerequisites Check
- [ ] Node.js installed (v14+)
- [ ] MongoDB running (local or Atlas)
- [ ] Expo CLI installed (`npm install -g expo-cli`)

## Step 1: Backend Setup (5 minutes)

```bash
cd server
npm install
```

Create `.env` file:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/chat-app
JWT_SECRET=my-super-secret-jwt-key-12345
NODE_ENV=development
```

Start MongoDB (if local):
```bash
# Windows
net start MongoDB

# Mac/Linux
mongod
```

Start server:
```bash
npm start
```

You should see: `Server running on port 3000` and `Connected to MongoDB`

## Step 2: Frontend Setup (5 minutes)

```bash
cd mobile
npm install
```

**IMPORTANT**: Update API URLs in:
- `mobile/services/api.js` - Change `http://localhost:3000` to:
  - Android Emulator: `http://10.0.2.2:3000`
  - iOS Simulator: `http://localhost:3000`
  - Physical Device: `http://YOUR_COMPUTER_IP:3000`

- `mobile/context/SocketContext.js` - Same change as above

Start Expo:
```bash
npm start
```

Press `a` for Android or `i` for iOS

## Step 3: Test the App

1. Register User 1:
   - Username: `alice`
   - Email: `alice@test.com`
   - Password: `password123`

2. Register User 2 (on another device/simulator):
   - Username: `bob`
   - Email: `bob@test.com`
   - Password: `password123`

3. Login with alice, you'll see bob in the user list
4. Tap on bob to start chatting
5. Login with bob on another device
6. Send messages between them - they should appear in real-time!

## Troubleshooting

**"Cannot connect to server"**
- Check server is running: `http://localhost:3000`
- Verify API URL in mobile app matches your setup
- For physical device, ensure same WiFi network

**"MongoDB connection error"**
- Check MongoDB is running: `mongod` or check service status
- Verify connection string in `.env`

**"Socket connection failed"**
- Check server logs for authentication errors
- Verify JWT token is being sent
- Check CORS settings

## Next Steps

- Customize UI colors and styles
- Add image/file sharing
- Add push notifications
- Add message search
- Add group chats

