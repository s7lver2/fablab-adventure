import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  // Aislamiento de origen cruzado: habilita SharedArrayBuffer + Atomics, necesarios para
  // que la consola interactiva pueda pausar el programa y esperar a que el usuario escriba.
  // Usamos COEP "credentialless" para no bloquear los <script> de Skulpt servidos por CDN.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
        ],
      },
    ]
  },
};

export default nextConfig;
