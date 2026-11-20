# APEX Electronics — Android Developer Setup Guide

## 1. Prerequisites & Environment Requirements

To build, run, and debug the APEX Electronics Android native application, ensure your workstation meets the following specifications:

- **Operating System**: Linux (Ubuntu 20.04+), macOS 13+, or Windows 11 with WSL2.
- **Node.js**: v18.18.0 or v20.x+ (Recommended: Node v20 LTS).
- **Package Manager**: npm v10+.
- **Java Development Kit (JDK)**: OpenJDK 17 or 21 LTS (`java -version`).
- **Android Studio**: Android Studio Hedgehog (2023.1.1) or Ladybug (2024.2+).
- **Android SDK**:
  - `minSdkVersion`: 24 (Android 7.0 Nougat — covers 99.2% of active Android devices).
  - `compileSdkVersion`: 36 (Android 15+).
  - `targetSdkVersion`: 36.
  - Android SDK Platform-Tools (`adb`) installed and added to `$PATH`.

---

## 2. Environment Variables Configuration

Add the following to your shell profile (`~/.bashrc` or `~/.zshrc`):

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 # Adjust to your local JDK path
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
```

Verify your setup:
```bash
adb --version
java -version
```

---

## 3. Capacitor Native Project Architecture

The Android application is powered by Capacitor 8. The native Android source code lives directly in the root directory under `/android`:

```
smart-attendance-system/
├── capacitor.config.ts           # Capacitor core configuration
├── public/                       # Web assets and PWA icons
│   ├── manifest.json
│   ├── sw.js
│   ├── icon.svg
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
└── android/                      # Native Android project
    ├── build.gradle              # Top-level Gradle script
    ├── variables.gradle          # SDK versions & dependency versions
    └── app/
        ├── build.gradle          # Application Gradle configuration
        └── src/main/
            ├── AndroidManifest.xml # Permissions & Intent Filters
            ├── java/             # Native Java / Kotlin activities
            └── res/              # Android mipmap icons and styles
```

---

## 4. Step-by-Step Build & Sync Workflow

### Step 4.1: Install Dependencies
```bash
cd /home/nx-pro/smart-attendance-system
npm install
```

### Step 4.2: Build the Production Web Assets
Compile the Next.js application:
```bash
npm run build
```

### Step 4.3: Synchronize with Native Android Project
Sync the web assets, plugins, and dependencies with the Android native project:
```bash
npx cap sync android
```
*Note: Run `npx cap copy android` whenever you only update public assets or icons.*

### Step 4.4: Open in Android Studio
Launch Android Studio with the configured project:
```bash
npx cap open android
```

---

## 5. Running on Physical Device & Emulator

### Option A: Running on a Physical Android Smartphone / Tablet
1. Enable **Developer Options** on the Android device:
   - Navigate to **Settings > About Phone**.
   - Tap **Build Number** 7 times until "You are now a developer!" appears.
2. Enable **USB Debugging** in **Settings > System > Developer Options**.
3. Connect the device via USB cable. Run:
   ```bash
   adb devices
   ```
   Confirm your device appears in the list as `device` (authorize the prompt on the screen if prompted).
4. Run the app directly from Capacitor CLI:
   ```bash
   npx cap run android
   ```

### Option B: Running on Android Studio Emulator
1. Open Android Studio: `npx cap open android`.
2. Open **Device Manager** (Tools > Device Manager).
3. Create a Virtual Device:
   - Device: **Pixel 7** or **Galaxy Tab S8**.
   - System Image: **Android 14 (API 34)** or **Android 15 (API 35)** with Google Play.
4. Click **Run 'app'** (Green play button or Shift+F10) in Android Studio.

---

## 6. Live Reload for Local Development

To run the Android app with Next.js live reload during active development:
1. Start the Next.js development server:
   ```bash
   npm run dev
   ```
2. In `capacitor.config.ts`, temporarily point the server URL to your machine's local LAN IP:
   ```typescript
   const config: CapacitorConfig = {
     appId: 'com.apex.electronics.distribution',
     appName: 'APEX Electronics',
     webDir: 'public',
     server: {
       url: 'http://192.168.1.50:3000', // Replace with your computer's local IP
       cleartext: true
     }
   };
   ```
3. Run `npx cap sync android` and launch the app.
