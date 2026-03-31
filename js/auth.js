// ============================================
// Autenticación con Supabase
// ============================================

async function login(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

async function getSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session;
}

async function requireAuth() {
    const session = await getSession();
    if (!session) {
        window.location.href = 'index.html';
        return null;
    }
    return session;
}

async function redirectIfLoggedIn() {
    const session = await getSession();
    if (session) {
        window.location.href = 'app.html';
    }
}
