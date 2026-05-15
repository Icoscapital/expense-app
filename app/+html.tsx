/**
 * Root HTML for every web page (Expo Router static export).
 *
 * Adds the meta tags iPhone Safari looks at when a user picks
 * Share → "Add to Home Screen", so the icon shows the Icos logo,
 * the title shows "Icos Expenses", and the app opens full-screen
 * without the Safari URL bar (standalone PWA mode).
 */
import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* App title shown under the home-screen icon on iOS */}
        <title>Icos Expenses</title>
        <meta name="application-name" content="Icos Expenses" />
        <meta name="description" content="Submit and approve Icos Capital expenses" />

        {/* Theme color = browser chrome tint on Android Chrome / iOS PWA status bar */}
        <meta name="theme-color" content="#4F46E5" />

        {/* iOS-specific: makes it behave like a real app once added to home screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Expenses" />

        {/* Icons — iOS Safari uses apple-touch-icon when adding to home screen */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />

        {/* Web App Manifest — Android Chrome + desktop PWAs */}
        <link rel="manifest" href="/manifest.webmanifest" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
