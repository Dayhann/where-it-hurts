import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Keep CLAUDE.md as the project rules file; do not append Next.js agent stubs.
  agentRules: false,
  // Hide the floating Next.js N badge in local preview.
  devIndicators: false,
};

export default nextConfig;
