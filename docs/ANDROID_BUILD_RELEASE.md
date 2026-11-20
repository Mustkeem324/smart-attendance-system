# APEX Electronics — Android Production Build & Release Guide

## 1. Overview of Release Formats

For enterprise distribution, APEX supports two release distribution channels:

1. **Direct Enterprise Sideload (Universal APK)**: Delivered directly to field employees' company-managed smartphones or MDM systems without requiring Google Play.
2. **Google Play Store (Android App Bundle - AAB)**: Uploaded to Google Play Console for internal testing tracks, closed alpha/beta tracks, and production distribution.

---

## 2. Generating a Cryptographic Release Keystore

Create a secure 2048-bit RSA signing key using Java `keytool`:

```bash
mkdir -p android/keystores
keytool -genkey -v -keystore android/keystores/apex-release-key.jks \
  -alias apex-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=APEX Electronics, OU=Mobile Engineering, O=APEX Distribution, L=Bangalore, ST=Karnataka, C=IN"
```

*Note: Store `apex-release-key.jks` and its password securely in a vault (e.g. AWS Secrets Manager or HashiCorp Vault). Never commit passwords to public repositories.*

---

## 3. Configuring Gradle Signing Credentials

In `android/app/build.gradle`, configure the `release` signing block:

```groovy
android {
    ...
    signingConfigs {
        release {
            storeFile file("../../keystores/apex-release-key.jks")
            storePassword System.getenv("APEX_KEYSTORE_PASSWORD") ?: "secure-store-pass"
            keyAlias "apex-key-alias"
            keyPassword System.getenv("APEX_KEY_PASSWORD") ?: "secure-key-pass"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## 4. Building the Production Release Artifacts

### Step 4.1: Compile Next.js Web Assets
Ensure the latest web build is compiled:
```bash
cd /home/nx-pro/smart-attendance-system
npm run build
```

### Step 4.2: Synchronize Capacitor Native Bridge
Copy assets and configuration into the `android/` directory:
```bash
npx cap sync android
```

### Step 4.3: Generate Release APK (Sideloading)
Run Gradle assemble task from the `android/` directory:
```bash
cd android
./gradlew assembleRelease
```
The output APK is generated at:
`android/app/build/outputs/apk/release/app-release.apk`

Verify the APK signature with `apksigner`:
```bash
$ANDROID_HOME/build-tools/34.0.0/apksigner verify --verbose app/build/outputs/apk/release/app-release.apk
```

### Step 4.4: Generate Android App Bundle (.AAB) (Google Play)
Run Gradle bundle task:
```bash
cd android
./gradlew bundleRelease
```
The output AAB is generated at:
`android/app/build/outputs/bundle/release/app-release.aab`

---

## 5. Google Play Console Release Checklist

1. **Target API Level**: Verified target SDK is API 34+ (APEX is configured for API 36).
2. **App Icons & Splash**: Synchronized in `android/app/src/main/res/mipmap-*` (192px and 512px).
3. **Privacy Policy**: Link to wholesale distributor data privacy policy.
4. **Permissions Rationale Form**:
   - Location: Required for physical store attendance confirmation.
   - Camera: Required for store audit and shopfront verification photos.
5. **Release Track Deployment**:
   - Step 1: Upload `app-release.aab` to **Internal Testing Track**.
   - Step 2: Add field sales pilot testers via email list.
   - Step 3: Promote to **Closed Alpha / Beta Track**.
   - Step 4: Promote to **Production Track**.

---

## 6. Sideloading APK to Devices via ADB

To install the signed release APK onto a field sales rep's connected Android phone:
```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```
Confirm the application launches directly into `/field-sales/mobile`:
```bash
adb shell am start -n com.apex.electronics.distribution/.MainActivity
```
