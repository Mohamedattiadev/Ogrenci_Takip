import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Next'in gelistirme-modu gostergesi ("N" rozeti, sag-alt kose) sohbet
  // asistani FAB'imizla ayni koseye denk geliyordu - kapatildi.
  devIndicators: false,
};

export default nextConfig;
