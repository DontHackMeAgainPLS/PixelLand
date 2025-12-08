// src/auth.js

import { supabase, setCurrentUser } from './supabase-client.js';

// --- 6. LOGOWANIE I REJESTRACJA (Elementy UI) ---
const loginScreen = document.getElementById('login-screen');
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const usernameInput = document.getElementById('username');
const loginBtn = document.getElementById('btn-login');
const signupBtn = document.getElementById('btn-signup');
const msgDisplay = document.getElementById('login-msg');
const logoutBtn = document.getElementById('btn-logout');


export function setupAuth() {
    // Funkcja rejestracji
    signupBtn.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passInput.value;
        const username = usernameInput.value;

        const { error } = await supabase.auth.signUp({
             email, 
             password,
             options: {
                data: {
                    username: username
                }
             } 
            });

        if (!username || username.length < 3) {
            msgDisplay.innerText = "Podaj nick (min. 3 znaki)!";
            msgDisplay.style.color = "red";
        return;}
        
        if (error) {
            msgDisplay.innerText = "Błąd: " + error.message;
            msgDisplay.style.color = "red";
        }
        else {
            msgDisplay.innerText = "Konto założone! Możesz się zalogować.";
            msgDisplay.style.color = "lime";
        }

        // Czyścimy formularz
        emailInput.value = '';
        passInput.value = '';
        usernameInput.value = '';
        });

    // Funkcja logowania
    loginBtn.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passInput.value;
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) msgDisplay.innerText = "Błąd: " + error.message;
    });

    // --- OBSŁUGA KLIKNIĘCIA WYLOGUJ ---
    logoutBtn.addEventListener('click', async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Błąd wylogowania:', error);
    });

    // --- 7. STRAŻNIK DOSTĘPU (Zarządzanie sesją) ---
    supabase.auth.onAuthStateChange((event, session) => {
        // WAŻNE: Aktualizujemy zmienną w supabase-client.js
        setCurrentUser(session); 

        if (session) {
            // JESTEŚ ZALOGOWANY
            console.log("Zalogowano jako:", session.user.email);
            loginScreen.style.display = 'none';
            logoutBtn.style.display = 'block';
        } else {
            // NIE JESTEŚ ZALOGOWANY
            loginScreen.style.display = 'flex';
            logoutBtn.style.display = 'none';
        }
    });
}