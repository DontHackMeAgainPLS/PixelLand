// src/main.js

import './style.css';
import { currentUser } from './supabase-client.js'; 
import { setupAuth } from './auth.js';
import { setupMapInteractions, isDragging } from './map.js';
import { wczytajDzialki, handlePlotClick, wczytajMojeRequesty } from './database-api.js';
import { setupRealtimeChannel } from './realtime.js';
import { setupEditor } from './editor-ui.js';

// --- INICJALIZACJA ---

// 1. Inicjalizacja autoryzacji
setupAuth();

// 2. Inicjalizacja mapy i interakcji myszy
setupMapInteractions();

// 3. Wczytanie początkowych danych
wczytajDzialki();

setTimeout(() => {
   wczytajMojeRequesty();
}, 1000);

// 4. Uruchomienie nasłuchu Realtime
setupRealtimeChannel();

// 5. Globalna obsługa kliknięcia (przeniesiona część z dawnego bloku 4)
document.addEventListener('click', async (e) => {

    //żeby PPM nie klikał mapy.
    if (e.button === 2) return;

    
    //OCHRONA EDYTORA
     if (e.target.closest('#editor-panel')) {
        return;
    }


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

    // Pobranie koordynatów kursora
    const cursor = document.getElementById('cursor'); 
    const gx = parseInt(cursor.dataset.gx);
    const gy = parseInt(cursor.dataset.gy);

    // Całą logikę biznesową przekazujemy do database-api.js
    await handlePlotClick(gx, gy);
});

//6. Inicjalizacja edytora

window.addEventListener('DOMContentLoaded', () => {
    setupEditor();
});
