# RAPORT ZMIAN - GrantFlow

## Data: 2026-03-05
## Wykonane zmiany:

---

## 1. Budget Calculator (Kalkulator Budżetu)

**Lokalizacja:** `src/components/budget/BudgetCalculator.tsx`

**Funkcjonalności:**
- ✅ Dodawanie/usuwanie pozycji budżetowych
- ✅ Kategorie kosztów (personel, wyposażenie, usługi, materiały, podróże, promocja, administracja, inne)
- ✅ Walidacja limitów kategorii (np. personel max 60% budżetu)
- ✅ Automatyczne obliczanie kosztów kwalifikowalnych
- ✅ Podgląd stopy dofinansowania w czasie rzeczywistym
- ✅ Walidacja minimalnej/maksymalnej wartości projektu
- ✅ Podsumowanie: całkowity koszt, dofinansowanie, wkład własny
- ✅ Wymagane pola i walidacja

**Walidacje:**
- Minimalna wartość projektu: 50,000 PLN
- Maksymalna wartość projektu: 5,000,000 PLN
- Maksymalna stopa dofinansowania: 85%
- Limity kategorii (np. personel max 60%, podróże max 10%)

---

## 2. Multi-User Collaboration System (System Współpracy)

**Lokalizacja:** `src/lib/collaboration/CollaborationService.ts`

**Funkcjonalności:**
- ✅ Role użytkowników: owner, admin, editor, viewer
- ✅ Uprawnienia per rola (view, edit, comment, invite, delete, submit, manage_permissions)
- ✅ Zapraszanie współpracowników (z tokenem rejestracyjnym)
- ✅ Blokowanie sekcji do edycji (optimistic locking)
- ✅ Historia zmian (edit history)
- ✅ Komentarze do sekcji/pól
- ✅ Powiadomienia dla współpracowników
- ✅ Log aktywności

**Uprawnienia per rola:**
- **Owner:** Wszystkie uprawnienia
- **Admin:** View, edit, comment, invite, delete, submit
- **Editor:** View, edit, comment
- **Viewer:** View, comment

---

## 3. Aktualizacja Schematu Prisma

**Nowe modele:**
- `Collaborator` - Współpracownicy wniosku
- `Invitation` - Zaproszenia do współpracy
- `Comment` - Komentarze do sekcji
- `CommentReply` - Odpowiedzi na komentarze
- `EditHistory` - Historia zmian
- `Notification` - Powiadomienia systemowe

**Zaktualizowane relacje:**
- User: + collaborators, comments, commentReplies, editHistory, notifications
- Order: + collaborators, invitations, comments, editHistory

---

## Następne kroki (rekomendowane):

1. **Migracja bazy danych:**
   ```bash
   npx prisma migrate dev --name add_collaboration
   ```

2. **Instalacja zależności:**
   ```bash
   npm install @vercel/kv ws
   ```

3. **Implementacja WebSocket server** dla real-time updates

4. **Komponenty UI:**
   - Lista współpracowników
   - Panel komentarzy
   - Historia zmian
   - Zarządzanie uprawnieniami

5. **API Routes:**
   - `/api/orders/[id]/collaborators`
   - `/api/orders/[id]/comments`
   - `/api/orders/[id]/history`

---

## Pozostałe zadania z raportów:

- [ ] PDF parser dla SF-424 (US federal grants)
- [ ] NIH compliance checklist
- [ ] Grants.gov API integration
- [ ] Panel administracyjny (admin dashboard)
- [ ] Webhooki Stripe do obsługi płatności

---

**Status:** Gotowe do testowania i dalszej implementacji
