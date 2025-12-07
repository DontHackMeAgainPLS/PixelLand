// src/map.js

// --- 2. SETUP MAPY (DOM ELEMENTS I ZMIENNE) ---
export const world = document.getElementById('game-world');
const coordsDisplay = document.getElementById('coords');
export const cursor = document.getElementById('cursor');

export let camera = { x: -2500, y: -2500 }; 
export let isDragging = false;
let startMouse = { x: 0, y: 0 };

export function updateView() {
    world.style.transform = `translate(${camera.x}px, ${camera.y}px)`;
}

export function setupMapInteractions() {
    updateView(); // Wywołaj raz na start

    // --- 3. PORUSZANIE (DRAG) ---
    document.addEventListener('mousedown', (e) => {
        if (e.button !== 2) return;

        isDragging = true;
        startMouse.x = e.clientX - camera.x;
        startMouse.y = e.clientY - camera.y;
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
}