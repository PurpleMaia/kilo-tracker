import "dotenv/config";

export default {
  expo: {
    name: "KILO Tracker",
    slug: "kilo-tracker",
    scheme: "kilo-tracker",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSSpeechRecognitionUsageDescription:
          "KILO uses speech recognition to transcribe your voice observations.",
        NSMicrophoneUsageDescription:
          "KILO needs microphone access to record your voice observations.",
        NSCameraUsageDescription:
          "KILO uses the camera to attach a photo to your observation.",
        NSPhotoLibraryUsageDescription:
          "KILO accesses your photo library so you can attach a photo to an observation.",
        ITSAppUsesNonExemptEncryption: false,
      },
      bundleIdentifier: "org.purplemaia.kilotracker",
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
      permissions: ["android.permission.RECORD_AUDIO"],
      package: "org.purplemaia.kilotracker",
    },
    web: {
      bundler: "metro",
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-font",
      "expo-speech-recognition",
    ],
    extra: {
      router: {},
      eas: {
        projectId: "6edaa094-9c7d-4883-9e17-dbea67e24fa1",
      },
    },
  },
};
