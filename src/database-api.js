// src/database-api.js

import { supabase, currentUser } from './supabase-client.js';
import { world, cursor } from './map.js'; // Potrzebujemy world do rysowania, cursor do danych
import { openEditor } from './editor-ui.js';

/**
 * Sprawdza, czy aktualnie zalogowany użytkownik jest Adminem.
 * Wymaga dostępu do aktualnej sesji (currentUser).
 * @returns {Promise<boolean>}
 */
export async function checkIsAdmin() { 
    if (!currentUser) return false;

    const { data, error } = await supabase
        .from('admins')
        .select('user_id') 
        .eq('user_id', currentUser.user.id) 
        .single(); 

    if (error && error.code !== 'PGRST116') { 
        console.error("Błąd zapytania isAdmin:", error);
        return false;
    }

    return !!data; 
}

// Funkcja do pobierania zajętych działek i ich rysowania
export async function wczytajDzialki() {
    const { data, error } = await supabase
        .from('Plots')
        .select('*');

    if (error) {
        console.error('Błąd pobierania:', error);
        return;
    }

    if (data) {
        data.forEach(dzialka => {
            const plot = document.createElement('div');
            plot.style.position = 'absolute';
            plot.style.left = dzialka.x + 'px';
            plot.style.top = dzialka.y + 'px';
            plot.style.width = '50px';
            plot.style.height = '50px';
            plot.style.backgroundColor = dzialka.color;
            plot.style.border = '2px solid #fff'; 
            plot.dataset.owner = dzialka.owner_id;
            world.appendChild(plot);
        });
    }
}

// --- NOWA FUNKCJA: Rysowanie "Ducha" ---
// To jest czysta manipulacja DOM. Tworzymy div, nadajemy style i wrzucamy na mapę.
function rysujDucha(x, y) {
    // Sprawdzamy, czy duch już tu nie stoi (żeby nie dublować przy odświeżaniu)
    const selector = `.ghost-plot[data-x="${x}"][data-y="${y}"]`;
    if (document.querySelector(selector)) return;

    const ghost = document.createElement('div');
    ghost.classList.add('ghost-plot'); // Klasa dla łatwiejszego stylowania/usuwania
    ghost.style.position = 'absolute';
    ghost.style.left = x + 'px';
    ghost.style.top = y + 'px';
    ghost.style.width = '50px';
    ghost.style.height = '50px';
    ghost.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; // Przezroczyste tło
    ghost.style.border = '2px dashed #ffff00'; // Żółta przerywana linia (🚧)
    ghost.style.pointerEvents = 'none'; // Żeby myszka klikała "przez" niego w podłogę
    
    // Zapisujemy koordynaty w HTML, żeby łatwo je znaleźć
    ghost.dataset.x = x;
    ghost.dataset.y = y;
    
    // Dodajemy ikonkę (opcjonalne)
    ghost.innerText = "⏳";
    ghost.style.display = "flex";
    ghost.style.alignItems = "center";
    ghost.style.justifyContent = "center";

    world.appendChild(ghost);
}

// --- NOWA FUNKCJA: Pobieranie moich zgłoszeń ---
export async function wczytajMojeRequesty() {
    // Jak nie jesteś zalogowany, to nie ma czego szukać
    if (!currentUser) return;

    const isAdmin = await checkIsAdmin();

    let query = supabase
        .from('plots_request')
        .select('x, y');

    if (!isAdmin) {
        query = query.eq('user_id', currentUser.user.id);
    }

    const {data, error} = await query;
    //const { data, error } = await supabase
    //    .from('plots_request') // Pamiętaj: małe litery nazwy tabeli
    //    .select('x, y') // Pobieramy tylko X i Y, reszta nas nie obchodzi do rysowania
    //    .eq('user_id', currentUser.user.id); // Tylko MOJE



    if (error) {
        console.error("Błąd wczytywania requestów:", error);
        return;
    }

    if (data) {
        console.log(`Przywracam ${data.length} oczekujących próśb.`);
        // Dla każdego wyniku z bazy -> rysujemy ducha
        data.forEach(req => {
            rysujDucha(req.x, req.y);
        });
    }
}

/** * Centralna funkcja obsługująca kliknięcie na działkę.
 * Wywoływana z main.js
 */
