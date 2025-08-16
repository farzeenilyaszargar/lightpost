/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // add specific hosts you see in your feeds:
      { protocol: "https", hostname: "**" } // or list "bbc.co.uk", "static.reuters.com", etc.
    ],
  },
};
module.exports = nextConfig;
