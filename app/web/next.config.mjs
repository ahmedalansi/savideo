/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  // Self-contained server for the Docker image (web/Dockerfile). Vercel ignores it.
  output: "standalone",
};
export default nextConfig;
