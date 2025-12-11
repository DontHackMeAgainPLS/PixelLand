// src/map.js

// --- 2. SETUP MAPY (DOM ELEMENTS I ZMIENNE) ---
export const world = document.getElementById('game-world');
const coordsDisplay = document.getElementById('coords');
export const cursor = document.getElementById('cursor');

export let camera = { x: -2500, y: -2500, zoom: 1 };
export let isDragging = false;
let startMouse = { x: 0, y: 0 };
let startCamera = { x: 0, y: 0 };

// Dynamiczna siatka: linia ma grubość 1/camera.zoom px w przestrzeni świata,
// co po transformacji scale daje ~1px na ekranie.
function updateGridAppearance() {
    const gridSize = 50;                 // rozmiar kratki w przestrzeni świata
    const lineThickness = 1 / camera.zoom; // grubość linii w przestrzeni świata

    world.style.backgroundImage = `
    linear-gradient(to right, #333 ${lineThickness}px, transparent ${lineThickness}px),
    linear-gradient(to bottom, #333 ${lineThickness}px, transparent ${lineThickness}px)
  `;
    world.style.backgroundSize = `${gridSize}px ${gridSize}px`;
}

export function updateView() {
    world.style.transform = `
    translate(${camera.x}px, ${camera.y}px)
    scale(${camera.zoom})`;
    world.style.transformOrigin = '0 0';

    updateGridAppearance();
}

export function setupMapInteractions() {
    updateView(); // Wywołaj raz na start

    // --- 3. PORUSZANIE (DRAG) ---
    document.addEventListener('mousedown', (e) => {
        if (e.button !== 2) return;

        isDragging = true;
        startMouse.x = e.clientX;
        startMouse.y = e.clientY;
        startCamera = { ...camera };
        document.body.style.cursor = 'grabbing';
    });

    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    document.addEventListener('mouseup', (e) => {
        if (e.button !== 2) return;
        isDragging = false;
        document.body.style.cursor = 'grab';
    });

    document.addEventListener('mousemove', (e) => {
        // A. Logika przesuwania mapy
        if (isDragging) {
            const dx = e.clientX - startMouse.x;
            const dy = e.clientY - startMouse.y;

            camera.x = startCamera.x + dx / camera.zoom;
            camera.y = startCamera.y + dy / camera.zoom;

            updateView();
        }

        // B. Logika Celownika (Snapping)
        cursor.style.display = 'block';

        const rect = world.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;

        let worldX = localX / camera.zoom;
        let worldY = localY / camera.zoom;

        // Precyzyjne dopasowanie do siatki 50px
        let gridX = Math.round(worldX / 50) * 50;
        let gridY = Math.round(worldY / 50) * 50;

        // Twarde granice: 0..4950
        const min = 0;
        const max = 5000 - 50;
        gridX = Math.max(min, Math.min(max, gridX));
        gridY = Math.max(min, Math.min(max, gridY));

        cursor.style.left = gridX + 'px';
        cursor.style.top = gridY + 'px';
        cursor.dataset.gx = gridX;
        cursor.dataset.gy = gridY;

        coordsDisplay.innerText = `X: ${gridX / 50}, Y: ${gridY / 50}`;
    });

    document.addEventListener('wheel', (e) => {
        e.preventDefault();

        const zoomStep = 0.1;
        const minZoom = 0.5;
        const maxZoom = 2;

        const rect = world.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;

        const worldX = localX / camera.zoom;
        const worldY = localY / camera.zoom;

        let newZoom = camera.zoom + (e.deltaY < 0 ? zoomStep : -zoomStep);
        newZoom = Math.min(maxZoom, Math.max(minZoom, newZoom));

        camera.x = localX - worldX * newZoom;
        camera.y = localY - worldY * newZoom;

        camera.zoom = newZoom;
        updateView();
    }, { passive: false });
}