/** Last-resort 404 for paths outside the localized app. */
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h1>Page not found</h1>
        <p>
          <a href="/">OpenDock</a>
        </p>
      </body>
    </html>
  );
}
