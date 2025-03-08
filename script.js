const socket = io();

const btnHome = document.getElementById('btn-home');
const btnProfile = document.getElementById('btn-profile');
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const btnLogout = document.getElementById('btn-logout');
const notification = document.getElementById('notification');

const contentHome = document.getElementById('content-home');
const contentChat = document.getElementById('content-chat');
const contentProfile = document.getElementById('content-profile');

const newPostText = document.getElementById('post-content');
const btnAddPost = document.getElementById('btn-add-post');
const postsContainer = document.getElementById('posts');

const chatWindow = document.getElementById('chat-window');
const chatMessage = document.getElementById('chat-message');
const btnSendChat = document.getElementById('btn-send-chat');

const profileInfo = document.getElementById('profile-info');
const btnRefreshProfile = document.getElementById('btn-refresh-profile');

const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const closeModal = document.getElementById('close-modal');
const authForm = document.getElementById('auth-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const btnSubmit = document.getElementById('btn-submit');

let token = localStorage.getItem('token') || null;
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

function showNotification(message, type = 'info') {
  notification.textContent = message;
  notification.className = 'notification ' + type;
  setTimeout(() => notification.textContent = '', 4000);
}

function openModal(title, submitText, callback) {
  modalTitle.textContent = title;
  btnSubmit.textContent = submitText;
  modal.classList.remove('hidden');
  authForm.onsubmit = (e) => {
    e.preventDefault();
    callback(usernameInput.value, passwordInput.value);
  }
}

if (closeModal) {
  closeModal.onclick = () => modal.classList.add('hidden');
}

btnHome.onclick = () => {
  contentHome.classList.remove('hidden');
  contentChat.classList.add('hidden');
  contentProfile.classList.add('hidden');
};

btnProfile.onclick = () => {
  contentHome.classList.add('hidden');
  contentChat.classList.add('hidden');
  contentProfile.classList.remove('hidden');
  loadProfile();
};

btnRegister.onclick = () => {
  openModal('Регистрация', 'Зарегистрироваться', (username, password) => {
    fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
      if (data.token) {
        token = data.token;
        currentUser = data.user;
        localStorage.setItem('token', token);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showNotification('Регистрация успешна!', 'success');
        modal.classList.add('hidden');
        updateAuthUI();
        loadPosts();
      } else {
        showNotification(data.message || 'Ошибка регистрации', 'error');
      }
    })
    .catch(() => showNotification('Ошибка запроса', 'error'));
  });
};

btnLogin.onclick = () => {
  openModal('Вход', 'Войти', (username, password) => {
    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
      if (data.token) {
        token = data.token;
        currentUser = data.user;
        localStorage.setItem('token', token);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showNotification('Вход выполнен успешно!', 'success');
        modal.classList.add('hidden');
        updateAuthUI();
        loadPosts();
      } else {
        showNotification(data.message || 'Ошибка входа', 'error');
      }
    })
    .catch(() => showNotification('Ошибка запроса', 'error'));
  });
};

btnLogout.onclick = () => {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  updateAuthUI();
  showNotification('Вы вышли из системы', 'info');
};

function updateAuthUI() {
  if (token) {
    btnLogin.classList.add('hidden');
    btnRegister.classList.add('hidden');
    btnLogout.classList.remove('hidden');
    btnProfile.classList.remove('hidden');
  } else {
    btnLogin.classList.remove('hidden');
    btnRegister.classList.remove('hidden');
    btnLogout.classList.add('hidden');
    btnProfile.classList.add('hidden');
  }
}
updateAuthUI();

function loadPosts() {
  fetch('/api/posts', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(res => res.json())
  .then(data => {
    postsContainer.innerHTML = '';
    if (data.posts) {
      data.posts.forEach(post => {
        const div = document.createElement('div');
        div.className = 'post';
        div.innerHTML = `<strong>${post.username}</strong>: ${post.content}<br><small>${new Date(post.created_at).toLocaleString()}</small>`;
        postsContainer.appendChild(div);
      });
    }
  })
  .catch(() => showNotification('Ошибка загрузки постов', 'error'));
}
if (token) loadPosts();

btnAddPost.onclick = () => {
  const content = newPostText.value.trim();
  if (!content) {
    showNotification('Пожалуйста, введите текст поста', 'error');
    return;
  }
  fetch('/api/posts', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ content })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      newPostText.value = '';
      loadPosts();
      showNotification('Пост успешно добавлен!', 'success');
    } else {
      showNotification(data.message || 'Ошибка добавления поста', 'error');
    }
  })
  .catch(() => showNotification('Ошибка запроса', 'error'));
};

socket.on('connect', () => {
  console.log('Подключение к чату установлено');
});

socket.on('chat message', (msg) => {
  const p = document.createElement('p');
  p.innerHTML = `<strong>${msg.username}:</strong> ${msg.message}`;
  chatWindow.appendChild(p);
  chatWindow.scrollTop = chatWindow.scrollHeight;
});

btnSendChat.onclick = () => {
  const message = chatMessage.value.trim();
  if (!message) return;
  socket.emit('chat message', { token, message });
  chatMessage.value = '';
};

function loadProfile() {
  fetch('/api/profile', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(res => res.json())
  .then(data => {
    if (data.user) {
      profileInfo.innerHTML = `<p><strong>ID:</strong> ${data.user.id}</p>
                               <p><strong>Имя:</strong> ${data.user.username}</p>
                               <p><strong>Дата регистрации:</strong> ${new Date(data.user.created_at).toLocaleString()}</p>`;
    } else {
      profileInfo.innerHTML = '<p>Ошибка загрузки профиля</p>';
    }
  })
  .catch(() => profileInfo.innerHTML = '<p>Ошибка запроса профиля</p>');
}
btnRefreshProfile.onclick = loadProfile;
