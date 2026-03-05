export default function Home() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '48px', color: '#1e40af', marginBottom: '20px' }}>GrantFlow</h1>
      <p style={{ fontSize: '20px', color: '#4b5563', marginBottom: '30px' }}>
        System wniosków o dotacje - automatyzacja, współpraca zespołowa, AI.
      </p>
      
      <div style={{ background: '#f3f4f6', padding: '30px', borderRadius: '12px', marginBottom: '30px' }}>
        <h2>Funkcjonalności:</h2>
        <ul style={{ lineHeight: '2', marginTop: '15px' }}>
          <li>✓ Kalkulator budżetu z walidacją</li>
          <li>✓ Współpraca wieloosobowa (role: owner/admin/editor/viewer)</li>
          <li>✓ AI generowanie treści wniosków</li>
          <li>✓ Eksport PDF (SF-424, NIH)</li>
          <li>✓ Scrapery grantów (PARP, EU funds)</li>
        </ul>
      </div>

      <div style={{ background: '#dbeafe', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
        <p>🚀 System gotowy do użycia</p>
        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '10px' }}>
          Deployment: Vercel | Baza: PostgreSQL | AI: Gemini API
        </p>
      </div>
    </div>
  )
}