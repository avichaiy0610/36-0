let currentUser = null;

async function initAuth() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (session?.user) await onSignIn(session.user);
  else showLoginButton();

  const { data: { subscription: authSubscription } } = _supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) await onSignIn(session.user);
    if (event === 'SIGNED_OUT') onSignOut();
  });

  document.getElementById('nav-login').addEventListener('click', () => {
    document.getElementById('auth-error').style.display = 'none';
    document.getElementById('auth-modal').style.display = 'flex';
  });
  document.getElementById('auth-modal-close').addEventListener('click', () => {
    document.getElementById('auth-modal').style.display = 'none';
  });
  document.getElementById('nav-logout').addEventListener('click', () => _supabase.auth.signOut());

  document.getElementById('auth-google-btn').addEventListener('click', () => {
    _supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/index.html' },
    });
  });

  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('selected'));
      tab.classList.add('selected');
      document.getElementById('auth-login-form').style.display   = tab.dataset.tab === 'login'    ? 'block' : 'none';
      document.getElementById('auth-register-form').style.display = tab.dataset.tab === 'register' ? 'block' : 'none';
      document.getElementById('auth-error').style.display = 'none';
    });
  });

  document.getElementById('auth-submit-login').addEventListener('click', async () => {
    const email    = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const { error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) showAuthError(error.message);
    else document.getElementById('auth-modal').style.display = 'none';
  });

  document.getElementById('auth-submit-register').addEventListener('click', async () => {
    const email    = document.getElementById('auth-reg-email').value.trim();
    const password = document.getElementById('auth-reg-password').value;
    const { data, error } = await _supabase.auth.signUp({ email, password });
    if (error) showAuthError(error.message);
    else if (data.session) {
      document.getElementById('auth-modal').style.display = 'none';
    } else {
      showAuthError('נשלח אימייל אישור — בדוק את תיבת הדואר שלך');
    }
  });

  document.getElementById('username-submit').addEventListener('click', saveUsername);
  document.getElementById('nav-leaderboard').addEventListener('click', () => typeof showLeaderboard === 'function' && showLeaderboard());
  document.getElementById('nav-achievements').addEventListener('click', () => typeof showAchievements === 'function' && showAchievements());
  document.getElementById('nav-leagues')?.addEventListener('click', () => typeof showLeagues === 'function' && showLeagues());
}

async function onSignIn(user) {
  currentUser = user;
  const { data: profile } = await _supabase
    .from('profiles').select('username, avatar_url').eq('id', user.id).single();
  if (!profile?.username) {
    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('username-modal').style.display = 'flex';
  } else {
    updateNavUser(profile.username, profile.avatar_url);
  }
}

function onSignOut() {
  currentUser = null;
  showLoginButton();
}

function showLoginButton() {
  document.getElementById('nav-user').style.display  = 'none';
  document.getElementById('nav-login').style.display = 'inline-flex';
}

function updateNavUser(username, avatarUrl) {
  document.getElementById('nav-user').style.display  = 'flex';
  document.getElementById('nav-login').style.display = 'none';
  document.getElementById('nav-username').textContent = username;
  const avatar = document.getElementById('nav-avatar');
  if (avatarUrl) { avatar.src = avatarUrl; avatar.style.display = 'inline-block'; }
}

async function saveUsername() {
  if (!currentUser) return;
  const username = document.getElementById('username-input').value.trim();
  const errEl    = document.getElementById('username-error');
  if (username.length < 2 || username.length > 20) {
    errEl.textContent = 'שם חייב להכיל בין 2 ל-20 תווים';
    errEl.style.display = 'block';
    return;
  }
  if (/[<>]/.test(username)) {
    errEl.textContent = 'השם מכיל תווים לא חוקיים';
    errEl.style.display = 'block';
    return;
  }
  const { error } = await _supabase.from('profiles').update({ username }).eq('id', currentUser.id);
  if (error) {
    errEl.textContent = error.code === '23505' ? 'שם זה כבר תפוס' : error.message;
    errEl.style.display = 'block';
  } else {
    document.getElementById('username-modal').style.display = 'none';
    updateNavUser(username, null);
  }
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.style.display = 'block';
}

function getCurrentUser() { return currentUser; }

document.addEventListener('DOMContentLoaded', initAuth);
