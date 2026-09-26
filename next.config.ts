import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Keep CLAUDE.md as the project rules file; do not append Next.js agent stubs.
  agentRules: false,
};

export default nextConfig;
