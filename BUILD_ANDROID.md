# Android Build Guide for n58-iptv-player

This guide outlines the minimal steps to generate a production Android APK for the n58-iptv-player using Capacitor and Android Studio.

## 1. Prerequisites
- **Node.js**: LTS version.
- **Android Studio**: Installed and configured with Android SDK.
- **Command Line**: Terminal or PowerShell.

## 2. Environment Setup
Install project dependencies:
```bash
npm install
```

## 3. Build Web Assets
Generate the static export of the Next.js application:
```bash
npm run static
```
*Note: This creates the `out` directory which Capacitor uses.*

## 4. Initialize Capacitor Android
Add the Android platform to the project (only needed once):
```bash
npx cap add android
```

## 5. Sync Assets
Sync the compiled web assets and plugins with the Android project:
```bash
npx cap sync android
```

## 6. Generate APK in Android Studio
Open the project in Android Studio:
```bash
npx cap open android
```

### Steps inside Android Studio:
1. **Wait for Gradle Sync**: Allow Android Studio to finish indexing and syncing.
2. **Select Build Variant**:
   - Go to `Build` > `Select Build Variant`.
   - Ensure `release` or `debug` is selected as per your requirement.
3. **Build APK**:
   - Go to `Build` > `Build Bundle(s) / APK(s)` > `Build APK(s)`.
4. **Locate File**:
   - Once finished, a popup will appear at the bottom right. Click **locate** to find your `app-debug.apk` or `app-release-unsigned.apk`.

## 7. Fast Refresh (Development)
To quickly update the app after making web code changes:
```bash
npm run static && npx cap copy android
```
*Then press "Run" in Android Studio to deploy to your device/emulator.*
