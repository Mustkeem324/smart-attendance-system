# APEX Electronics — Android Native Permissions Guide

## 1. Overview & Security Philosophy

The APEX Electronics mobile application operates in commercial retail environments where field sales representatives record store visits, verify physical locations, capture visual evidence, and book sales orders.

To ensure compliance with Google Play Store policies and protect user privacy, permissions adhere strictly to the **Principle of Least Privilege**:
- Permissions are requested only when required by specific business actions (Just-In-Time).
- Every permission is accompanied by a transparent user rationale.
- Offline and low-connectivity fallbacks exist if non-critical permissions are declined.

---

## 2. Complete Permissions Catalog (`AndroidManifest.xml`)

| Permission String | Protection Level | Primary Use Case in APEX B2B System | Runtime / Install-time |
| :--- | :--- | :--- | :--- |
| `android.permission.INTERNET` | Normal | API communication with Next.js backend, sync queue upload, Google Maps tile loading. | Install-time |
| `android.permission.ACCESS_NETWORK_STATE` | Normal | Detects online/offline connectivity shifts to trigger automatic background synchronization. | Install-time |
| `android.permission.ACCESS_FINE_LOCATION` | Dangerous | High-precision GPS tracking (<10m) to verify employee presence at the physical retail store. | Runtime |
| `android.permission.ACCESS_COARSE_LOCATION` | Dangerous | Approximate cellular/Wi-Fi positioning fallback when GPS signals are obstructed indoors. | Runtime |
| `android.permission.CAMERA` | Dangerous | Capturing mandatory shopfront photographs and shelf displays during active sales visits. | Runtime |
| `android.permission.READ_MEDIA_IMAGES` | Dangerous (API 33+) | Selecting previously captured shop photos from device gallery (Android 13+). | Runtime |
| `android.permission.READ_EXTERNAL_STORAGE` | Dangerous (API <=32) | Legacy gallery image access for devices running Android 12 and below. | Runtime |
| `android.permission.WRITE_EXTERNAL_STORAGE`| Dangerous (API <=32) | Temporary caching of uncompressed camera images prior to upload compression. | Runtime |
| `android.permission.VIBRATE` | Normal | Haptic confirmation feedback upon successful order submission and barcode scanning. | Install-time |
| `android.permission.POST_NOTIFICATIONS` | Dangerous (API 33+) | Alerts field reps on order approval, inventory restocks, and price override decisions. | Runtime |

---

## 3. Detailed Runtime Permission Flows

### 3.1 Precise GPS Geolocation (`ACCESS_FINE_LOCATION`)
- **Trigger**: When the employee taps "Start Visit" or "Capture GPS Location" in `/field-sales/mobile`.
- **Rationale Dialog**: *"APEX Distribution requires your location to confirm physical attendance at the retail outlet and generate verified Google Maps coordinates."*
- **Acceptance Behavior**: Browser/Capacitor Geolocation API returns `latitude`, `longitude`, and `accuracy` (in meters). If accuracy is >25m, the UI prompts the user to step closer to a storefront opening.
- **Denial Behavior**: The user is allowed to manually select a predefined registered retailer address, but the visit is flagged in the Admin Console with `gpsVerification: 'MANUAL_UNVERIFIED'`.

### 3.2 Camera Capture (`CAMERA`)
- **Trigger**: When the employee clicks "Take Photo 1 (Shopfront)" or "Take Photo 2 (Display Counter)".
- **Rationale Dialog**: *"Camera access is required to capture authentic store audit photos as part of the physical visit record."*
- **Acceptance Behavior**: Launches native camera interface with 1080p framing guide. Photos are automatically compressed to high-quality JPEG (<1.5MB) with embedded timestamp watermarks.
- **Denial Behavior**: The app allows uploading an existing image file from storage, with an audit alert logged in MongoDB.

### 3.3 Push Notifications (`POST_NOTIFICATIONS`)
- **Trigger**: Onboarding or first visit submission.
- **Rationale Dialog**: *"Stay informed when regional managers approve your manual price discounts or credit limit overrides."*
- **Acceptance Behavior**: System registers FCM (Firebase Cloud Messaging) device token.
- **Denial Behavior**: Notifications fallback to in-app polling banner (`AndroidSyncStatusBar`).

---

## 4. Hardware Feature Declarations

To ensure maximum hardware compatibility (including rugged warehouse barcode scanners and budget tablets that lack native GPS hardware or autofocus):

```xml
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
<uses-feature android:name="android.hardware.location.gps" android:required="false" />
```

By setting `android:required="false"`, Google Play allows devices without dedicated hardware chips to install the application while falling back gracefully in software.

---

## 5. Deep Linking & URL Handling

APEX declares intent filters for both verified app links and custom schemes:

```xml
<!-- HTTPS App Links -->
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="apex-electronics.app" />
</intent-filter>

<!-- Custom Scheme Deep Linking -->
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="apex-distribution" />
</intent-filter>
```

Field agents clicking links like `apex-distribution://visit/new?shopId=...` from WhatsApp or SMS will launch directly into the mobile field sales flow.
