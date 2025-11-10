# Quick Deployment Guide

This is a simplified guide to deploy your Chat App quickly. For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 🚀 Quick Start (5 Steps)

### Step 1: Set Up MongoDB Atlas (Free)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a free cluster (M0)
4. Create a database user (username/password)
5. Allow access from anywhere (0.0.0.0/0) in Network Access
6. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/chat-app?retryWrites=true&w=majority`

### Step 2: Deploy Backend (Heroku - Free Tier)

1. **Install Heroku CLI**
   ```bash
   # Download from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create Heroku App**
   ```bash
   cd server
   heroku create your-chat-app-backend
   ```

4. **Set Environment Variables**
   ```bash
   heroku config:set MONGODB_URI="your-mongodb-connection-string"
   heroku config:set JWT_SECRET="your-super-secret-key-minimum-32-chars"
   heroku config:set NODE_ENV=production
   heroku config:set CORS_ORIGIN="*"
   ```

5. **Deploy**
   ```bash
   git init
   git add .
   git commit -m "Deploy backend"
   heroku git:remote -a your-chat-app-backend
   git push heroku main
   ```

6. **Get Your Backend URL**
   ```bash
   heroku info
   # Your backend URL will be: https://your-chat-app-backend.herokuapp.com
   ```

### Step 3: Update Frontend Configuration

1. **Update API URL in `mobile/services/api.js`**
   ```javascript
   if (!__DEV__) {
     return 'https://your-chat-app-backend.herokuapp.com'; // Replace with your Heroku URL
   }
   ```

2. **Update Socket URL in `mobile/context/SocketContext.js`**
   ```javascript
   if (!__DEV__) {
     return 'https://your-chat-app-backend.herokuapp.com'; // Replace with your Heroku URL
   }
   ```

### Step 4: Build Mobile App

#### Option A: Development Build (For Testing)

```bash
cd mobile
npm install -g eas-cli
eas login
eas build --profile development --platform android
```

#### Option B: Production Build (For App Store)

```bash
cd mobile
eas build --platform android
eas build --platform ios
```

### Step 5: Test Your Deployment

1. Install the app on your device
2. Register a new account
3. Test messaging
4. Test file uploads
5. Test voice messages

## 🔧 Alternative: Railway (Easier than Heroku)

1. Go to https://railway.app
2. Sign up with GitHub
3. Create new project from GitHub repo
4. Select `server` folder
5. Add environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - `CORS_ORIGIN=*`
6. Deploy automatically
7. Get your Railway URL and update frontend

## 📱 Mobile App Distribution

### Android (APK)

1. Build with EAS:
   ```bash
   eas build --platform android
   ```

2. Download APK from Expo dashboard

3. Share APK with users (or upload to Google Play Store)

### iOS (TestFlight)

1. Build with EAS:
   ```bash
   eas build --platform ios
   ```

2. Submit to TestFlight:
   ```bash
   eas submit --platform ios
   ```

## 🔍 Verify Deployment

### Backend Health Check

```bash
curl https://your-backend-url.herokuapp.com/health
```

Should return: `{"status":"ok","message":"Server is running"}`

### Test API

```bash
curl -X POST https://your-backend-url.herokuapp.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"test123"}'
```

## 🐛 Troubleshooting

### Backend Issues

- **MongoDB Connection Failed**: Check connection string and network access
- **CORS Errors**: Update `CORS_ORIGIN` environment variable
- **Socket.IO Not Working**: Ensure WebSocket support on hosting provider

### Frontend Issues

- **Can't Connect to Backend**: Check API URL in `api.js` and `SocketContext.js`
- **Network Errors**: Ensure backend is running and accessible
- **Authentication Errors**: Check JWT_SECRET matches between frontend and backend

## 📚 Next Steps

- Set up custom domain
- Enable HTTPS
- Set up monitoring
- Configure backups
- Add rate limiting
- Set up error tracking (Sentry)

## 🆘 Need Help?

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions or check the troubleshooting section.

