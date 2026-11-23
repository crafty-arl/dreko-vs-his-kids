#!/bin/bash
# Build the Dreko vs His Kids Android app on the Mac: ./build.sh  ->  dreko.apk here.
#   ./build.sh install    also installs it over adb (it does not start it)
# It borrows the Gradle wrapper and the Android Gradle Plugin version from ~/gm-browser-android, read only.
set -e
cd "$(dirname "$0")"
[ -z "$JAVA_HOME" ] && [ -d /opt/homebrew/opt/openjdk@21 ] && export JAVA_HOME=/opt/homebrew/opt/openjdk@21
BROWSER=~/gm-browser-android
if [ ! -x ./gradlew ] && [ -x "$BROWSER/gradlew" ]; then
    cp "$BROWSER/gradlew" . && mkdir -p gradle && cp -R "$BROWSER/gradle/wrapper" gradle/
fi
if [ -z "$AGP" ] && [ -d "$BROWSER" ]; then
    AGP=$(grep -rhoE "com\.android\.(tools\.build:gradle:|application['\"]? *\)? *version *['\"]?)[0-9][0-9.]*" "$BROWSER"/*.gradle* 2>/dev/null | grep -oE "[0-9]+\.[0-9]+(\.[0-9]+)?" | head -1)
fi
OPTS=()
[ -n "$AGP" ] && OPTS+=("-PagpVersion=$AGP")
echo "building (plugin ${AGP:-from gradle.properties})"
./gradlew assembleRelease "${OPTS[@]}"
cp app/build/outputs/apk/release/app-release.apk dreko.apk
echo "built: $(pwd)/dreko.apk"
if [ "$1" = "install" ]; then adb install -r dreko.apk; fi
