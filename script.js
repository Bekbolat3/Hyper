const socket = io();

const btnHome = document.getElementById('btn-home');
const btnChat = document.getElementById('btn-chat');
const btnProfile = document.getElementById('btn-profile');
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const btnLogout = document.getElementById('btn-logout');
const notificationDiv = document.getElementById('notification');

const contentHome = document.getElementById('content-home');
const contentChat = document.getElementById('content-chat');
const contentProfile = document.getElementById('content-profile');

const postContent = document.getElementById('post-content');
const btnAddPost = document.getElementById('btn-add-post');
const postsContainer = document.getElementById('posts');

const chatWindow = document.getElementById('chat-window');
const chatMessage = document.getElementById('chat-message');
const btnSendChat = document.getElementById('btn-send-chat');

const profileInfo = document.getElementById('profile-info');
const btnRefreshProfile = document.getElementById('btn-refresh-profile');

const authModal = new bootstrap.Modal(document.getElementById('authModal'));
const modalTitle = document.getElementById('modal-title');
const authForm = document.getElementById('auth-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const btnSubmit = document.getElementById('btn-submit');

let token = localStorage.getItem('token') || null;
let currentUser = localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')) : null;

function showNotification(message, type = 'info') {
  notificationDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  setTimeout(() => { notificationDiv.innerHTML = ''; }, 4000);
}

function switchSection(section) {
  contentHome.classList.add('d-none');
  contentChat.classList.add('d-none');
  contentProfile.classList.add('d-none');
  section.classList.remove('d-none');
}

btnHome.onclick = () => { switchSection(contentHome); loadPosts(); };
btnChat.onclick = () => { switchSection(contentChat); };
btnProfile.onclick = () => { switchSection(contentProfile); loadProfile(); };

function openAuthModal(title, submitText, callback) {
  modalTitle.textContent = title;
  btnSubmit.textContent = submitText;
  authForm.onsubmit = (e) => {
    e.preventDefault();
    callback(usernameInput.value, passwordInput.value);
  };
  authModal.show();
}

btnRegister.onclick = () => {
  openAuthModal('Регистрация', 'Зарегистрироваться', (username, password) => {
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
        authModal.hide();
        updateAuthUI();
        loadPosts();
      } else {
        showNotification(data.message || 'Ошибка регистрации', 'danger');
      }
    })
    .catch(() => showNotification('Ошибка запроса регистрации', 'danger'));
  });
};

btnLogin.onclick = () => {
  openAuthModal('Вход', 'Войти', (username, password) => {
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
        authModal.hide();
        updateAuthUI();
        loadPosts();
      } else {
        showNotification(data.message || 'Ошибка входа', 'danger');
      }
    })
    .catch(() => showNotification('Ошибка запроса входа', 'danger'));
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
    btnLogin.classList.add('d-none');
    btnRegister.classList.add('d-none');
    btnLogout.classList.remove('d-none');
    btnProfile.classList.remove('d-none');
  } else {
    btnLogin.classList.remove('d-none');
    btnRegister.classList.remove('d-none');
    btnLogout.classList.add('d-none');
    btnProfile.classList.add('d-none');
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
    if (data.posts && Array.isArray(data.posts)) {
      data.posts.forEach(post => {
        const item = document.createElement('div');
        item.className = 'list-group-item';
        item.innerHTML = `<strong>${post.username}</strong>: ${post.content}<br><small>${new Date(post.created_at).toLocaleString()}</small>`;
        postsContainer.appendChild(item);
      });
    }
  })
  .catch(() => showNotification('Ошибка загрузки постов', 'danger'));
}
if (token) loadPosts();

btnAddPost.onclick = () => {
  const content = postContent.value.trim();
  if (!content) {
    showNotification('Введите текст поста', 'danger');
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
      postContent.value = '';
      loadPosts();
      showNotification('Пост успешно добавлен!', 'success');
    } else {
      showNotification(data.message || 'Ошибка добавления поста', 'danger');
    }
  })
  .catch(() => showNotification('Ошибка запроса', 'danger'));
};

socket.on('connect', () => {
  console.log('Подключение к чату установлено');
});
socket.on('chat message', (msg) => {
  const messageElem = document.createElement('p');
  messageElem.innerHTML = `<strong>${msg.username}:</strong> ${msg.message}`;
  chatWindow.appendChild(messageElem);
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
