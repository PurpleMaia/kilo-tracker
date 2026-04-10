import 'dotenv/config'

export default 
{
  expo: {
    name: "KILO Tracker",
    slug: "kilo-tracker",
    scheme: "kilo-tracker",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSSpeechRecognitionUsageDescription: "KILO uses speech recognition to transcribe your voice observations.",
        NSMicrophoneUsageDescription: "KILO needs microphone access to record your voice observations.",
        ITSAppUsesNonExemptEncryption: false
      },
      bundleIdentifier: process.env.IDENTIFIER
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png"
      },
      predictiveBackGestureEnabled: false,
      permissions: [
        "android.permission.RECORD_AUDIO"
      ],
      package: process.env.IDENTIFIER
    },
    web: {
      bundler: "metro",
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-font",
      "expo-speech-recognition"
    ],
    extra: {
      router: {},
      eas: {
        projectId: "c0e9a1f3-19d1-450d-a7eb-725505f117b3"
      },
    }
  }
}