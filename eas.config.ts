import 'dotenv/config'

export default{
  cli: {
    version: ">= 18.5.0",
    appVersionSource: "remote"
  },
  build: {
    development: {
      developmentClient: true,
      distribution: "internal"
    },
    preview: {
      distribution: "internal"
    },
    production: {
      env: {
        NODE_ENV: "production",
        API_URL: `${process.env.API_BASE_URL}:5000`,
      },
      autoIncrement: true
    }
  },
  submit: {
    production: {}
  }
}
