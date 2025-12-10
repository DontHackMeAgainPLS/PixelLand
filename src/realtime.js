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

                plot.classList.add('plot');

                plot.style.left = nowaDzialka.x + 'px';
                plot.style.top = nowaDzialka.y + 'px';
                plot.style.width = '50px';
                plot.style.height = '50px';
                
                plot.dataset.id = nowaDzialka.id;

                plot.dataset.owner = nowaDzialka.owner_id;
                
                if (nowaDzialka.image_url) {
                    const img = document.createElement('img');
                    img.src = nowaDzialka.image_url;
                    plot.appendChild(img);
                } else {
                    plot.style.backgroundColor = nowaDzialka.color || '#333';
                }
                
                plot.style.border = '2px solid #fff';
                
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

               
                // To wyżej jest ryzykowne, bo owner ma wiele działek.
                
                // ZALECENIE: W database-api.js dodaj: plot.dataset.x = dzialka.x; plot.dataset.y = dzialka.y;
                const targetPlot = document.querySelector(`.plot[data-id="${updatedPlot.id}"]`);
                
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
                else{
                    console.warn("Przyszła aktualizacja, ale nie widzę tego klocka na mapie:", updatedPlot.id);
                }
            }
        )
        .subscribe();
}