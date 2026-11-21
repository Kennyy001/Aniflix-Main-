# ANIFLIX — Android APK starter (mobile cloud build)

This project can be built into an installable Android APK using Expo cloud builds.

## Mobile-only steps
1. Extract this ZIP on your Android phone.
2. Create a new GitHub repository and upload the project files. Keep App.js, app.json, package.json and eas.json at the repository root; keep src/anilist.js inside the src folder.
3. Create an Expo account at https://expo.dev and connect GitHub in account settings > Connections.
4. Link this repository to an Expo project.
5. On the Expo project's Builds page, choose Build from GitHub, branch main, platform Android, and profile preview.
6. When the build completes, open the build details page on your phone and download the APK.
7. Tap the APK to install it, and approve Android's prompt if it asks whether your browser/files app may install apps. Only install the APK you built from this project.

Official guides:
- https://docs.expo.dev/build/building-from-github/
- https://docs.expo.dev/build-reference/apk/

Included: anime home feed, search, details, local watchlist, basic episode progress.
Not yet included: account sign-in, cloud sync, personalized recommendations, or video playback.
AniList supplies anime metadata, not full video episodes.
