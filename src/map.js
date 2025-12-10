// src/map.js

// --- 2. SETUP MAPY (DOM ELEMENTS I ZMIENNE) ---
export const world = document.getElementById('game-world');
const coordsDisplay = document.getElementById('coords');
export const cursor = document.getElementById('cursor');

export let camera = { x: -2500, y: -2500, zoom: 1 }; 
export let isDragging = false;
let startMouse = { x: 0, y: 0 };

let startCamera = { x: 0, y: 0 };


export function updateView() {
    world.style.transform = `
    translate(${camera.x}px, ${camera.y}px)
    scale(${camera.zoom})`;

    world.style.transformOrigin = '0 0'; 
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
  
            // delta w pikselach na ekranie
            const dx = e.clientX - startMouse.x;
            const dy = e.clientY - startMouse.y;


            // przeliczamy na świat uwzględniając zoom
            camera.x = startCamera.x + dx / camera.zoom;
            camera.y = startCamera.y + dy / camera.zoom;


            updateView();
        }
        

        // B. Logika Celownika (Snapping)
        cursor.style.display = 'block';
        const worldX = (e.clientX - camera.x) / camera.zoom;
        const worldY = (e.clientY - camera.y) / camera.zoom;

        // Matematyka: zaokrąglanie do 50
        const gridX = Math.floor(worldX / 50) * 50;
        const gridY = Math.floor(worldY / 50) * 50;

        cursor.style.left = gridX + 'px';
        cursor.style.top = gridY + 'px';
        cursor.dataset.gx = gridX;
        cursor.dataset.gy = gridY;

        // Zapiszmy aktualne koordynaty do zmiennej globalnej
        cursor.dataset.gx = gridX;
        cursor.dataset.gy = gridY;

        coordsDisplay.innerText = `X: ${gridX / 50}, Y: ${gridY / 50}`;
    });
 
    document.addEventListener('wheel', (e) => {
    e.preventDefault();

    const zoomStep = 0.1;
    const minZoom = 0.5;
    const maxZoom = 2;

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // współrzędne świata pod kursorem
    const worldX = (mouseX - camera.x) / camera.zoom;
    const worldY = (mouseY - camera.y) / camera.zoom;

    // Ustal nowy zoom
    let newZoom = camera.zoom + (e.deltaY < 0 ? zoomStep : -zoomStep);
    newZoom = Math.min(maxZoom, Math.max(minZoom, newZoom));

    // przesuwamy mapę, żeby punkt pod kursorem pozostał w tym samym miejscu
    camera.x = mouseX - worldX * newZoom;
    camera.y = mouseY - worldY * newZoom;

    // Obliczamy, żeby zoom był wokół kursora
    const rect = world.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    camera.zoom = newZoom;
    updateView();
}, {passive: false});
}