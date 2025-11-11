export default {
  experimental: {
    serverActions: { allowedOrigins: ['*'] }
  },
  // Disable static optimization for pages that need dynamic rendering
  output: 'standalone',
};
