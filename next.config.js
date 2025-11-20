/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    webpack: (config) => {
      // 1. Ignore the 'canvas' module completely
      config.resolve.alias.canvas = false;
      
      // 2. Specifically ignore .node files to prevent binary parsing errors
      config.module.rules.push({
        test: /\.node$/,
        use: 'ignore-loader',
      });
  
      return config;
    },
  };
  
  module.exports = nextConfig;
  