# Chat App - React Native + Node.js

A real-time 1:1 chat application built with React Native (frontend) and Node.js with Express and Socket.IO (backend). Features include authentication, real-time messaging, typing indicators, online/offline status, and message read receipts.

## Project Structure

```
Chat-App/
├── server/          # Node.js backend
│   ├── models/      # MongoDB models (User, Message, Conversation)
│   ├── routes/      # Express routes (auth, users, conversations)
│   ├── middleware/  # Authentication middleware
│   ├── socket/      # Socket.IO event handlers
│   └── index.js     # Server entry point
├── mobile/          # React Native frontend
│   ├── screens/     # App screens (Login, Register, Home, Chat)
│   ├── components/  # Reusable components
│   ├── context/     # React contexts (Auth, Socket)
│   ├── services/    # API service
│   └── models/      # Data models
└── README.md
```

## Features

- ✅ User authentication (Register/Login with JWT)
- ✅ User list with last message preview
- ✅ Real-time messaging with Socket.IO
- ✅ Message persistence in MongoDB
- ✅ Typing indicators
- ✅ Online/offline status
- ✅ Message delivery/read receipts (single/double ticks)
- ✅ WhatsApp-like UI with light/dark themes
- ✅ File sharing (images, videos, documents)
- ✅ Voice message recording and playback
- ✅ Image viewing
- ✅ Document downloading
- ✅ Unread message counts
- ✅ Last seen status
- ✅ Modern, clean UI

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- React Native development environment:
  - For iOS: Xcode and CocoaPods
  - For Android: Android Studio and Android SDK
- Expo CLI (for React Native)

## Setup Instructions

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the `server/` directory:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/chat-app
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
```

4. Make sure MongoDB is running:
   - Local MongoDB: Start MongoDB service
   - MongoDB Atlas: Use your connection string in `MONGODB_URI`

5. Start the server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The server will run on `http://localhost:3000`

### Frontend Setup

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. **IMPORTANT**: Update the API URL in `mobile/services/api.js` and `mobile/context/SocketContext.js`:
   - For Android emulator: `http://10.0.2.2:3000`
   - For iOS simulator: `http://localhost:3000`
   - For physical device: `http://YOUR_COMPUTER_IP:3000` (replace with your local IP)
   
   Find your local IP:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`

4. Start the Expo development server:
```bash
npm start
```

5. Run on your device:
   - Press `a` for Android
   - Press `i` for iOS
   - Scan QR code with Expo Go app on your physical device

## Environment Variables

### Server (.env)
- `PORT`: Server port (default: 3000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token signing (minimum 32 characters)
- `NODE_ENV`: Environment (development/production)
- `CORS_ORIGIN`: Comma-separated list of allowed origins (or `*` for all)

See `server/env.example` for a template.

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
  ```json
  {
    "username": "john_doe",
    "email": "john@example.com",
    "password": "password123"
  }
  ```

- `POST /auth/login` - Login user
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```

### Users
- `GET /users` - Get all users (requires authentication)
  - Returns list of users with last message preview

### Conversations
- `POST /conversations/find-or-create` - Find or create a conversation
  ```json
  {
    "otherUserId": "user_id_here"
  }
  ```

- `GET /conversations/:id/messages` - Get messages for a conversation (requires authentication)

## Socket.IO Events

### Client → Server
- `message:send` - Send a new message
  ```json
  {
    "conversationId": "conversation_id",
    "text": "Hello!"
  }
  ```

- `typing:start` - User started typing
  ```json
  {
    "conversationId": "conversation_id"
  }
  ```

- `typing:stop` - User stopped typing
  ```json
  {
    "conversationId": "conversation_id"
  }
  ```

- `message:read` - Mark messages as read
  ```json
  {
    "conversationId": "conversation_id",
    "messageIds": ["message_id_1", "message_id_2"]
  }
  ```

### Server → Client
- `message:new` - New message received
- `typing:start` - Other user started typing
- `typing:stop` - Other user stopped typing
- `message:read` - Messages were read by recipient
- `error` - Error occurred

## Sample Users

You can create test users through the registration screen or use these sample credentials:

**User 1:**
- Username: `alice`
- Email: `alice@example.com`
- Password: `password123`

**User 2:**
- Username: `bob`
- Email: `bob@example.com`
- Password: `password123`

## Testing the App

1. Start the backend server
2. Start the mobile app
3. Register two different users (or use sample users)
4. Login with one user
5. You should see the other user in the user list
6. Tap on a user to start chatting
7. Open the app on another device/simulator and login with the second user
8. Send messages between the two users to test real-time functionality

## Deployment

### Quick Deployment Guide
See [QUICK_DEPLOY.md](./QUICK_DEPLOY.md) for a step-by-step deployment guide.

### Detailed Deployment Guide
See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment instructions including:
- MongoDB Atlas setup
- Backend deployment (Heroku, Railway, Render, AWS, etc.)
- Frontend deployment (Expo EAS)
- Production configuration
- Security considerations
- Monitoring and maintenance

### Deployment Options

**Backend:**
- Heroku (Free tier available)
- Railway (Easy setup)
- Render (Free tier available)
- DigitalOcean App Platform
- AWS EC2 / VPS

**Database:**
- MongoDB Atlas (Free tier available - Recommended)
- Self-hosted MongoDB

**Frontend:**
- Expo Application Services (EAS) - Recommended
- Google Play Store (Android)
- Apple App Store (iOS)

## Troubleshooting

### Connection Issues
- Ensure MongoDB is running
- Check that the server is running on the correct port
- Verify API URL in mobile app matches your server address
- For physical devices, ensure both device and computer are on the same network
- For production, ensure HTTPS is enabled and CORS is properly configured

### Socket.IO Connection Issues
- Check that CORS is properly configured
- Verify JWT token is being sent in socket handshake
- Check server logs for authentication errors
- Ensure WebSocket support on your hosting provider

### MongoDB Connection Issues
- Verify MongoDB is running: `mongod` or check MongoDB service
- Check connection string in `.env` file
- For MongoDB Atlas, ensure your IP is whitelisted (or use 0.0.0.0/0 for production)
- Verify database credentials

### Deployment Issues
- Check environment variables are set correctly
- Verify backend URL is accessible (test with `/health` endpoint)
- Ensure CORS_ORIGIN includes your frontend domain
- Check server logs for errors
- Verify file upload permissions (for cloud storage)

## Technologies Used

### Backend
- Node.js
- Express.js
- Socket.IO
- MongoDB with Mongoose
- JWT (jsonwebtoken)
- bcryptjs

### Frontend
- React Native
- Expo
- React Navigation
- Socket.IO Client
- Axios
- AsyncStorage

## License

This project is created for educational purposes.

## Notes

- The app uses JWT tokens stored in AsyncStorage for authentication
- Messages are persisted in MongoDB
- Real-time features use Socket.IO
- Online/offline status is updated when users connect/disconnect
- Typing indicators automatically stop after 3 seconds of inactivity

