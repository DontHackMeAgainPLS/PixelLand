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
        .single(); 

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
            console.warn('Tylko Admin może zająć wolną działkę!');
            alert('Tylko Admin może stawiać nowe klocki!');
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

