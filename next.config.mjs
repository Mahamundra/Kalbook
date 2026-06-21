/** @type {import('next').NextConfig} */
function getServerActionAllowedOrigins() {
  const origins = new Set(['localhost:3000', '127.0.0.1:3000']);

  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      origins.add(new URL(process.env.NEXT_PUBLIC_APP_URL).host);
    } catch {
      // Ignore invalid NEXT_PUBLIC_APP_URL values at build time.
    }
  }

  if (process.env.VERCEL_URL) {
    origins.add(process.env.VERCEL_URL);
  }

  return [...origins];
}

const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: getServerActionAllowedOrigins(),
    },
  },
};

export default nextConfig;
