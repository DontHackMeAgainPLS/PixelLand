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
        .subscribe();
}