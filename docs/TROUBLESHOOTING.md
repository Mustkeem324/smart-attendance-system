# APEX Electronics — Cross-Platform Troubleshooting & Operations Manual

## 1. Top Diagnostic Quick Reference

| Issue / Symptom | Root Cause | Immediate Remediation |
| :--- | :--- | :--- |
| **Android WebView displays `net::ERR_CLEARTEXT_NOT_PERMITTED`** | Android 9+ blocks HTTP traffic by default unless cleartext is permitted. | Verify `android:usesCleartextTraffic="true"` in `AndroidManifest.xml` and `server: { cleartext: true }` in `capacitor.config.ts`. |
| **`npx cap sync android` fails with missing `index.html`** | Capacitor requires a root HTML entry point in the web directory (`public/`). | Ensure `public/index.html` exists with valid bootloader markup. |
| **Field sales visits not syncing after reconnection** | Local storage quota exceeded or Service Worker caching old API response. | Tap **Sync Now** in `<AndroidSyncStatusBar />` or clear browser storage under DevTools > Application > Storage. |
| **Horizontal scrollbar appears on tablets / laptops** | Fixed-width desktop headers or wide search inputs exceeding container width. | Use responsive utility classes (`max-w-xs xl:max-w-md`, `hidden xl:inline`). |
| **Camera returns blank screen in Android WebView** | Hardware acceleration disabled or missing camera permissions. | Ensure `android.permission.CAMERA` is granted and hardware acceleration is enabled in `AndroidManifest.xml`. |

---

## 2. In-Depth Problem Resolution

### 2.1 Issue: Cleartext Network Traffic Blocked in Android Emulator
- **Symptom**: During local testing, the Android app displays a white screen or `net::ERR_CLEARTEXT_NOT_PERMITTED` when connecting to `http://10.0.2.2:3000` or local IP.
- **Cause**: Android enforces HTTPS by default on API 28+ (Android 9.0).
- **Resolution**:
  1. Open `android/app/src/main/AndroidManifest.xml`.
  2. Verify the `<application>` tag contains:
     ```xml
     <application
         android:usesCleartextTraffic="true"
         ... >
     ```
  3. In `capacitor.config.ts`, verify:
     ```typescript
     server: {
       cleartext: true
     }
     ```
  4. Run `npx cap copy android`.

---

### 2.2 Issue: Capacitor Sync Error (`web assets directory must contain index.html`)
- **Symptom**: Running `npx cap sync android` throws:
  `[error] The web assets directory (./public) must contain an index.html file.`
- **Cause**: Next.js App Router renders pages dynamically or into `.next/`, but Capacitor inspects the designated `webDir: 'public'` for an `index.html`.
- **Resolution**:
  APEX provides an intelligent bootloader at `public/index.html`. If missing, recreate it with:
  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url=/field-sales/mobile">
    <title>APEX Electronics</title>
  </head>
  <body style="background-color: #0E122A; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh;">
    <p>Loading APEX Electronics...</p>
  </body>
  </html>
  ```

---

### 2.3 Issue: Camera or GPS Denied by User
- **Symptom**: Field agent taps "Capture GPS" or "Take Photo" and receives an error alert.
- **Resolution**:
  1. On Android: Open **Settings > Apps > APEX Electronics > Permissions**.
  2. Toggle **Location** to "Allow only while using the app" and check "Use precise location".
  3. Toggle **Camera** to "Allow".
  4. On Mobile Browser: Tap the padlock icon in the browser address bar, tap **Permissions**, and allow **Camera** and **Location**.

---

### 2.4 Issue: Service Worker Serving Stale Application Code
- **Symptom**: Changes to the user interface do not reflect on mobile web browsers even after hard reload.
- **Cause**: The PWA Service Worker is serving cached assets from `CACHE_NAME`.
- **Resolution**:
  1. Increment `CACHE_NAME` in `public/sw.js` (e.g. from `apex-enterprise-v1` to `apex-enterprise-v2`).
  2. The service worker `activate` event will automatically purge all legacy caches:
     ```javascript
     caches.keys().then((keys) => {
       return Promise.all(
         keys.map((key) => {
           if (key !== CACHE_NAME) return caches.delete(key);
         })
       );
     });
     ```
  3. Field agents can also force a refresh by closing the PWA and reopening it.

---

### 2.5 Issue: PostgreSQL Connection Failure on Port 5435
- **Symptom**: API endpoints return `PrismaClientInitializationError: Can't reach database server at localhost:5435`.
- **Resolution**:
  1. Verify PostgreSQL container or service status:
     ```bash
     pg_isready -h localhost -p 5435
     ```
  2. If down, restart the service or Docker container:
     ```bash
     sudo systemctl restart postgresql
     # or if Dockerized
     docker restart smart-attendance-pg
     ```
  3. Verify `.env` string contains port `5435`:
     ```env
     DATABASE_URL="postgresql://postgres:postgres@localhost:5435/smart_attendance?schema=public"
     ```

---

### 2.6 Issue: MongoDB Connection Dropping on Port 27017
- **Symptom**: APIs logging `MongooseError: Operation buffering timed out after 10000ms`.
- **Resolution**:
  1. Check MongoDB status:
     ```bash
     nc -zv 127.0.0.1 27017
     ```
  2. Restart MongoDB daemon:
     ```bash
     sudo systemctl restart mongod
     ```
  3. In `src/lib/mongodb.ts`, verify connection pooling settings:
     ```typescript
     const opts = {
       bufferCommands: false,
       maxPoolSize: 20,
       serverSelectionTimeoutMS: 5000,
     };
     ```
