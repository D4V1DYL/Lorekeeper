// Font di-host sendiri (tanpa CDN pihak ketiga): game tetap jalan di LAN/offline dan tidak ada request eksternal.
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/cinzel/latin-900.css';
import '@fontsource/crimson-pro/latin-400.css';
import '@fontsource/crimson-pro/latin-400-italic.css';
import '@fontsource/crimson-pro/latin-600.css';
import './globals.css';

export const metadata = {
  title: 'Lorekeeper — D&D · AI Dungeon Master',
  description: 'Main D&D bareng teman dengan Dungeon Master AI (NVIDIA Nemotron) · Play D&D with friends, led by an AI Dungeon Master.',
  icons: { icon: '/favicon.svg' },
};

export const viewport = { themeColor: '#0c0a09', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="grain min-h-dvh">
        {/* pasang mode hemat sebelum render pertama (HP kentang / hemat data) */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var v=localStorage.getItem('lorekeeper:lowpower'),n=navigator,a=(n.connection&&n.connection.saveData)||(n.deviceMemory&&n.deviceMemory<=2)||(n.hardwareConcurrency&&n.hardwareConcurrency<=2);if(v==='1'||(v!=='0'&&a))document.documentElement.classList.add('lowfx')}catch(e){}",
          }}
        />
        {children}
      </body>
    </html>
  );
}