export async function handlePlotClick(gx, gy) {
    // 2. OCHRONA SESJI (Powtórzona dla pewności, choć main.js też to sprawdza)
    if (!currentUser) return; 
    
    const ownerId = currentUser.user.id; 

    console.log(`Próba interakcji z działką: (${gx}, ${gy})`);

    // --- A. SPRAWDŹMY, CZY DZIAŁKA JEST JUŻ ZAJĘTA (SELECT) ---
    const { data: existingPlot, error: selectError } = await supabase
        .from('Plots')
        .select('*')
        .eq('x', gx)
        .eq('y', gy)
        .maybeSingle(); 

    if (selectError && selectError.code !== 'PGRST116') {
        console.error('Błąd zapytania SELECT:', selectError);
        alert('Błąd! Sprawdź konsolę.');
        return;
    }
    
    // --- B. LOGIKA: WOLNA DZIAŁKA vs ZAJĘTA DZIAŁKA ---
    if (!existingPlot) {
        // 1. DZIAŁKA JEST WOLNA
        console.log('Działka jest wolna. Sprawdzam uprawnienia...');
        
        const userIsAdmin = await checkIsAdmin();
        
        if (userIsAdmin) {
            // Admin zajmuje wolną działkę (INSERT)
            const { error: insertError } = await supabase
                .from('Plots')
                .insert([{ x: gx, y: gy, owner_id: ownerId, content_type: 'drawing', data_json: '{"w": "Test"}', }]);

            if (insertError) {
                console.error('Błąd zapisu działki przez Admina:', insertError);
                alert('Błąd zapisu! Sprawdź konsolę.');
            } else {
                console.log('Sukces zajęcia działki!');
            }
        } else {
            
            // --- LOGIKA WOLNEJ DZIAŁKI (Tworzenie prośby) ---

    // 3. Sprawdzamy LIMIT (Max 4 prośby na gracza)
    const { count, error: countError } = await supabase
        .from('plots_request')
        .select('*', { count: 'exact', head: true }) // head: true = nie pobieraj danych, tylko policz
        .eq('user_id', currentUser.user.id);

    if (count >= 4) {
        alert("Masz już 4 aktywne prośby! Poczekaj na Admina.");
        return;
    }

    // 4. Przygotowanie danych (Wyciągamy NICK z metadanych)
    // Jak nicku nie ma (stare konto), dajemy fallback "Gracz"
    const myNick = currentUser.user.user_metadata?.username || 'Gracz';

    // 5. WYSYŁKA DO BAZY
    const { error: insertError } = await supabase
        .from('plots_request')
        .insert([
            { 
                x: gx, 
                y: gy, 
                user_id: currentUser.user.id,
                username: myNick 
            }
        ]);

    // 6. Obsługa wyników
    if (insertError) {
        // Kod 23505 to błąd unikalności (Unique Constraint) w Postgresie
        if (insertError.code === '23505') {
            alert("Już zgłosiłeś chęć na tę działkę!");
        } else {
            console.error("Błąd zapisu:", insertError);
            alert("Błąd systemu.");
        }
    } else {
        // SUKCES!
        console.log("Request wysłany!");
        rysujDucha(gx, gy); // Natychmiastowy feedback wizualny
    }

    }
    } else {
        // 2. DZIAŁKA JEST ZAJĘTA
        console.log(`Działka zajęta przez: ${existingPlot.owner_id}.`);
        
        if (existingPlot.owner_id === ownerId) {
            alert(`To Twoja działka (${gx/50}, ${gy/50})! Otwieram edytor Piaskownicy.`);
            openEditor(existingPlot, true);
        } else {
            const userIsAdmin = await checkIsAdmin();
            
            if (userIsAdmin) {
                alert(`Jesteś Adminem. Działka należy do ${existingPlot.owner_id}. Możesz edytować.`);
                openEditor(existingPlot, true);
            } else {
                console.warn('Ta działka należy do kogoś innego. Nie możesz edytować.');
                alert('Ta działka jest zajęta. Nie możesz jej edytować.');
            }
        }
    }


}

//Realtime: 

export function setupGhostRealtime() {
    supabase.channel('ghost-plots-channel')
    .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'plots_request' },
        (payload) => {
            const req = payload.new;
            rysujDucha(req.x, req.y);
        }
    )
    .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'plots_request' },
        (payload) => {
            const req = payload.old;
            const selector = `.ghost-plot[data-x="${req.x}"][data-y="${req.y}"]`;
            const el = document.querySelector(selector);
            if (el) el.remove(); // -> duch znika od razu
        }
    )
    .subscribe();
}