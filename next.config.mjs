/** @type {import('next').NextConfig} */
import withPWAInit from 'next-pwa';

const nextConfig = { reactStrictMode: true };
const withPWA = withPWAInit({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    register: true,
    skipWaiting: true
});

export default withPWA(nextConfig);
