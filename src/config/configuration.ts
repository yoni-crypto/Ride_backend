export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  jwt: { secret: process.env.JWT_SECRET, expiresIn: process.env.JWT_EXPIRES_IN || '3600s' },
  db: { url: process.env.DATABASE_URL },
  redis: { url: process.env.REDIS_URL },
});
