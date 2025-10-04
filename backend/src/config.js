import dotenv from 'dotenv';
dotenv.config();

export default {
  port: process.env.PORT || 3001,
  mongodbUri: process.env.MONGODB_URI,
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    redirectUri: process.env.DISCORD_REDIRECT_URI,
  },
  sessionSecret: process.env.SESSION_SECRET,
};
