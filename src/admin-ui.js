// src/admin-ui.js
import { supabase } from './supabase-client.js';
import { checkIsAdmin } from './database-api.js';

const adminPanel = document.getElementById('admin-panel');
const listContainer = document.getElementById('requests-list');

// --- 1. FUNKCJA STARTOWA (Wywoływana po zalogowaniu) ---
export async function setupAdminPanel() {
    const isAdmin = await checkIsAdmin();
    
    if (!isAdmin) {
        console.log("Nie jesteś adminem. Ukrywam panel.");
        adminPanel.style.display = 'none';
        return;
    }

    // Jesteś adminem -> Pokaż panel i załaduj dane
    console.log("Witaj Adminie! Ładuję panel.");
    adminPanel.style.display = 'block';
    
    // A. Pobierz obecne requesty (na start)
    fetchRequests();

    // B. Odpal Realtime (nasłuchiwanie nowych zgłoszeń)
    setupAdminRealtime();
}

// --- 2. POBIERANIE DANYCH Z BAZY ---
async function fetchRequests() {
    // Czyścimy listę przed narysowaniem
    listContainer.innerHTML = '';

    const { data, error } = await supabase
        .from('plots_request')
        .select('*')
        .order('created_at', { ascending: true }); // Najstarsze na górze

    if (error) console.error("Błąd pobierania requestów:", error);

    if (data) {
        data.forEach(req => {
            stworzElementListy(req);
        });
    }
}

// --- 3. RYSOWANIE POJEDYNCZEGO ELEMENTU LISTY ---
function stworzElementListy(req) {
    // Sprawdź czy już go nie ma (żeby Realtime nie dublował)
    if (document.getElementById(`req-${req.id}`)) return;

    const item = document.createElement('div');
    item.id = `req-${req.id}`;
    item.style.background = '#333';
    item.style.padding = '10px';
    item.style.borderRadius = '5px';
    item.style.border = '1px solid #555';

    item.innerHTML = `
        <div style="font-weight: bold; color: #ffd700;">${req.username || 'Nieznany'}</div>
        <div style="font-size: 0.9em; color: #ccc;">Kratka: (${req.x}, ${req.y})</div>
        <div style="margin-top: 5px; display: flex; gap: 5px;">
            <button class="btn-accept" style="background: green; color: white; border: none; padding: 5px 10px; cursor: pointer;">✔</button>
            <button class="btn-reject" style="background: red; color: white; border: none; padding: 5px 10px; cursor: pointer;">✘</button>
        </div>
    `;

    // Obsługa guzików
    const btnAccept = item.querySelector('.btn-accept');
    const btnReject = item.querySelector('.btn-reject');

    btnAccept.onclick = () => zatwierdzRequest(req);
    btnReject.onclick = () => odrzucRequest(req.id);

    listContainer.appendChild(item);
}

// --- 4. AKCJA: ZATWIERDŹ (Insert do Plots -> Delete z Request) ---
async function zatwierdzRequest(req) {
    if (!confirm(`Zatwierdzić działkę dla ${req.username}?`)) return;

    // A. Wstawiamy do oficjalnej tabeli Plots
    const { error: insertError } = await supabase
        .from('Plots')
        .insert([{
            x: req.x,
            y: req.y,
            owner_id: req.user_id, 
            content_type: 'land'
        }]);

    if (insertError) {
        console.error("Błąd zatwierdzania:", insertError);
        alert("Błąd! Może działka już zajęta?");
        return;
    }

    // B. Jeśli się udało -> Usuwamy z listy oczekujących
    await odrzucRequest(req.id, false); // false = bez pytania confirm
    alert("Zatwierdzono!");
}

// --- 5. AKCJA: ODRZUĆ (Delete z Request) ---
async function odrzucRequest(id, ask = true) {
    if (ask && !confirm("Na pewno odrzucić?")) return;

    const { error } = await supabase
        .from('plots_request')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("Błąd usuwania:", error);
    } else {
        // Usuń z widoku HTML
        const el = document.getElementById(`req-${id}`);
        if (el) el.remove();
    }
}

// --- 6. REALTIME DLA ADMINA ---
function setupAdminRealtime() {
    supabase.channel('admin-channel')
    .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'plots_request' },
        (payload) => {
            console.log("Nowy request!", payload);
            stworzElementListy(payload.new);
        }
    )
    .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'plots_request' },
        (payload) => {
            // Jak ktoś usunie (albo my sami), usuń z listy
            const el = document.getElementById(`req-${payload.old.id}`);
            if (el) el.remove();
        }
    )
    .subscribe();
}

adminPanel.addEventListener('click', (e) => {
    e.stopPropagation();   // blokuje kliknięcia „przechodzące” dalej
});