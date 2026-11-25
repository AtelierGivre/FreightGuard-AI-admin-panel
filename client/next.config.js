if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_PREVIEW_MODE === 'true') {
  throw new Error('NEXT_PUBLIC_PREVIEW_MODE=true is not allowed in a production build.');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
