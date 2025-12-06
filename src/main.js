import './style.css';
import { createClient } from '@supabase/supabase-js';

// --- 1. KONFIGURACJA SUPABASE ---
const PROJECT_URL = 'https://pgzbpdqngwebbfmxovjm.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnemJwZHFuZ3dlYmJmbXhvdmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzI4MjksImV4cCI6MjA4MDYwODgyOX0.g2xYt1g5CXLSa-X7CgXIeRZYScz_99wOzv2uA68PO5Y';

const supabase = createClient(PROJECT_URL, API_KEY);
let currentUser = null; // Tu będziemy trzymać info o zalogowanym

// --- 2. SETUP MAPY (DOM ELEMENTS I ZMIENNE) ---
const world = document.getElementById('game-world');
const coordsDisplay = document.getElementById('coords');
const cursor = document.getElementById('cursor');

let camera = { x: -2500, y: -2500 }; // Start na środku (5000/2)
let isDragging = false;
let startMouse = { x: 0, y: 0 };

function updateView() {
    world.style.transform = `translate(${camera.x}px, ${camera.y}px)`;
}
updateView(); // Wywołaj raz na start

// --- 3. PORUSZANIE (DRAG) ---
document.addEventListener('mousedown', (e) => {
    // Jeśli klikamy w guzik myszy, to nie przesuwaj mapy
    if (e.button !== 0) return;

    isDragging = true;
    startMouse.x = e.clientX - camera.x;
    startMouse.y = e.clientY - camera.y;
    document.body.style.cursor = 'grabbing';
});

document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.style.cursor = 'grab';
});

document.addEventListener('mousemove', (e) => {
    // A. Logika przesuwania mapy
    if (isDragging) {
        let newX = e.clientX - startMouse.x;
        let newY = e.clientY - startMouse.y;

        // Ograniczenia mapy
        if (newX > 0) newX = 0;
        if (newY > 0) newY = 0;
        if (newX < window.innerWidth - 5000) newX = window.innerWidth - 5000;
        if (newY < window.innerHeight - 5000) newY = window.innerHeight - 5000;

        camera.x = newX;
        camera.y = newY;
        updateView();
    }

    // B. Logika Celownika (Snapping)
    cursor.style.display = 'block';
    const worldX = e.clientX - camera.x;
    const worldY = e.clientY - camera.y;

    // Matematyka: zaokrąglanie do 50
    const gridX = Math.floor(worldX / 50) * 50;
    const gridY = Math.floor(worldY / 50) * 50;

    cursor.style.left = gridX + 'px';
    cursor.style.top = gridY + 'px';

    // Zapiszmy aktualne koordynaty do zmiennej globalnej
    cursor.dataset.gx = gridX;
    cursor.dataset.gy = gridY;

    coordsDisplay.innerText = `X: ${gridX / 50}, Y: ${gridY / 50}`;
});

// --- 4. KLIKANIE I ZAPISYWANIE DO BAZY ---
// ... (funkcja checkIsAdmin bez zmian) ...

/**
 * Sprawdza, czy aktualnie zalogowany użytkownik jest na liście Adminów, 
 * wysyłając zapytanie do tabeli 'public.admins'.
 * @returns {Promise<boolean>} True, jeśli znaleziono rekord.
 */
async function checkIsAdmin() { 
    if (!currentUser) return false;

    const { data, error } = await supabase
        .from('admins') // Tabela, którą utworzyłeś
        .select('user_id') 
        .eq('user_id', currentUser.user.id) 
        .single(); 

    // Jeśli błąd to nie jesteś adminem, chyba że to błąd "no rows found" (PGRST116)
    if (error && error.code !== 'PGRST116') { 
        console.error("Błąd zapytania isAdmin:", error);
        return false;
    }

    // Zwraca true, jeśli data jest obiektem (rekordem)
    return !!data; 
}

