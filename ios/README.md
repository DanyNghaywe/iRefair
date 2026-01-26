# iRefair iOS (SwiftUI)

This folder contains a SwiftUI native iOS client for iRefair. It talks to the existing Next.js API routes.

## Quick start

1. Install XcodeGen (only needed once):
   - `brew install xcodegen`
2. Generate the Xcode project:
   - `cd ios/iRefairApp`
   - `xcodegen generate`
3. Open the project in Xcode:
   - `open iRefair.xcodeproj`
4. Run the Next.js API locally (optional, for development):
   - From the repo root: `npm run dev`
5. In the app, open **Settings** and set the API Base URL:
   - Local dev: `http://localhost:3000`
   - Production: `https://irefair.com`

## Features

- Applicant registration/update (multipart form with resume upload)
- Application submission (iRCRN + resume upload)
- Referrer registration + portal link request
- Referrer portal: view applicants and send feedback
- Deep links:
  - `irefair://portal?token=...` to open the referrer portal
  - `irefair://update?updateToken=...&appId=...` to prefill applicant updates
- Universal links (https):
  - Update the `TEAMID` in `public/.well-known/apple-app-site-association`
  - Example: `https://irefair.com/referrer/portal?token=...`
  - Example: `https://irefair.com/applicant?updateToken=...&appId=...`

## Notes

- The Info.plist includes ATS exceptions for `localhost` and `127.0.0.1` to enable local HTTP testing in the simulator.
- Portal tokens are stored securely in the iOS Keychain.
- App icons are generated placeholders. Replace them with branded icons for production.
- Telemetry scaffolding (Sentry):
  - Add your DSN in `ios/iRefairApp/iRefairApp/Info.plist` under `SENTRY_DSN`.
  - `SENTRY_ENVIRONMENT` and `SENTRY_RELEASE` are already configured.

## Structure

```
ios/
  iRefairApp/
    project.yml
    iRefairApp/
      Info.plist
      iRefairApp.swift
      ContentView.swift
      Models/
      Networking/
      Utilities/
      Views/
      Resources/
```
