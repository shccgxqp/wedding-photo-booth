# Wedding Photo Booth

An iPad-friendly wedding photo booth web app.

Guests can choose a frame layout, take photos with the device camera, generate a finished photo strip or collage, save it to the server, and scan a QR Code to download the final image on their phone.

## Run

```bash
npm install
npm start
```

Open `http://localhost:3000` for local testing. For iPad camera access in production, deploy behind HTTPS.

## Configure

Edit `config/wedding.json` to update the couple name, wedding date, theme colors, countdown seconds, and public URL.

If the app is deployed behind a reverse proxy or custom domain, set `publicBaseUrl` or the `PUBLIC_BASE_URL` environment variable so generated QR Codes use the correct HTTPS URL.
