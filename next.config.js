// next.config.js
module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  // Enable PWA support via next-pwa (install as dev dependency)
  // pwa: {
  //   dest: 'public',
  //   register: true,
  //   skipWaiting: true,
  // },
  images: {
    domains: ['cdn.supabase.io', 'images.unsplash.com'],
  },
};
