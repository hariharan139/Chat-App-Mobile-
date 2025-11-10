# Chat App Deployment Guide

This guide covers deploying the Chat App with MongoDB to make it fully functional in production.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [MongoDB Setup](#mongodb-setup)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [Environment Variables](#environment-variables)
6. [Production Configuration](#production-configuration)

## Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account (recommended) or MongoDB server
- Server/hosting provider (Heroku, Railway, Render, DigitalOcean, AWS, etc.)
- Domain name (optional but recommended)
- Expo account for mobile app deployment

## 1. MongoDB Setup

### Option A: MongoDB Atlas (Recommended - Free Tier Available)

1. **Create MongoDB Atlas Account**
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up for a free account
   - Create a free cluster (M0 Sandbox)

2. **Configure Database Access**
   - Go to "Database Access"
   - Add a new database user
   - Set username and password (save these!)
   - Set privileges: "Atlas admin" or "Read and write to any database"

3. **Configure Network Access**
   - Go to "Network Access"
   - Click "Add IP Address"
   - For production: Click "Allow Access from Anywhere" (0.0.0.0/0)
   - For development: Add your current IP address

4. **Get Connection String**
   - Go to "Database" → "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with your database name (e.g., `chat-app`)

   Example: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/chat-app?retryWrites=true&w=majority`

### Option B: Self-Hosted MongoDB

1. Install MongoDB on your server
2. Configure MongoDB to accept external connections
3. Set up authentication
4. Use connection string: `mongodb://username:password@your-server-ip:27017/chat-app`

## 2. Backend Deployment

### Option A: Heroku (Easy Deployment)

1. **Install Heroku CLI**
   ```bash
   # Download from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Prepare Server for Heroku**
   ```bash
   cd server
   # Heroku uses PORT environment variable automatically
   # Make sure server/index.js uses process.env.PORT
   ```

3. **Create Heroku App**
   ```bash
   heroku login
   heroku create your-chat-app-backend
   ```

4. **Set Environment Variables**
   ```bash
   heroku config:set MONGODB_URI=your-mongodb-connection-string
   heroku config:set JWT_SECRET=your-secret-key-minimum-32-characters
   heroku config:set NODE_ENV=production
   ```

5. **Deploy**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   heroku git:remote -a your-chat-app-backend
   git push heroku main
   ```

6. **View Logs**
   ```bash
   heroku logs --tail
   ```

### Option B: Railway

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your repository
   - Select the `server` folder

3. **Set Environment Variables**
   - Go to "Variables" tab
   - Add:
     - `MONGODB_URI`: Your MongoDB connection string
     - `JWT_SECRET`: Your secret key
     - `NODE_ENV`: production
     - `PORT`: Railway auto-assigns, but you can set it

4. **Deploy**
   - Railway auto-deploys on git push
   - Get your app URL from the "Settings" tab

### Option C: Render

1. **Create Render Account**
   - Go to https://render.com
   - Sign up

2. **Create Web Service**
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Set Environment Variables**
   - In the "Environment" section, add:
     - `MONGODB_URI`
     - `JWT_SECRET`
     - `NODE_ENV`: production

4. **Deploy**
   - Render auto-deploys on git push

### Option D: DigitalOcean App Platform

1. **Create DigitalOcean Account**
2. **Create App**
   - Connect GitHub repository
   - Select `server` directory
   - Set build and start commands

3. **Configure Environment Variables**
4. **Deploy**

### Option E: AWS EC2 / VPS

1. **Set Up Server**
   ```bash
   # SSH into your server
   ssh user@your-server-ip
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 (process manager)
   sudo npm install -g pm2
   ```

2. **Clone Repository**
   ```bash
   git clone your-repo-url
   cd Chat-App/server
   npm install
   ```

3. **Set Environment Variables**
   ```bash
   # Create .env file
   nano .env
   # Add your environment variables
   ```

4. **Start with PM2**
   ```bash
   pm2 start index.js --name chat-app-server
   pm2 save
   pm2 startup
   ```

5. **Set Up Nginx (Reverse Proxy)**
   ```bash
   sudo apt-get install nginx
   sudo nano /etc/nginx/sites-available/chat-app
   ```

   Nginx configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   ```bash
   sudo ln -s /etc/nginx/sites-available/chat-app /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

6. **Set Up SSL (Let's Encrypt)**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

## 3. Frontend Deployment

### Mobile App (React Native / Expo)

#### Option A: Expo Application Services (EAS) - Recommended

1. **Install EAS CLI**
   ```bash
   cd mobile
   npm install -g eas-cli
   eas login
   ```

2. **Configure EAS**
   ```bash
   eas build:configure
   ```

3. **Update API URL**
   - Update `mobile/services/api.js` with your production backend URL
   - Update `mobile/context/SocketContext.js` with your production backend URL

4. **Build for Android**
   ```bash
   eas build --platform android
   ```

5. **Build for iOS**
   ```bash
   eas build --platform ios
   ```

6. **Submit to App Stores**
   ```bash
   # Android (Google Play Store)
   eas submit --platform android
   
   # iOS (App Store)
   eas submit --platform ios
   ```

#### Option B: Expo Development Build

1. **Create Development Build**
   ```bash
   eas build --profile development --platform android
   ```

2. **Install on Device**
   - Download APK from Expo dashboard
   - Install on Android device
   - For iOS, use TestFlight

#### Option C: Local Build (Android APK)

1. **Generate Keystore**
   ```bash
   cd android/app
   keytool -genkeypair -v -storetype PKCS12 -keystore my-upload-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configure Gradle**
   - Update `android/gradle.properties`
   - Update `android/app/build.gradle`

3. **Build APK**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

4. **APK Location**
   - `android/app/build/outputs/apk/release/app-release.apk`

## 4. Environment Variables

### Backend (.env)

Create `server/.env`:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/chat-app?retryWrites=true&w=majority

# JWT Secret (use a strong random string)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# Server Port
PORT=3000

# Environment
NODE_ENV=production

# CORS Origins (comma-separated)
CORS_ORIGIN=https://your-frontend-domain.com,https://exp.host
```

### Frontend Configuration

Update `mobile/services/api.js`:

```javascript
const getApiUrl = () => {
  if (__DEV__) {
    // Development - use local IP or localhost
    if (Platform.OS === 'android') {
      return 'http://192.168.29.161:3000';
    }
    return 'http://localhost:3000';
  } else {
    // Production - use your deployed backend URL
    return 'https://your-backend-url.herokuapp.com';
    // Or: return 'https://your-backend-url.railway.app';
    // Or: return 'https://api.yourdomain.com';
  }
};
```

Update `mobile/context/SocketContext.js` similarly.

## 5. Production Configuration

### Backend Updates

1. **Update CORS Settings**
   ```javascript
   // server/index.js
   const cors = require('cors');
   
   app.use(cors({
     origin: process.env.CORS_ORIGIN?.split(',') || '*',
     credentials: true
   }));
   ```

2. **Update Socket.IO CORS**
   ```javascript
   // server/index.js
   const io = socketIo(server, {
     cors: {
       origin: process.env.CORS_ORIGIN?.split(',') || '*',
       methods: ["GET", "POST"],
       credentials: true
     }
   });
   ```

3. **Update Server Listen**
   ```javascript
   // server/index.js
   const PORT = process.env.PORT || 3000;
   server.listen(PORT, '0.0.0.0', () => {
     console.log(`Server running on port ${PORT}`);
   });
   ```

4. **File Upload Configuration**
   - For cloud storage (recommended): Use AWS S3, Cloudinary, or similar
   - For local storage: Ensure uploads directory is persistent
   - Update `server/middleware/upload.js` for cloud storage if needed

### Security Considerations

1. **Use HTTPS**
   - Always use HTTPS in production
   - Update API URLs to use `https://`

2. **Environment Variables**
   - Never commit `.env` files
   - Use secure environment variable storage
   - Use strong JWT secrets

3. **Rate Limiting**
   - Add rate limiting to prevent abuse
   - Use `express-rate-limit`

4. **File Upload Limits**
   - Set appropriate file size limits
   - Validate file types
   - Scan for malware (optional)

5. **Database Security**
   - Use strong database passwords
   - Restrict IP access in MongoDB Atlas
   - Enable MongoDB authentication

## 6. Testing Production Deployment

1. **Test Backend**
   ```bash
   # Test health endpoint
   curl https://your-backend-url.herokuapp.com/health
   
   # Test API
   curl https://your-backend-url.herokuapp.com/auth/register
   ```

2. **Test Mobile App**
   - Install app on physical device
   - Test registration/login
   - Test messaging
   - Test file uploads
   - Test voice messages

## 7. Monitoring and Maintenance

1. **Logging**
   - Set up logging service (Winston, Morgan)
   - Monitor server logs
   - Set up error tracking (Sentry)

2. **Database Backups**
   - MongoDB Atlas has automatic backups
   - Set up manual backups if self-hosting

3. **Server Monitoring**
   - Monitor server resources
   - Set up alerts
   - Monitor API response times

4. **Update Dependencies**
   - Regularly update npm packages
   - Check for security vulnerabilities
   - Test updates in staging first

## 8. Common Issues and Solutions

### Issue: CORS Errors
**Solution**: Update CORS settings to include your frontend domain

### Issue: Socket.IO Connection Failed
**Solution**: 
- Check CORS settings
- Ensure WebSocket support on your hosting provider
- Check firewall settings

### Issue: File Uploads Not Working
**Solution**:
- Check file permissions
- Ensure uploads directory exists
- Check file size limits
- Consider using cloud storage

### Issue: MongoDB Connection Failed
**Solution**:
- Check connection string
- Verify IP whitelist in MongoDB Atlas
- Check database credentials
- Ensure network access is configured

## 9. Quick Deployment Checklist

- [ ] MongoDB Atlas account created and configured
- [ ] Backend deployed to hosting provider
- [ ] Environment variables set
- [ ] CORS configured correctly
- [ ] Socket.IO CORS configured
- [ ] Frontend API URLs updated
- [ ] Mobile app built and tested
- [ ] HTTPS enabled
- [ ] Database backups configured
- [ ] Monitoring set up
- [ ] Error tracking configured

## 10. Support

For issues or questions:
- Check server logs
- Check MongoDB Atlas logs
- Review error messages
- Test API endpoints
- Verify environment variables

## Example Production URLs

- Backend: `https://chat-app-api.herokuapp.com`
- MongoDB: `mongodb+srv://user:pass@cluster.mongodb.net/chat-app`
- Mobile App: Built with EAS and distributed via app stores

---

**Note**: Always test thoroughly in a staging environment before deploying to production!

