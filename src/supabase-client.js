// src/supabase-client.js
import { createClient } from '@supabase/supabase-js';

// --- 1. KONFIGURACJA SUPABASE ---
const PROJECT_URL = 'https://pgzbpdqngwebbfmxovjm.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnemJwZHFuZ3dlYmJmbXhvdmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzI4MjksImV4cCI6MjA4MDYwODgyOX0.g2xYt1g5CXLSa-X7CgXIeRZYScz_99wOzv2uA68PO5Y';

export const supabase = createClient(PROJECT_URL, API_KEY);
export let currentUser = null; // Tu będziemy trzymać info o zalogowanym

// Funkcja pomocnicza do aktualizacji currentUser z auth.js
export function setCurrentUser(session) {
    currentUser = session;
}