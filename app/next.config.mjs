/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // wagmi's connector barrel pulls in Coinbase's baseAccount connector, whose
    // optional x402 deps aren't published. We only use the injected connector,
    // so stub the missing modules out of the bundle.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/evm": false,
      "@x402/svm": false,
      "@x402/core": false,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };
    return config;
  },
};
export default nextConfig;
