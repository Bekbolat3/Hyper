const socket = io();

let token = localStorage.getItem('token');
let currentUser = null;

const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const btnLogout = document.getElementById('btn-logout');
const alertBox = document.getElementById('alert');

const postsContainer = document.getElementById('posts');
const btnAddPost = document.getElementById('btn-add-post');
const postContent = document.getElementById('post-content');

const chatWindow = document.getElementById('chat-window');
const chatMessage = document.getElementById('chat-message');
const btnSendChat = document.getElementById('btn-send-chat');

const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const closeModal = document.getElementById('close-modal');
const authForm = document.getElementById('auth-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const btnSubmit = document.getElementById('btn-submit');

function showAlert(message, type = 'info') {
  alertBox.textContent = message;
  alertBox.className = type;
  setTimeout(() => alertBox.textContent = '', 3000);
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
closeModal.onclick = () => modal.classList.add('hidden');

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
        localStorage.setItem('token', token);
        currentUser = data.user;
        showAlert('Регистрация успешна', 'success');
        modal.classList.add('hidden');
        updateAuthUI();
      } else {
        showAlert(data.message || 'Ошибка регистрации', 'error');
      }
    });
  });
}

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
        localStorage.setItem('token', token);
        currentUser = data.user;
        showAlert('Вход успешен', 'success');
        modal.classList.add('hidden');
        updateAuthUI();
      } else {
        showAlert(data.message || 'Ошибка входа', 'error');
      }
    });
  });
}

btnLogout.onclick = () => {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  updateAuthUI();
  showAlert('Вы вышли', 'info');
}

function updateAuthUI() {
  if (token) {
    btnLogin.classList.add('hidden');
    btnRegister.classList.add('hidden');
    btnLogout.classList.remove('hidden');
  } else {
    btnLogin.classList.remove('hidden');
    btnRegister.classList.remove('hidden');
    btnLogout.classList.add('hidden');
  }
}
updateAuthUI();

function fetchPosts() {
  fetch('/api/posts', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(res => res.json())
  .then(data => {
    postsContainer.innerHTML = '';
    data.posts.forEach(post => {
      const div = document.createElement('div');
      div.className = 'post';
      div.innerHTML = `<strong>${post.username}</strong>: ${post.content}<br><small>${new Date(post.created_at).toLocaleString()}</small>`;
      postsContainer.appendChild(div);
    });
  });
}
fetchPosts();

btnAddPost.onclick = () => {
  const content = postContent.value.trim();
  if (!content) return;
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
      fetchPosts();
      showAlert('Пост добавлен', 'success');
    } else {
      showAlert(data.message || 'Ошибка', 'error');
    }
  });
}

socket.on('connect', () => {
  console.log('Подключение к чату установлено');
});

socket.on('chat message', (msg) => {
  const p = document.createElement('p');
  p.className = 'message';
  p.innerHTML = `<strong>${msg.username}:</strong> ${msg.message}`;
  chatWindow.appendChild(p);
  chatWindow.scrollTop = chatWindow.scrollHeight;
});

btnSendChat.onclick = () => {
  const message = chatMessage.value.trim();
  if (!message) return;
  socket.emit('chat message', { token, message });
  chatMessage.value = '';
}
