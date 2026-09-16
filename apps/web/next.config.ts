import type { NextConfig } from 'next';

// Tarayicinin API'ye ayni origin (bu Next sunucusunun portu) uzerinden ulasmasi icin;
// gercek istek sunucu tarafinda (Node-to-Node) API_PROXY_TARGET'a yonlendirilir. Boylece
// tarayicida farkli bir porta (5001) dogrudan baglanti gerekmez - bazi tarayici/uzanti/VPN
// kurulumlarinda localhost'un farkli bir portuna giden istekler engellenebiliyor.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? 'http://localhost:5001';

const nextConfig: NextConfig = {
  // Next'in gelistirme-modu gostergesi ("N" rozeti, sag-alt kose) sohbet
  // asistani FAB'imizla ayni koseye denk geliyordu - kapatildi.
  devIndicators: false,
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_PROXY_TARGET}/api/:path*` }];
  },
};

export default nextConfig;
