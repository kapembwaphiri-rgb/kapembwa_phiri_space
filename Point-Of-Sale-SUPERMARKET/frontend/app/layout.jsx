import '../src/styles/globals.css';

export const metadata = {
  title: 'Chi-White | Fallen Angel Collection',
  description: 'Plain white essentials, hoodies, and considered designer clothing.',
  applicationName: 'Chi-White'
};

export const viewport = { themeColor: '#080808' };

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
