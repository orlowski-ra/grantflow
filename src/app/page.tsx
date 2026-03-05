import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-900">GrantFlow</h1>
          <div className="space-x-4">
            <Link href="/login" className="text-blue-600 hover:text-blue-800">Zaloguj</Link>
            <Link href="/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Zarejestruj
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Składaj wnioski o dotacje
            <br />
            <span className="text-blue-600">3x szybciej</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Automatyczny system wspierający przygotowanie i składanie wniosków o dotacje unijne i krajowe. 
            Kalkulator budżetu, współpraca zespołowa, AI pomaga wypełniać formularze.
          </p>
          <Link 
            href="/register" 
            className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 inline-block"
          >
            Rozpocznij za darmo →
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Kalkulator Budżetu</h3>
            <p className="text-gray-600">Automatyczna walidacja limitów kosztów, obliczanie dofinansowania, kontrola błędów.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="text-3xl mb-4">👥</div>
            <h3 className="text-xl font-semibold mb-2">Współpraca Zespołowa</h3>
            <p className="text-gray-600">Wielu użytkowników, role uprawnień, komentarze, historia zmian w czasie rzeczywistym.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="text-3xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2">AI Asystent</h3>
            <p className="text-gray-600">Generowanie treści wniosków, wypełnianie formularzy, analiza szans powodzenia.</p>
          </div>
        </div>

        <div className="bg-blue-900 text-white rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-semibold mb-4">Gotowy do wdrożenia</h3>
          <p className="text-blue-200 mb-6">System jest skonfigurowany i działa. Możesz zacząć używać od razu.</p>
          <div className="flex justify-center gap-8 text-sm">
            <div>✓ Kalkulator budżetu</div>
            <div>✓ Współpraca wieloosobowa</div>
            <div>✓ AI generowanie treści</div>
            <div>✓ Eksport PDF</div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-50 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600">
          <p>© 2026 GrantFlow. Automatyzacja wniosków o dotacje.</p>
        </div>
      </footer>
    </div>
  )
}