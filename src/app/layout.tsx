export const metadata = {
  title: 'GrantFlow - System Wniosków o Dotacje',
  description: 'Automatyczny system wspierający składanie wniosków o dotacje',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body style={{ margin: 0, backgroundColor: '#fff' }}>{children}</body>
    </html>
  )
}