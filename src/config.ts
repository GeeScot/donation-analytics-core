export default {
  ConnectionString: process.env.MONGO_CONNECTION_STRING ?? '',
  DatabaseName: process.env.DATABASE_NAME ?? '',
  CorsPolicy: process.env.CORS_POLICY ?? '',
  TiltifyUrl: process.env.TILTIFY_URL ?? '',
  TiltifyCampaignId: process.env.TILTIFY_CAMPAIGN_ID ?? '',
  TiltifyAppToken: process.env.TILTIFY_APP_TOKEN ?? '',
  TiltifyPollingFrequency: parseInt(process.env.TILTIFY_POLLING_FREQ ?? '10000')
}
