// ========================================
// FF Dashboard - Authentication Module
// ========================================

// ========================================
// USER AUTHENTICATION FUNCTIONS
// ========================================

function showUserRegistrationModal() {
    document.getElementById('userRegistrationModal').classList.remove('hidden');
}

function hideUserRegistrationModal() {
    document.getElementById('userRegistrationModal').classList.add('hidden');
    // Очищаем форму
    document.getElementById('regUsername').value = '';
    document.getElementById('regFullName').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regTelegramId').value = '';
}

async function registerUser() {
    const username = document.getElementById('regUsername').value.trim();
    const fullName = document.getElementById('regFullName').value.trim();
    const password = document.getElementById('regPassword').value;
    const telegramId = document.getElementById('regTelegramId').value.trim();

    if (!username || !fullName || !password) {
        showNotification('Заполните все обязательные поля', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                full_name: fullName,
                password,
                telegram_id: telegramId,
                role: 'manager'
            })
        });

        if (response.ok) {
            const newUser = await response.json();
            users.push(newUser);
            localStorage.setItem('ff-users', JSON.stringify(users));
            
            hideUserRegistrationModal();
            showNotification('Пользователь успешно создан', 'success');
        } else {
            const error = await response.json();
            showNotification(error.message || 'Ошибка создания пользователя', 'error');
        }
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showNotification('Ошибка создания пользователя', 'error');
    }
}

async function loginUser() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        showNotification('Введите логин и пароль', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const userData = await response.json();
            currentUser = userData.user;
            
            // Сохраняем данные пользователя
            localStorage.setItem('ff-current-user', JSON.stringify(currentUser));
            localStorage.setItem('ff-users', JSON.stringify(users));
            
            hideLoginModal();
            updateCurrentUserDisplay();
            showNotification(`Добро пожаловать, ${currentUser.full_name}!`, 'success');
            
            // Загружаем данные после входа
            loadData();
            
            // Показываем кнопку админ настроек для админов
            if (currentUser.role === 'admin') {
                document.getElementById('adminSettingsBtn').style.display = 'block';
            }
            
            // Обновляем UI в зависимости от роли
            if (typeof updateUIForRole === 'function') {
                updateUIForRole();
            }
        } else {
            const error = await response.json();
            showLoginError(error.message || 'Неверный логин или пароль');
        }
    } catch (error) {
        console.error('Ошибка входа:', error);
        showLoginError('Ошибка подключения к серверу');
    }
}

function logoutUser() {
    currentUser = null;
    localStorage.removeItem('ff-current-user');
    
    // Очищаем данные
    leads = [];
    reminders = [];
    users = [];
    
    updateCurrentUserDisplay();
    showNotification('Вы вышли из системы', 'info');
    
    // Показываем модальное окно входа
    document.getElementById('loginModal').classList.remove('hidden');
}

function showLoginError(message) {
    const errorElement = document.getElementById('loginError');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }
}

function hideLoginModal() {
    document.getElementById('loginModal').classList.add('hidden');
    // Очищаем форму
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError').classList.add('hidden');
}

function updateCurrentUserDisplay() {
    const userDisplay = document.getElementById('currentUserDisplay');
    if (userDisplay) {
        if (currentUser) {
            userDisplay.innerHTML = `
                <div class="flex items-center space-x-3">
                    <div class="flex items-center space-x-2">
                        <i data-lucide="user" class="h-5 w-5 text-gray-500 dark:text-gray-400"></i>
                        <span class="text-sm font-medium text-gray-900 dark:text-white">
                            ${currentUser.full_name}
                        </span>
                        ${currentUser.role === 'admin' ? '<span class="ml-2 px-2 py-1 bg-yellow-500 text-xs rounded">Админ</span>' : ''}
                    </div>
                    <button onclick="logoutUser()" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <i data-lucide="log-out" class="h-4 w-4"></i>
                    </button>
                </div>
            `;
        } else {
            userDisplay.innerHTML = `
                <button onclick="document.getElementById('loginModal').classList.remove('hidden')" class="flex items-center space-x-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <i data-lucide="log-in" class="h-4 w-4"></i>
                    <span class="text-sm">Войти</span>
                </button>
            `;
        }
        lucide.createIcons();
    }
}

// ========================================
// EXPORT FOR OTHER MODULES
// ========================================

// Экспортируем функции авторизации для других модулей
window.FFAuth = {
    showUserRegistrationModal,
    hideUserRegistrationModal,
    registerUser,
    loginUser,
    logoutUser,
    showLoginError,
    hideLoginModal,
    updateCurrentUserDisplay
};

// Make functions available globally for onclick attributes
window.login = login;
window.logout = logout;
window.register = register;
window.logoutUser = logoutUser;
window.showLoginError = showLoginError;
window.hideLoginModal = hideLoginModal;
window.updateCurrentUserDisplay = updateCurrentUserDisplay;
