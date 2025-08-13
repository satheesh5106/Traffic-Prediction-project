# 🔥 Firebase Authentication Setup Guide

This guide will help you set up Firebase Authentication with Google Sign-In for the TrafficAI application.

## 📋 Prerequisites

- Firebase account (free tier is sufficient)
- Google Cloud Console access
- Node.js and npm installed

## 🚀 Step-by-Step Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `trafficai-auth` (or your preferred name)
4. Enable Google Analytics (optional but recommended)
5. Click "Create project"

### 2. Enable Authentication

1. In your Firebase project, go to **Authentication** → **Get started**
2. Go to **Sign-in method** tab
3. Enable **Email/Password** provider
4. Enable **Google** provider:
   - Click on Google
   - Toggle "Enable"
   - Set project support email
   - Click "Save"

### 3. Configure Web App

1. Go to **Project Settings** (gear icon)
2. Scroll down to "Your apps" section
3. Click **Web app** icon (`</>`)
4. Register app with nickname: `trafficai-web`
5. **Copy the Firebase config object** - you'll need this!

### 4. Get Your Firebase Web App Configuration

You need to get the web app configuration from Firebase Console:

#### Step 4.1: Get Web App Config
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your "trafficai-auth" project
3. Click on the gear icon (⚙️) next to "Project Overview"
4. Select "Project settings"
5. Scroll down to "Your apps" section
6. If you don't see a web app, click "Add app" and select the web icon (</>) 
7. Register your app with a name like "Traffic AI Web App"
8. You'll see a configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "trafficai-auth.firebaseapp.com",
  projectId: "trafficai-auth",
  storageBucket: "trafficai-auth.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

9. Copy these values - you'll need them for the next step

### 5. Set Up Google OAuth (DETAILED STEP-BY-STEP)

