# Dreko vs His Kids as an Android app

Made for Carl's Odin 2 (Nov 22). The app holds no game code: it opens the game's web page full screen in
Chrome, as a "trusted web activity". That way the page gets the handheld's own controller through the
browser's Gamepad API. (Inside GM! Browser the controller belongs to the browser's own menus, so the game
is touch only there.)

- The page it opens: `game_url` in `app/src/main/res/values/strings.xml` (the preview link for now).
- No address bar: Chrome hides it only when the page names this app back. That is
  `public/.well-known/assetlinks.json` in the game, which holds the app id `xyz.gmcarl.dreko` and the
  fingerprint of the key the app is signed with (the Mac's standard Android debug key). Sign with another
  key and the fingerprint there has to change too.
- Build on the Mac: `./build.sh` gives `dreko.apk`; `./build.sh install` also installs it over adb.
  It borrows the Gradle wrapper and plugin version from `~/gm-browser-android` (read only).
- It needs Chrome on the device. The device's default browser can be another one.
