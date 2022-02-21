export default {
  ConnectionString: process.env.MONGO_CONNECTION_STRING ?? '',
  DatabaseName: process.env.DATABASE_NAME ?? '',
  TiltifyAppToken: process.env.TILTIFY_APP_TOKEN ?? ''
}