#### Step 5.1: Navigate to Google Cloud Console
1. **Open a new tab** and go to [Google Cloud Console](https://console.cloud.google.com/)
2. **Sign in** with the same Google account you used for Firebase
3. **Wait for the page to load** - you should see the Google Cloud Console dashboard

#### Step 5.2: Select Your Firebase Project
1. **Look at the top navigation bar** - you'll see a project selector dropdown
2. **Click on the project dropdown** (it might show "Select a project" or your current project name)
3. **Find and click on your Firebase project** (should be named something like "trafficai-auth" or whatever you named it)
4. **Wait for the project to load** - the URL should change to include your project ID

#### Step 5.3: Navigate to APIs & Services
1. **Look for the hamburger menu** (three horizontal lines) in the top-left corner
2. **Click the hamburger menu** to open the navigation sidebar
3. **Scroll down** in the sidebar until you find "APIs & Services"
4. **Click on "APIs & Services"** - this will expand a submenu
5. **Click on "Credentials"** from the submenu
6. **Wait for the Credentials page to load**

#### Step 5.4: Locate the OAuth 2.0 Client (CURRENT STEP - FROM YOUR SCREENSHOT)

**Based on your screenshot, I can see you're already on the Credentials page. Here's what to do next:**

1. **Look at the "OAuth 2.0 Client IDs" section** (you can see this in your screenshot)
2. **You should see an entry** that looks like:
   - Name: "Web client (auto created by Google Service)"
   - Type: "Web application"
   - Client ID: Something like "673916752-gduvei..."

3. **Click on the pencil/edit icon** (✏️) on the right side of that OAuth client entry
   - This icon should be in the "Actions" column
   - It might be a small pencil icon or an "Edit" button

#### Step 5.5: Configure the OAuth Client (WHAT HAPPENS AFTER YOU CLICK EDIT)

**After clicking the edit icon, a new page will open with the OAuth client configuration:**

1. **You'll see a form with several fields:**
   - Name: (leave as is)
   - Authorized JavaScript origins
   - Authorized redirect URIs

#### Step 5.6: Add Authorized JavaScript Origins

1. **Scroll down to "Authorized JavaScript origins" section**
2. **Click the "+ ADD URI" button**
3. **Add the following URIs one by one:**
   
   **For the first URI:**
   - Type: `http://localhost:3000`
   - Click "+ ADD URI" again
   
   **For the second URI:**
   - Type: `http://localhost:3001`
   - Click "+ ADD URI" again
   
   **For the third URI (if you have a production domain):**
   - Type: `https://yourdomain.com` (replace with your actual domain)

#### Step 5.7: Add Authorized Redirect URIs

1. **Scroll down to "Authorized redirect URIs" section**
2. **Click the "+ ADD URI" button**
3. **Add the following URIs one by one:**
   
   **For the first redirect URI:**
   - Type: `http://localhost:3000/__/auth/handler`
   - Click "+ ADD URI" again
   
   **For the second redirect URI:**
   - Type: `http://localhost:3001/__/auth/handler`
   - Click "+ ADD URI" again
   
   **For the third redirect URI (if you have a production domain):**
   - Type: `https://yourdomain.com/__/auth/handler`

#### Step 5.8: Save Your Changes

1. **Scroll to the bottom of the page**
2. **Click the blue "SAVE" button**
3. **Wait for the confirmation message** - you should see "OAuth client updated" or similar
4. **You can now close this tab** and return to your Firebase console

#### Step 5.9: Verify Your Setup

1. **Go back to your Firebase Console tab**
2. **Navigate to Authentication → Sign-in method**
3. **Click on Google provider**
4. **You should see your Web client ID is now properly configured**

---

**🎯 QUICK REFERENCE - What you need to add:**

**Authorized JavaScript origins:**
- `http://localhost:3000`
- `http://localhost:3001`
- `https://yourdomain.com` (for production)

**Authorized redirect URIs:**
- `http://localhost:3000/__/auth/handler`
- `http://localhost:3001/__/auth/handler`
- `https://yourdomain.com/__/auth/handler` (for production)

**❗ IMPORTANT NOTES:**
- Make sure to use `http://` for localhost (not `https://`)
- Make sure to use `https://` for production domains
- The `__/auth/handler` path is Firebase's default auth handler
- Don't forget to click SAVE after adding all URIs

### Step 6: Environment Variables Setup

Your `.env.local` file has already been configured with the Firebase service account credentials. Now, you need to add the web app configuration values (API key, messaging sender ID, and app ID) that you obtained in **Step 4**.

Open your `.env.local` file and replace the placeholder values for `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, and `NEXT_PUBLIC_FIREBASE_APP_ID` with your actual configuration:

```
NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_FIREBASE_AUTH_DOMAIN"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_FIREBASE_PROJECT_ID"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_FIREBASE_STORAGE_BUCKET"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_FIREBASE_MESSAGING_SENDER_ID"
NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_FIREBASE_APP_ID"

# Firebase Service Account Credentials (already configured)
FIREBASE_PRIVATE_KEY_ID="..."
FIREBASE_PRIVATE_KEY="..."
FIREBASE_CLIENT_EMAIL="..."
FIREBASE_CLIENT_ID="..."
FIREBASE_AUTH_URI="..."
FIREBASE_TOKEN_URI="..."
FIREBASE_AUTH_PROVIDER_X509_CERT_URL="..."
FIREBASE_CLIENT_X509_CERT_URL="..."
```

**Important**: The `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, and `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` should already be correctly set from the service account credentials. You only need to update `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, and `NEXT_PUBLIC_FIREBASE_APP_ID` with the values from your web app configuration.

### 7. Test the Setup

1. **Restart your development server** (if it's running):
```bash
# Stop the current server (Ctrl+C) then restart
npm run dev
```

2. **Navigate to your auth page**:
   - Go to `http://localhost:3001/auth` (or whatever port your server is using)

3. **Test Email/Password Authentication**:
   - Try creating a new account with email/password
   - Try signing in with the created account
   - Check for success/error toast notifications

4. **Test Google Sign-in**:
   - Click the "Sign in with Google" button
   - Complete the Google OAuth flow
   - Verify successful authentication

5. **Verify in Firebase Console**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Navigate to Authentication > Users
   - Confirm that new users appear in the list

6. **Check for errors**:
   - Open browser developer tools (F12)
   - Look for any console errors
   - Verify network requests are successful

## 🎉 Congratulations!

If all tests pass, your Firebase Authentication is now fully configured and working! Your authentication system includes:

✅ **Email/Password Authentication**
✅ **Google OAuth Sign-in**
✅ **Premium UI with Toast Notifications**
✅ **Secure Service Account Configuration**
✅ **Production-Ready Setup**

## Troubleshooting

### Common Issues:

1. **"Firebase: Error (auth/configuration-not-found)"**
   - Check that all environment variables are set correctly in `.env.local`
   - Ensure you've updated the placeholder values with actual Firebase config
   - Restart your development server after changing environment variables

2. **"Firebase: Error (auth/unauthorized-domain)"**
   - Complete Step 5 (Google OAuth configuration) in this guide
   - Add your domain to Firebase Console > Authentication > Settings > Authorized domains

3. **Google Sign-in popup blocked or fails**
   - Ensure you've completed Step 5 (OAuth configuration)
   - Check browser popup settings
   - Verify authorized JavaScript origins are correctly set

4. **"Firebase: Error (auth/invalid-api-key)"**
   - Double-check your API key in `.env.local` matches the one from Step 4
   - Ensure you've copied the correct values from Firebase Console

5. **Environment variables not loading**
   - Ensure `.env.local` is in the project root directory
   - Restart your development server after making changes
   - Check that variable names start with `NEXT_PUBLIC_` for client-side access

## Security Notes

- ✅ **Service account credentials are already securely configured**
- ✅ **Private keys are properly formatted with escape characters**
- ⚠️ **Never commit `.env.local` to version control**
- 🔒 **Use Firebase Security Rules to protect your database**
- 🛡️ **Consider implementing rate limiting for authentication**
- 🔄 **Regularly rotate your service account keys in production**

## Next Steps

1. **Set up Firebase Security Rules** for Firestore
2. **Configure user profiles** and additional user data
3. **Implement password reset** functionality
4. **Add email verification** for new accounts
5. **Set up production environment** variables
6. **Deploy to production** with proper domain configuration

---

**Need help?** If you encounter any issues, check the troubleshooting section above or refer to the [Firebase Documentation](https://firebase.google.com/docs/auth).

## 🔧 Configuration Details

### Firebase Security Rules

For Firestore (if you plan to use it), set up basic security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public read access for certain collections
    match /public/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Google OAuth Scopes

The application requests these scopes:
- `profile` - Basic profile information
- `email` - Email address

### Custom Parameters

- `prompt: 'select_account'` - Always show account picker

## 🎨 UI/UX Features

### Animations
- **Lottie animations** for loading and success states
- **Framer Motion** for smooth transitions
- **Particle effects** for visual appeal
- **Glassmorphism design** for modern look

### Responsive Design
- Mobile-first approach
- Adaptive Google Sign-In (popup on desktop, redirect on mobile)
- Touch-friendly interface

### Error Handling
- **Toast notifications** for user feedback
- Specific error messages for different failure scenarios
- Graceful fallbacks for network issues

## 🔒 Security Features

### Authentication Flow
- **JWT tokens** stored in secure HTTP-only cookies
- **CSRF protection** for redirect flows
- **Automatic token refresh**
- **Secure logout** with token cleanup

### Best Practices
- Environment variables for sensitive data
- HTTPS enforcement in production
- Input validation with Zod schemas
- Rate limiting protection

## 🚨 Troubleshooting

### Common Issues

1. **"Popup blocked" error**
   - Solution: The app automatically falls back to redirect flow
   - Users should allow popups for better UX

2. **"Invalid domain" error**
   - Check authorized domains in Google Cloud Console
   - Ensure localhost is added for development

3. **"Configuration not found" error**
   - Verify all environment variables are set
   - Check `.env.local` file exists and has correct values

4. **"Network request failed"**
   - Check internet connection
   - Verify Firebase project is active
   - Check browser console for detailed errors

### Debug Mode

Enable debug logging by adding to your `.env.local`:
```env
NEXT_PUBLIC_DEBUG=true
```

## 📱 Mobile Considerations

### iOS Safari
- Uses redirect flow instead of popup
- Handles third-party cookie restrictions
- Optimized touch interactions

### Android Chrome
- Seamless Google account integration
- Fast authentication flow
- Progressive Web App ready

## 🌐 Production Deployment

### Vercel Deployment

1. Add environment variables in Vercel dashboard
2. Update authorized domains in Google Cloud Console
3. Test authentication flow in production

### Domain Configuration

Update these settings for your production domain:
- Firebase authorized domains
- Google OAuth authorized origins
- Google OAuth redirect URIs

## 📊 Analytics & Monitoring

### Firebase Analytics
- User sign-up events
- Authentication method tracking
- Error rate monitoring

### Custom Events
```javascript
// Track successful authentication
analytics.logEvent('login', {
  method: 'google'
});

// Track authentication errors
analytics.logEvent('login_error', {
  error_code: 'popup_blocked'
});
```

## 🎯 Success Metrics

Monitor these KPIs:
- **Login Success Rate**: Target ≥ 95%
- **Drop-off Rate**: Target ≤ 5%
- **Page Load Time**: Target ≤ 2s
- **Animation Performance**: Target ≥ 60fps

## 🔄 Future Enhancements

- Apple Sign-In integration
- Facebook authentication
- Multi-factor authentication
- Social profile sync
- Advanced user management

---

**Need help?** Check the [Firebase Documentation](https://firebase.google.com/docs/auth) or create an issue in the repository.