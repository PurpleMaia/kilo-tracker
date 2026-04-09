import 'dotenv/config'

export default{
  cli: {
    version: ">= 18.5.0",
    appVersionSource: "remote"
  },
  build: {
    development: {
      developmentClient: true,
      distribution: "internal",
      env: {
        NODE_ENV: "development",
        API_URL: process.env.EXPO_PUBLIC_API_URL,
      },
    },
    preview: {
      distribution: "internal"
    },
    production: {
      env: {
        NODE_ENV: "production",
        API_URL: process.env.EXPO_PUBLIC_API_URL,
      },
      autoIncrement: true
    }
  },
  submit: {
    production: {}
  }
}
