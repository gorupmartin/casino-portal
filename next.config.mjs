/** @type {import('next').NextConfig} */
const nextConfig = {
    // Disable static page generation for pages using useSearchParams
    // This resolves "missing Suspense boundary" errors during build
    experimental: {
        missingSuspenseWithCSRBailout: false,
    },
};

export default nextConfig;
