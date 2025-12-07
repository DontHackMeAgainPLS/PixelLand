// src/plot-rendering.js
import { world } from './map.js';

/**
 * Renderuje pojedynczy plot w mapie
 * @param {object} plotData - obiekt z danymi działki (id, coords, image_url)
 */
export function renderPlot(plotData) {
    // Tworzymy div plotu
    const plotDiv = document.createElement('div');
    plotDiv.classList.add('plot');
    plotDiv.dataset.plotId = plotData.id;

    // Ustawiamy pozycję w świecie (grid co 50px)
    const x = plotData.x * 50;
    const y = plotData.y * 50;
    plotDiv.style.left = `${x}px`;
    plotDiv.style.top = `${y}px`;

    // Tworzymy obrazek
    const img = document.createElement('img');
    img.src = plotData.image_url || ''; // jeśli brak zdjęcia → pusty
    plotDiv.appendChild(img);

    // Dodajemy do świata
    world.appendChild(plotDiv);
}

/**
 * Renderuje wszystkie działki z listy
 * @param {Array} plotsArray - tablica obiektów plotData
 */
export function renderAllPlots(plotsArray) {
    // Czyścimy aktualną mapę (opcjonalnie)
    world.innerHTML = '';

    plotsArray.forEach(plotData => {
        renderPlot(plotData);
    });
}

/**
 * Szuka istniejącej działki na mapie po ID i aktualizuje jej obrazek.
 * @param {string} plotId - ID działki (pobrane z editorPanel.dataset.plotId)
 * @param {string} newImageUrl - Nowy publiczny URL obrazka z Supabase Storage
 */
export function refreshPlotImage(plotId, newImageUrl) {
    // 1. Używamy selektora, aby znaleźć element DIV z klasą 'plot'
    //    i atrybutem data-plot-id równym naszemu plotId.
    const plotElement = world.querySelector(`.plot[data-plot-id="${plotId}"]`);
    
    if (plotElement) {
        // 2. Jeśli działka jest na mapie, szukamy w niej elementu IMG.
        const imgElement = plotElement.querySelector('img');
        
        if (imgElement) {
            // 3. Zaktualizuj atrybut src. Przeglądarka automatycznie wczyta nowy obrazek.
            imgElement.src = newImageUrl;
            console.log(`Działka ${plotId} odświeżona nowym obrazkiem.`);
        } else {
            // Warto też obsłużyć przypadek, gdyby <img /> jakimś cudem zaginął
            const newImg = document.createElement('img');
            newImg.src = newImageUrl;
            plotElement.appendChild(newImg);
        }
    }
}