// src/editor-ui.js

// Importy Supabase będą potrzebne do logiki uploadu/aktualizacji
import { supabase, currentUser } from './supabase-client.js';

// Utwórz ten element w index.html lub dodaj go dynamicznie
const editorPanel = document.getElementById('editor-panel'); 
const uploadInput = document.getElementById('upload-input');
const uploadButton = document.getElementById('upload-button');
const closeButton = document.getElementById('close-editor-btn');

// Funkcja blokująca kliknięcia w tle
function stopEventPropagation(e) {
    // Zapobiega propagacji zdarzenia do elementów leżących pod panelem (np. mapy)
    e.stopPropagation(); 
}

/**
 * Otwiera panel edytora i ustawia jego stan.
 * @param {object} plotData - Dane aktualnie klikniętej działki
 * @param {boolean} canEdit - Czy użytkownik ma uprawnienia do edycji
 */
export function openEditor(plotData, canEdit) {
    if (!editorPanel) {
        console.error('Brak elementu #editor-panel!');
        return;
    }
    
    /// Zamiast ustawiania stylu inline, dodaj klasę:
    editorPanel.classList.add('editor-active'); 
    
    editorPanel.dataset.plotId = plotData.id; 
    editorPanel.dataset.canEdit = canEdit;
    
    // Włącz/wyłącz elementy
    uploadInput.disabled = !canEdit;
    uploadButton.disabled = !canEdit;

    
    
    // Wyświetl dane działki, np. współrzędne, obecne zdjęcie itp.
    // ...


}

function closeEditor() {
    if (editorPanel) {
        // Zamiast ustawiania stylu inline, usuń klasę:
        editorPanel.classList.remove('editor-active'); 
    }
}

// Funkcja uploadu pliku do Supabase Storage
async function handleImageUpload() {
    if (!editorPanel.dataset.canEdit === 'true') {
        alert("Nie masz uprawnień do edycji tej działki.");
        return;
    }
    
    const file = uploadInput.files[0];
    if (!file) return alert('Wybierz plik.');

    // Lokalizacja w Supabase Storage: bucket/ownerId/plotId.jpg
    const plotId = editorPanel.dataset.plotId;
    const bucket = 'plots_images'; // Nazwa Twojego bucketu
    const path = `${currentUser.user.id}/${plotId}_${Date.now()}.jpg`; 
    
    // Upload do Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
            cacheControl: '3600',
            upsert: false // Jeśli chcesz, aby nadpisywało, zmień na true
        });

    if (uploadError) {
        console.error('Błąd uploadu:', uploadError);
        alert('Błąd podczas przesyłania pliku!');
        return;
    }
    
    // KROK 2: Po udanym uploadzie, ZAKTUALIZUJ rekord w tabeli 'Plots'
    const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

    const { error: updateError } = await supabase
        .from('Plots')
        .update({ image_url: publicUrl }) // Zakładam, że masz kolumnę image_url
        .eq('id', plotId);
        
    if (updateError) {
         console.error('Błąd aktualizacji URL w bazie:', updateError);
         alert('Zdjęcie wgrane, ale błąd zapisu w bazie danych!');
         return;
    }

    alert('Zdjęcie wgrane i zapisane!');
    closeEditor(); // Zamknij panel po sukcesie
    // TODO: Odśwież widok działki na mapie
}


// Inicjalizacja nasłuchu
export function setupEditor() {
    if (uploadButton) uploadButton.addEventListener('click', handleImageUpload);
    
    // 1. Zamykanie Edytora
    if (closeButton) {
        closeButton.addEventListener('click', closeEditor); 
    }
    
    // 2. BLOKOWANIE KLIKNIĘĆ W TŁO (MAPĘ)
    if (editorPanel) {
        // Wszystkie kliknięcia wewnątrz panelu edytora zostaną zatrzymane tutaj.
        editorPanel.addEventListener('click', stopEventPropagation); 
    }
    
    // Opcjonalnie: Zamykanie na klawisz ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && editorPanel.classList.contains('editor-active')) {
            closeEditor();
        }
    });
}



