# Google OAuth Setup Guide

If the "Or continue with Google" button is not working, follow these steps to properly configure Google OAuth in Firebase Console:

## 1. Firebase Console Configuration

### Step 1: Enable Google Sign-In
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `trafficai-auth`
3. Navigate to **Authentication** > **Sign-in method**
4. Click on **Google** provider
5. Enable the **Google** sign-in method
6. Set your project's public-facing name
7. Choose a support email
8. Click **Save**

### Step 2: Configure Authorized Domains
1. In the same **Authentication** > **Sign-in method** page
2. Scroll down to **Authorized domains**
3. Make sure these domains are added:
   - `localhost` (for local development)
   - `trafficai-auth.firebaseapp.com` (your Firebase hosting domain)
   - Any other domains where you'll deploy your app

## 2. Google Cloud Console Configuration

### Step 1: Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `trafficai-auth`
3. Navigate to **APIs & Services** > **Credentials**

### Step 2: Configure OAuth 2.0 Client
1. Find your **OAuth 2.0 Client IDs**
2. Click on the client ID created by Firebase (usually named "Web client (auto created by Google Service)")
3. In **Authorized JavaScript origins**, add:
   - `http://localhost:3000`
   - `https://localhost:3000`
   - `https://trafficai-auth.firebaseapp.com`
4. In **Authorized redirect URIs**, add:
   - `http://localhost:3000/__/auth/handler`
   - `https://localhost:3000/__/auth/handler`
   - `https://trafficai-auth.firebaseapp.com/__/auth/handler`
5. Click **Save**

### Step 3: Configure OAuth Consent Screen
1. Navigate to **APIs & Services** > **OAuth consent screen**
2. Make sure the consent screen is properly configured:
   - App name: Your app name
   - User support email: Your email
   - Developer contact information: Your email
3. Add test users if your app is in testing mode
4. Make sure the app is published or add your email as a test user

## 3. Common Issues and Solutions

### Issue: "This app isn't verified"
**Solution:** 
- Add your email as a test user in OAuth consent screen
- Or publish your app for production use

### Issue: "redirect_uri_mismatch"
**Solution:** 
- Make sure `http://localhost:3000` is added to authorized origins
- Make sure the redirect URI includes the correct Firebase auth handler path

### Issue: "Popup blocked"
**Solution:** 
- Allow popups for localhost:3000 in your browser
- The app now shows a user-friendly error message for this

### Issue: "unauthorized_domain"
**Solution:** 
- Add `localhost` to authorized domains in Firebase Console
- Wait a few minutes for changes to propagate

## 4. Testing

After configuration:
1. Clear your browser cache
2. Restart your development server
3. Try the Google sign-in button
4. Check browser console for any error messages

## 5. Environment Variables

Make sure your `.env.local` file has the correct Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDCF4B69El2yOdNK2EjFeTtYDvhPQ0PT0U
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=trafficai-auth.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=trafficai-auth
# ... other config
```

## 6. Verification

To verify everything is working:
1. Open browser developer tools
2. Go to Console tab
3. Click the Google sign-in button
4. You should see logs like:
   - "Initializing Firebase with config"
   - "Creating Google provider..."
   - "Attempting signInWithPopup..."
   - "signInWithPopup successful" (if working)

If you see any errors, they will now be more descriptive and help identify the specific issue.