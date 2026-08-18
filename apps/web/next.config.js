/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:4000/api/v1/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:4000/socket.io/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
