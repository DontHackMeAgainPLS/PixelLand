// src/realtime.js

import { supabase } from './supabase-client.js';
import { world } from './map.js';

export function setupRealtimeChannel() {
    // --- 5. NASŁUCHIWANIE (REALTIME) ---
    supabase
        .channel('game-room')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'Plots' },
            (payload) => {
                console.log('Ktoś zajął działkę!', payload);
                const nowaDzialka = payload.new; 

                // Rysujemy nowy klocek
                const plot = document.createElement('div');
                plot.style.position = 'absolute';

                plot.classList.add('plot');

                plot.style.left = nowaDzialka.x + 'px';
                plot.style.top = nowaDzialka.y + 'px';
                plot.style.width = '50px';
                plot.style.height = '50px';
                plot.style.backgroundColor = nowaDzialka.color;
                plot.style.border = '2px solid #fff'; 
                plot.dataset.owner = nowaDzialka.owner_id;
                
                // Dodajemy do świata gry
                world.appendChild(plot);
            }
        )

        // --- DODAJ OBSŁUGĘ UPDATE (Edycja działki/zdjęcia) ---
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'Plots' },
            (payload) => {
                console.log('Aktualizacja działki!', payload);
                const updatedPlot = payload.new;

                // Znajdź istniejący div działki na mapie
                // Uwaga: Wcześniej musisz dodać plot.dataset.id w database-api.js (patrz wyżej)
                // Jeśli nie masz ID w DOM, możesz szukać po X i Y:
                // const plotDiv = document.querySelector(`.plot[style*="left: ${updatedPlot.x}px"][style*="top: ${updatedPlot.y}px"]`); 
                
                // Ale lepiej dodać ID do elementu. Załóżmy, że dodałeś dataset.id
                // const plotDiv = document.querySelector(`div[data-id="${updatedPlot.id}"]`);
                
                // NAJPROSTSZE ROZWIĄZANIE DLA CIEBIE TERAZ (szukanie po X/Y ręcznie):
                // Ponieważ w database-api.js ustawiasz style inline, szukanie po stringu jest ryzykowne.
                // Sugeruję dodać do divów klasę .plot i atrybuty data-x, data-y przy tworzeniu.
                
                // Wróćmy do najprostszej metody "na szybko": 
                // Usunięcie starego klocka w tym miejscu i narysowanie nowego.
                
                // 1. Znajdź starego diva (to wymaga dodania data-x i data-y przy tworzeniu w database-api.js!)
                const oldPlot = document.querySelector(`div[data-owner="${updatedPlot.owner_id}"]`); 
                // To wyżej jest ryzykowne, bo owner ma wiele działek.
                
                // ZALECENIE: W database-api.js dodaj: plot.dataset.x = dzialka.x; plot.dataset.y = dzialka.y;
                const targetPlot = document.querySelector(`div[data-x="${updatedPlot.x}"][data-y="${updatedPlot.y}"]`);
                
                if (targetPlot) {
                    // Czyścimy zawartość (np. stare img)
                    targetPlot.innerHTML = '';
                    
                    if (updatedPlot.image_url) {
                        const img = document.createElement('img');
                        img.src = updatedPlot.image_url;
                        targetPlot.appendChild(img);
                    } else {
                        targetPlot.style.backgroundColor = updatedPlot.color;
                    }
                }
            }
        )
        .subscribe();
}