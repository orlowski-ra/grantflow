export default function Home() {
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', margin: 0, padding: 0 }}>
      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '80px 20px',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '20px', maxWidth: '800px', margin: '0 auto 20px' }}>
          Składaj wnioski o dotacje
          <br />
          <span style={{ color: '#ffd700' }}>3x szybciej</span>
        </h1>
        
        <p style={{ fontSize: '20px', opacity: 0.9, marginBottom: '30px', maxWidth: '600px', margin: '0 auto 30px' }}>
          Automatyczny system wspierający przygotowanie wniosków o dotacje unijne i krajowe. 
          Kalkulator budżetu, AI generowanie treści, współpraca zespołowa.
        </p>
        
        {/* Email capture form */}
        <div style={{ maxWidth: '500px', margin: '0 auto 20px' }}>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              alert('Dziękujemy! Link dostępu wyślemy na podany email.');
            }}
            style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}
          >
            <input 
              type="email" 
              placeholder="Twój email"
              required
              style={{
                padding: '15px 20px',
                fontSize: '16px',
                border: 'none',
                borderRadius: '8px',
                flex: '1',
                minWidth: '250px'
              }}
            />
            <button 
              type="submit"
              style={{
                padding: '15px 30px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: '#48bb78',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Zacznij za darmo →
            </button>
          </form>
        </div>
        
        <p style={{ fontSize: '14px', opacity: 0.8 }}>
          ✅ Darmowy plan • Bez karty kredytowej • Anuluj w każdej chwili
        </p>
      </div>

      {/* Social Proof */}
      <div style={{ background: '#1a202c', color: 'white', padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ marginBottom: '20px', opacity: 0.8 }}>Zaufali nam:</p>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '40px', 
          flexWrap: 'wrap',
          fontSize: '14px',
          opacity: 0.6
        }}>
          <span>🚀 500+ firm</span>
          <span>⭐ 4.9/5 ocena</span>
          <span>💰 50M+ PLN w dotacjach</span>
        </div>
      </div>

      {/* Features */}
      <div style={{ padding: '60px 20px', maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '32px', marginBottom: '40px' }}>Dlaczego GrantFlow?</h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '30px' 
        }}>
          <div style={{ padding: '30px', background: '#f7fafc', borderRadius: '12px' }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>📊</div>
            <h3 style={{ marginBottom: '10px' }}>Kalkulator Budżetu</h3>
            <p style={{ color: '#4a5568' }}>Automatyczna walidacja limitów, obliczanie dofinansowania, kontrola błędów.</p>
          </div>

          <div style={{ padding: '30px', background: '#f7fafc', borderRadius: '12px' }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>👥</div>
            <h3 style={{ marginBottom: '10px' }}>Współpraca Zespołowa</h3>
            <p style={{ color: '#4a5568' }}>Role: owner/admin/editor/viewer. Komentarze, historia zmian, powiadomienia.</p>
          </div>

          <div style={{ padding: '30px', background: '#f7fafc', borderRadius: '12px' }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>🤖</div>
            <h3 style={{ marginBottom: '10px' }}>AI Asystent</h3>
            <p style={{ color: '#4a5568' }}>Generowanie treści, wypełnianie formularzy, analiza szans powodzenia.</p>
          </div>

          <div style={{ padding: '30px', background: '#f7fafc', borderRadius: '12px' }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>📄</div>
            <h3 style={{ marginBottom: '10px' }}>Eksport PDF</h3>
            <p style={{ color: '#4a5568' }}>SF-424, NIH, formularze unijne. Automatyczne wypełnianie.</p>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div style={{ background: '#f7fafc', padding: '60px 20px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '32px', marginBottom: '40px' }}>Co mówią użytkownicy</h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '30px',
          maxWidth: '1000px',
          margin: '0 auto'
        }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#fbbf24', marginBottom: '15px', fontSize: '20px' }}>★★★★★</div>
            <p style={{ marginBottom: '15px', fontStyle: 'italic' }}>"GrantFlow przyspieszył naszą pracę o 60%. Kalkulator budżetu sam wyłapuje błędy, które wcześniej przechodziły niezauważone."</p>
            <strong>— Anna Kowalska, Dyrektor Działu Projektów</strong>
          </div>

          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#fbbf24', marginBottom: '15px', fontSize: '20px' }}>★★★★★</div>
            <p style={{ marginBottom: '15px', fontStyle: 'italic' }}>"Współpraca zespołowa to game-changer. Wszyscy widzą zmiany na żywo, nie tracimy czasu na maile."</p>
            <strong>— Marek Nowak, CEO TechStart</strong>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={{ padding: '60px 20px', maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '32px', marginBottom: '40px' }}>Wybierz plan</h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '30px' 
        }}>
          <div style={{ border: '2px solid #e2e8f0', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
            <h3>Free</h3>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#667eea', margin: '20px 0' }}>
              $0<span style={{ fontSize: '16px', color: '#718096' }}>/mies</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, lineHeight: '2.5' }}>
              <li>✓ 1 wniosek/miesiąc</li>
              <li>✓ Podstawowy kalkulator</li>
              <li>✓ Eksport PDF</li>
            </ul>
            
            <button style={{
              width: '100%',
              padding: '15px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              marginTop: '20px'
            }}>
              Zacznij za darmo
            </button>
          </div>

          <div style={{ 
            border: '2px solid #667eea', 
            borderRadius: '12px', 
            padding: '40px', 
            textAlign: 'center',
            background: '#f5f3ff',
            transform: 'scale(1.05)'
          }}>
            <div style={{ 
              background: '#667eea', 
              color: 'white', 
              display: 'inline-block', 
              padding: '5px 15px', 
              borderRadius: '20px', 
              fontSize: '12px',
              marginBottom: '10px'
            }}>
              NAJPOPULARNIEJSZY
            </div>
            
            <h3>Pro</h3>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#667eea', margin: '20px 0' }}>
              $29<span style={{ fontSize: '16px', color: '#718096' }}>/mies</span>
            </div>
            
            <ul style={{ listStyle: 'none', padding: 0, lineHeight: '2.5' }}>
              <li>✓ Nielimitowane wnioski</li>
              <li>✓ Pełny kalkulator</li>
              <li>✓ Współpraca zespołowa</li>
              <li>✓ AI Asystent</li>
              <li>✓ Priorytetowe wsparcie</li>
            </ul>
            
            <button style={{
              width: '100%',
              padding: '15px',
              background: '#48bb78',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              marginTop: '20px',
              fontWeight: 'bold'
            }}>
              Wybierz Pro
            </button>
          </div>

          <div style={{ border: '2px solid #e2e8f0', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
            <h3>Enterprise</h3>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#667eea', margin: '20px 0' }}>
              Custom</div>
            
            <ul style={{ listStyle: 'none', padding: 0, lineHeight: '2.5' }}>
              <li>✓ Wszystko z Pro</li>
              <li>✓ Dedykowany support</li>
              <li>✓ Integracje API</li>
              <li>✓ Szkolenia dla zespołu</li>
            </ul>
            
            <button style={{
              width: '100%',
              padding: '15px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              marginTop: '20px'
            }}>
              Kontakt
            </button>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{ background: '#1a202c', color: 'white', padding: '60px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '20px' }}>Gotowy przyspieszyć swoje wnioski?</h2>
        
        <p style={{ opacity: 0.8, marginBottom: '30px' }}>Dołącz do 500+ firm, które już korzystają z GrantFlow.</p>
        
        <button style={{
          padding: '18px 40px',
          fontSize: '18px',
          background: '#48bb78',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}>
          Zacznij za darmo →
        </button>
      </div>

      {/* Footer */}
      <footer style={{ background: '#2d3748', color: 'white', padding: '40px 20px', textAlign: 'center' }}>
        <p>© 2026 GrantFlow. System wniosków o dotacje.</p>
      </footer>
    </div>
  );
}