document.addEventListener('click', async (e) => {
    // 1. OCHRONA UI
    if (e.target.closest('#login-screen') || e.target.closest('#btn-logout')) {
        return;
    }

    // 2. OCHRONA SESJI
    if (!currentUser) {
        console.warn("Nie jesteś zalogowany, nie możesz stawiać klocków!");
        return;
    }

    // 3. OCHRONA DRAG
    if (isDragging) return;

    const gx = parseInt(cursor.dataset.gx);
    const gy = parseInt(cursor.dataset.gy);
    const ownerId = currentUser.user.id; // ID aktualnie zalogowanego

    console.log(`Próba interakcji z działką: (${gx}, ${gy})`);

    // --- A. SPRAWDŹMY, CZY DZIAŁKA JEST JUŻ ZAJĘTA (SELECT) ---
    const { data: existingPlot, error: selectError } = await supabase
        .from('Plots')
        .select('*')
        .eq('x', gx)
        .eq('y', gy)
        .single(); // <--- KLUCZOWY SELECT

    // Obsługa błędu SELECT (PGRST116 = brak wyników jest OK)
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
            console.log('Jesteś Adminem. Zajmuję działkę.');

            const { error: insertError } = await supabase
                .from('Plots')
                .insert([
                    {
                        x: gx,
                        y: gy,
                        owner_id: ownerId,
                        content_type: 'drawing',
                        data_json: '{"w": "Test"}',
                    },
                ]);

            if (insertError) {
                console.error('Błąd zapisu działki przez Admina:', insertError);
                alert('Błąd zapisu! Sprawdź konsolę.');
            } else {
                console.log('Sukces zajęcia działki!');
            }
        } else {
            console.warn('Tylko Admin może zająć wolną działkę!');
            alert('Tylko Admin może stawiać nowe klocki!');
        }
    } else {
        // 2. DZIAŁKA JEST ZAJĘTA (existingPlot ma dane)
        console.log(`Działka zajęta przez: ${existingPlot.owner_id}.`);
        
        if (existingPlot.owner_id === ownerId) {
            // WŁASNA DZIAŁKA: Otwieramy edytor
            alert(`To Twoja działka (${gx/50}, ${gy/50})! Otwieram edytor Piaskownicy.`);
            // TODO: Otwórz panel edytora
        } else {
            // CUDZA DZIAŁKA: Sprawdzamy, czy admin
            const userIsAdmin = await checkIsAdmin();
            
            if (userIsAdmin) {
                // Admin zarządza nie swoją działką
                alert(`Jesteś Adminem. Działka należy do ${existingPlot.owner_id}. Możesz edytować.`);
                // TODO: Otwórz panel edytora Admina
            } else {
                // Brak uprawnień do edycji
                console.warn('Ta działka należy do kogoś innego. Nie możesz edytować.');
                alert('Ta działka jest zajęta. Nie możesz jej edytować.');
            }
        }
    }
});

// Funkcja do pobierania zajętych działek
async function wczytajDzialki() {
    // 1. Pobierz wszystko z tabeli Plots
    const { data, error } = await supabase
        .from('Plots')
        .select('*');

    if (error) {
        console.error('Błąd pobierania:', error);
        return;
    }

    // 2. Jeśli są dane, przejdź przez każdą działkę i ją "namaluj"
    if (data) {
        console.log('Pobrane działki:', data);

        data.forEach(dzialka => {
            console.log("Zajęta działka na pozycji:", dzialka.x, dzialka.y);

            const plot = document.createElement('div');
            plot.style.position = 'absolute';
            plot.style.left = dzialka.x + 'px';
            plot.style.top = dzialka.y + 'px';
            plot.style.width = '50px';
            plot.style.height = '50px';
            plot.style.backgroundColor = dzialka.color;
            plot.style.border = '2px solid #fff'; // <--- ZMIANA: Grubsza ramka
            plot.dataset.owner = dzialka.owner_id; // <--- DODAJ: Owner ID
            world.appendChild(plot);
        });
    }
}

// 3. Wywołaj tę funkcję na starcie
wczytajDzialki();

// --- 5. NASŁUCHIWANIE (REALTIME) ---
// To sprawi, że gra będzie "Multiplayer"
supabase
    .channel('game-room')
    .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Plots' },
        (payload) => {
            console.log('Ktoś zajął działkę!', payload);
            const nowaDzialka = payload.new; // Tu siedzą dane: x, y, color

            // Rysujemy nowy klocek
            const plot = document.createElement('div');
            plot.style.position = 'absolute';
            plot.style.left = nowaDzialka.x + 'px';
            plot.style.top = nowaDzialka.y + 'px';
            plot.style.width = '50px';
            plot.style.height = '50px';
            plot.style.backgroundColor = nowaDzialka.color;
            plot.style.border = '2px solid #fff'; // <--- ZMIANA: Grubsza ramka
            plot.dataset.owner = nowaDzialka.owner_id; // <--- DODAJ: Owner ID
            
            // Dodajemy do świata gry
            world.appendChild(plot);
        }
    )
    .subscribe();

// --- 6. LOGOWANIE I REJESTRACJA ---
const loginScreen = document.getElementById('login-screen');
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const loginBtn = document.getElementById('btn-login');
const signupBtn = document.getElementById('btn-signup');
const msgDisplay = document.getElementById('login-msg');
const logoutBtn = document.getElementById('btn-logout');

// Funkcja rejestracji
signupBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passInput.value;
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) msgDisplay.innerText = "Błąd: " + error.message;
    else msgDisplay.innerText = "Konto założone! Możesz się zalogować.";
});

// Funkcja logowania
loginBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passInput.value;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) msgDisplay.innerText = "Błąd: " + error.message;
    // Jeśli sukces, Supabase sam wywoła zdarzenie zmiany sesji (poniżej)
});

// --- OBSŁUGA KLIKNIĘCIA WYLOGUJ ---
logoutBtn.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Błąd wylogowania:', error);
    // onAuthStateChange poniżej wykryje zmianę
});

// --- 7. STRAŻNIK DOSTĘPU (Zarządzanie sesją) ---
supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session; // WAŻNE: Aktualizujemy zmienną globalną

    if (session) {
        // JESTEŚ ZALOGOWANY
        console.log("Zalogowano jako:", session.user.email);
        loginScreen.style.display = 'none';
        logoutBtn.style.display = 'block';
    } else {
        // NIE JESTEŚ ZALOGOWANY
        loginScreen.style.display = 'flex';
        logoutBtn.style.display = 'none';
        currentUser = null;
    }
});