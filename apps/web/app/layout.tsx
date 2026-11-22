import './globals.css';

/** Pass-through: `app/[locale]/layout.tsx` renders `<html>` with the right `lang`. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
