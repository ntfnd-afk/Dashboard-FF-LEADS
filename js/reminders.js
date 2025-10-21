// ========================================
// FF Dashboard - Reminders Module
// ========================================

// ========================================
// REMINDERS MANAGEMENT FUNCTIONS
// ========================================

function showAddReminderModal() {
    document.getElementById('addReminderModal').classList.remove('hidden');
}

function hideAddReminderModal() {
    document.getElementById('addReminderModal').classList.add('hidden');
    // Очищаем форму
    document.getElementById('reminderText').value = '';
    document.getElementById('reminderDate').value = '';
    document.getElementById('reminderTime').value = '';
}

async function addReminder() {
    const text = document.getElementById('reminderText').value.trim();
    const date = document.getElementById('reminderDate').value;
    const time = document.getElementById('reminderTime').value;

    if (!text || !date || !time) {
        showNotification('Заполните все поля', 'error');
        return;
    }

    // Создаем дату в локальном времени пользователя
    const reminderDateTime = new Date(`${date}T${time}`);
    const now = new Date();
    
    if (reminderDateTime <= now) {
        showNotification('Время напоминания должно быть в будущем', 'error');
        return;
    }

    // Вычисляем время до напоминания в миллисекундах
    const timeUntilReminder = reminderDateTime.getTime() - now.getTime();

    try {
        // Проверяем доступность API
        let apiAvailable = false;
        if (isOnline) {
            try {
                // Простая проверка доступности API через HEAD запрос
                const testResponse = await fetch(`${API_BASE_URL}/reminders`, {
                    method: 'HEAD',
                    timeout: 3000
                });
                apiAvailable = testResponse.status < 500; // Если не 5xx ошибка, то API доступен
                console.log(`API статус: ${testResponse.status}, доступен: ${apiAvailable}`);
            } catch (error) {
                console.log('API недоступен, переходим в офлайн режим:', error);
                apiAvailable = false;
            }
        }

        // Создаем напоминание с локальным временем
        const newReminder = {
            id: Date.now(),
            text: text,
            datetime: reminderDateTime.toISOString(), // Сохраняем в UTC для API
            localDateTime: reminderDateTime.getTime(), // Сохраняем локальное время для планирования
            user_id: currentUser ? currentUser.id : null,
            completed: false
        };

        console.log('Создаем напоминание:', newReminder);

        // Всегда сохраняем в localStorage для надежности
        reminders.push(newReminder);
        localStorage.setItem('ff-reminders', JSON.stringify(reminders));
        console.log('Напоминание сохранено в localStorage, всего напоминаний:', reminders.length);

        // Если API доступен, также сохраняем на сервере
        if (apiAvailable) {
            try {
                const response = await fetch(`${API_BASE_URL}/reminders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newReminder)
                });

                if (response.ok) {
                    const serverReminder = await response.json();
                    // Обновляем ID с сервера
                    newReminder.id = serverReminder.id;
                    // Обновляем в массиве и localStorage
                    const index = reminders.findIndex(r => r.id === Date.now());
                    if (index !== -1) {
                        reminders[index] = newReminder;
                        localStorage.setItem('ff-reminders', JSON.stringify(reminders));
                    }
                    showNotification('Напоминание добавлено', 'success');
                } else {
                    showNotification('Напоминание добавлено (локально)', 'success');
                }
            } catch (error) {
                console.log('Ошибка синхронизации с сервером:', error);
                showNotification('Напоминание добавлено (локально)', 'success');
            }
        } else {
            showNotification('Напоминание добавлено (офлайн)', 'success');
        }

        // Обновляем UI и планируем уведомление
        console.log('Обновляем UI...');
        hideAddReminderModal();
        updateRemindersList();
        updateGlobalRemindersList();
        scheduleReminderNotification(newReminder);
        console.log('UI обновлен, напоминание запланировано');
    } catch (error) {
        console.error('Ошибка добавления напоминания:', error);
        showNotification('Ошибка добавления напоминания', 'error');
    }
}

function addReminderForLead(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    // Предзаполняем текст напоминания
    document.getElementById('reminderText').value = `Связаться с ${lead.clientName || lead.name}`;
    
    showAddReminderModal();
}

async function completeReminder(reminderId) {
    try {
        // Проверяем доступность API
        let apiAvailable = false;
        if (isOnline) {
            try {
                // Простая проверка доступности API через HEAD запрос
                const testResponse = await fetch(`${API_BASE_URL}/reminders`, {
                    method: 'HEAD',
                    timeout: 3000
                });
                apiAvailable = testResponse.status < 500; // Если не 5xx ошибка, то API доступен
            } catch (error) {
                console.log('API недоступен, переходим в офлайн режим');
                apiAvailable = false;
            }
        }

        if (apiAvailable) {
            const response = await fetch(`${API_BASE_URL}/reminders/${reminderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: true })
            });

            if (response.ok) {
                const reminder = reminders.find(r => r.id === reminderId);
                if (reminder) {
                    reminder.completed = true;
                }
                
                localStorage.setItem('ff-reminders', JSON.stringify(reminders));
                updateRemindersList();
                updateGlobalRemindersList();
                
                showNotification('Напоминание выполнено', 'success');
            } else {
                throw new Error('Ошибка обновления напоминания');
            }
        } else {
            // Офлайн режим - обновляем в localStorage
            const reminder = reminders.find(r => r.id === reminderId);
            if (reminder) {
                reminder.completed = true;
            }
            
            localStorage.setItem('ff-reminders', JSON.stringify(reminders));
            updateRemindersList();
            updateGlobalRemindersList();
            
            showNotification('Напоминание выполнено (офлайн)', 'success');
        }
    } catch (error) {
        console.error('Ошибка выполнения напоминания:', error);
        showNotification('Ошибка выполнения напоминания', 'error');
    }
}

async function deleteReminder(reminderId) {
    if (!confirm('Вы уверены, что хотите удалить это напоминание?')) return;

    try {
        // Проверяем доступность API
        let apiAvailable = false;
        if (isOnline) {
            try {
                // Простая проверка доступности API через HEAD запрос
                const testResponse = await fetch(`${API_BASE_URL}/reminders`, {
                    method: 'HEAD',
                    timeout: 3000
                });
                apiAvailable = testResponse.status < 500; // Если не 5xx ошибка, то API доступен
            } catch (error) {
                console.log('API недоступен, переходим в офлайн режим');
                apiAvailable = false;
            }
        }

        if (apiAvailable) {
            const response = await fetch(`${API_BASE_URL}/reminders/${reminderId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                reminders = reminders.filter(r => r.id !== reminderId);
                localStorage.setItem('ff-reminders', JSON.stringify(reminders));
                updateRemindersList();
                updateGlobalRemindersList();
                
                showNotification('Напоминание удалено', 'success');
            } else {
                throw new Error('Ошибка удаления напоминания');
            }
        } else {
            // Офлайн режим - удаляем из localStorage
            reminders = reminders.filter(r => r.id !== reminderId);
            localStorage.setItem('ff-reminders', JSON.stringify(reminders));
            updateRemindersList();
            updateGlobalRemindersList();
            
            showNotification('Напоминание удалено (офлайн)', 'success');
        }
    } catch (error) {
        console.error('Ошибка удаления напоминания:', error);
        showNotification('Ошибка удаления напоминания', 'error');
    }
}

function updateRemindersList() {
    const remindersList = document.getElementById('remindersList');
    if (!remindersList) return;

    const activeReminders = reminders.filter(r => !r.completed);
    
    if (activeReminders.length === 0) {
        remindersList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-sm text-center py-4">Нет активных напоминаний</p>';
        return;
    }

    remindersList.innerHTML = activeReminders.map(reminder => {
        // Используем локальное время для отображения
        const reminderDate = reminder.localDateTime ? new Date(reminder.localDateTime) : new Date(reminder.datetime);
        const now = new Date();
        const isOverdue = reminderDate < now;
        
        return `
            <div class="flex items-center justify-between p-3 bg-white dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-500 ${isOverdue ? 'border-red-300 dark:border-red-600' : ''}">
                <div class="flex-1">
                    <div class="text-sm font-medium text-gray-900 dark:text-white">${reminder.text}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 ${isOverdue ? 'text-red-500 dark:text-red-400' : ''}">
                        ${reminderDate.toLocaleString('ru-RU', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit' 
                        })} ${isOverdue ? '(Просрочено)' : ''}
                    </div>
                </div>
                <div class="flex space-x-2">
                    <button onclick="completeReminder(${reminder.id})" class="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300" title="Выполнено">
                        <i data-lucide="check" class="h-4 w-4"></i>
                    </button>
                    <button onclick="deleteReminder(${reminder.id})" class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300" title="Удалить">
                        <i data-lucide="trash-2" class="h-4 w-4"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

function updateGlobalRemindersList() {
    // Обновляем боковую панель
    const globalRemindersList = document.getElementById('globalRemindersList');
    if (!globalRemindersList) {
        console.log('Элемент globalRemindersList не найден');
    }

    // Обновляем канбан
    const kanbanRemindersList = document.getElementById('reminders-list');
    if (!kanbanRemindersList) {
        console.log('Элемент reminders-list не найден');
    }

    const activeReminders = reminders.filter(r => !r.completed);
    console.log('Активные напоминания:', activeReminders.length);
    
    const upcomingReminders = activeReminders
        .filter(r => new Date(r.datetime) <= new Date(Date.now() + 24 * 60 * 60 * 1000)) // Следующие 24 часа
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
        .slice(0, 5);
    
    console.log('Предстоящие напоминания:', upcomingReminders.length);

    if (upcomingReminders.length === 0) {
        console.log('Нет предстоящих напоминаний, показываем пустое сообщение');
        const emptyMessage = '<p class="text-gray-500 dark:text-gray-400 text-sm text-center py-4">Нет предстоящих напоминаний</p>';
        
        if (globalRemindersList) {
            globalRemindersList.innerHTML = emptyMessage;
        }
        if (kanbanRemindersList) {
            kanbanRemindersList.innerHTML = emptyMessage;
        }
        return;
    }

    console.log('Отображаем предстоящие напоминания:', upcomingReminders);
    const htmlContent = upcomingReminders.map(reminder => {
        // Используем локальное время для отображения
        const reminderDate = reminder.localDateTime ? new Date(reminder.localDateTime) : new Date(reminder.datetime);
        const now = new Date();
        const isOverdue = reminderDate < now;
        
        return `
            <div class="flex items-center justify-between p-2 bg-white dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-500 ${isOverdue ? 'border-red-300 dark:border-red-600' : ''}">
                <div class="flex-1">
                    <div class="text-xs font-medium text-gray-900 dark:text-white truncate">${reminder.text}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 ${isOverdue ? 'text-red-500 dark:text-red-400' : ''}">
                        ${reminderDate.toLocaleString('ru-RU', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit' 
                        })} ${isOverdue ? '(Просрочено)' : ''}
                    </div>
                </div>
                <div class="flex space-x-1">
                    <button onclick="completeReminder(${reminder.id})" class="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300" title="Выполнено">
                        <i data-lucide="check" class="h-3 w-3"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    console.log('HTML контент для отображения:', htmlContent);
    
    // Обновляем боковую панель
    if (globalRemindersList) {
        globalRemindersList.innerHTML = htmlContent;
        console.log('HTML вставлен в элемент globalRemindersList');
    }
    
    // Обновляем канбан
    if (kanbanRemindersList) {
        kanbanRemindersList.innerHTML = htmlContent;
        console.log('HTML вставлен в элемент reminders-list');
    }

    lucide.createIcons();
    
    // Отладка после обновления
    setTimeout(() => {
        console.log('=== ПОСЛЕ ОБНОВЛЕНИЯ UI ===');
        console.log('Содержимое globalRemindersList:', document.getElementById('globalRemindersList')?.innerHTML);
        console.log('==========================');
    }, 100);
}

// Функция для отладки напоминаний
function debugReminders() {
    console.log('=== ОТЛАДКА НАПОМИНАНИЙ ===');
    console.log('Всего напоминаний:', reminders.length);
    console.log('Активные напоминания:', reminders.filter(r => !r.completed).length);
    
    const globalElement = document.getElementById('globalRemindersList');
    const kanbanElement = document.getElementById('reminders-list');
    
    console.log('Элемент globalRemindersList (боковая панель):', globalElement);
    console.log('Содержимое globalRemindersList:', globalElement?.innerHTML);
    
    console.log('Элемент reminders-list (канбан):', kanbanElement);
    console.log('Содержимое reminders-list:', kanbanElement?.innerHTML);
    console.log('========================');
}

// Добавляем функцию в глобальную область
window.debugReminders = debugReminders;

function scheduleReminderNotification(reminder) {
    // Используем локальное время для планирования
    const reminderTime = reminder.localDateTime ? new Date(reminder.localDateTime) : new Date(reminder.datetime);
    const now = new Date();
    
    if (reminderTime <= now) return;

    const timeUntilReminder = reminderTime.getTime() - now.getTime();
    
    console.log(`Планируем уведомление на ${reminderTime.toLocaleString('ru-RU')} (через ${Math.round(timeUntilReminder / 1000 / 60)} минут)`);
    
    setTimeout(() => {
        showBrowserNotification(reminder.text);
        sendTelegramNotification(reminder.text);
    }, timeUntilReminder);
}

function showBrowserNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Напоминание', {
            body: message,
            icon: '/favicon.ico'
        });
    }
}

async function sendTelegramNotification(message) {
    console.log('Отправляем Telegram уведомление:', message);
    console.log('Настройки Telegram:', globalTelegramSettings);
    
    if (!globalTelegramSettings.botToken) {
        console.log('Bot token не настроен');
        return;
    }

    try {
        const telegramMessage = `🔔 Напоминание: ${message}`;
        let url = `https://api.telegram.org/bot${globalTelegramSettings.botToken}/sendMessage`;
        
        let chatId = globalTelegramSettings.chatId;
        if (globalTelegramSettings.chatType === 'group') {
            chatId = globalTelegramSettings.groupId;
        }

        const payload = {
            chat_id: chatId,
            text: telegramMessage
        };

        // Добавляем тег пользователя для групповых чатов
        if (globalTelegramSettings.chatType === 'group' && globalTelegramSettings.userId) {
            payload.text += `\n\n@${globalTelegramSettings.userId}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error('Ошибка отправки Telegram уведомления');
        }
    } catch (error) {
        console.error('Ошибка отправки Telegram уведомления:', error);
    }
}

// ========================================
// NOTIFICATION SETTINGS FUNCTIONS
// ========================================

function showNotificationSettings() {
    document.getElementById('notificationSettingsModal').classList.remove('hidden');
    loadNotificationSettings();
}

function hideNotificationSettings() {
    document.getElementById('notificationSettingsModal').classList.add('hidden');
}

function loadNotificationSettings() {
    // Загружаем текущие настройки
    document.getElementById('telegramBotToken').value = globalTelegramSettings.botToken || '';
    document.getElementById('telegramChatType').value = globalTelegramSettings.chatType || 'personal';
    document.getElementById('telegramChatId').value = globalTelegramSettings.chatId || '';
    document.getElementById('telegramGroupId').value = globalTelegramSettings.groupId || '';
    document.getElementById('telegramUserId').value = globalTelegramSettings.userId || '';
    
    updateNotificationStatus();
}

async function saveNotificationSettings() {
    const botToken = document.getElementById('telegramBotToken').value.trim();
    const chatType = document.getElementById('telegramChatType').value;
    const chatId = document.getElementById('telegramChatId').value.trim();
    const groupId = document.getElementById('telegramGroupId').value.trim();
    const userId = document.getElementById('telegramUserId').value.trim();

    globalTelegramSettings = {
        botToken,
        chatType,
        chatId,
        groupId,
        userId
    };

    try {
        if (isOnline) {
            const response = await fetch(`${API_BASE_URL}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'telegram_settings',
                    value: JSON.stringify(globalTelegramSettings)
                })
            });
            
            if (!response.ok) {
                throw new Error('Ошибка сохранения настроек Telegram');
            }
        }
        
        localStorage.setItem('ff-global-telegram-settings', JSON.stringify(globalTelegramSettings));
        hideNotificationSettings();
        showNotification('Настройки уведомлений сохранены', 'success');
        
    } catch (error) {
        console.error('Ошибка сохранения настроек:', error);
        showNotification('Ошибка сохранения настроек', 'error');
    }
}

async function testTelegramConnection() {
    const botToken = document.getElementById('telegramBotToken').value.trim();
    const chatType = document.getElementById('telegramChatType').value;
    const chatId = document.getElementById('telegramChatId').value.trim();
    const groupId = document.getElementById('telegramGroupId').value.trim();

    if (!botToken) {
        showNotification('Введите токен бота', 'error');
        return;
    }

    try {
        let testChatId = chatId;
        if (chatType === 'group') {
            testChatId = groupId;
        }

        if (!testChatId) {
            showNotification('Введите ID чата', 'error');
            return;
        }

        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: testChatId,
                text: '🧪 Тестовое сообщение от FF Dashboard'
            })
        });

        if (response.ok) {
            showNotification('Тестовое сообщение отправлено успешно!', 'success');
        } else {
            const error = await response.json();
            showNotification(`Ошибка: ${error.description}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка тестирования Telegram:', error);
        showNotification('Ошибка подключения к Telegram', 'error');
    }
}

function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            updateNotificationStatus();
            if (permission === 'granted') {
                showNotification('Уведомления разрешены', 'success');
            } else {
                showNotification('Уведомления заблокированы', 'warning');
            }
        });
    }
}

function updateNotificationStatus() {
    const statusElement = document.getElementById('notificationStatus');
    if (!statusElement) return;

    if ('Notification' in window) {
        switch (Notification.permission) {
            case 'granted':
                statusElement.innerHTML = '<span class="text-green-600 dark:text-green-400">✅ Разрешены</span>';
                break;
            case 'denied':
                statusElement.innerHTML = '<span class="text-red-600 dark:text-red-400">❌ Заблокированы</span>';
                break;
            default:
                statusElement.innerHTML = '<span class="text-yellow-600 dark:text-yellow-400">⚠️ Не запрошены</span>';
        }
    } else {
        statusElement.innerHTML = '<span class="text-gray-600 dark:text-gray-400">❌ Не поддерживаются</span>';
    }
}

// ========================================
// EXPORT FOR OTHER MODULES
// ========================================

// Экспортируем функции напоминаний для других модулей
window.FFReminders = {
    showAddReminderModal,
    hideAddReminderModal,
    addReminder,
    addReminderForLead,
    completeReminder,
    deleteReminder,
    updateRemindersList,
    updateGlobalRemindersList,
    scheduleReminderNotification,
    showBrowserNotification,
    sendTelegramNotification,
    showNotificationSettings,
    hideNotificationSettings,
    loadNotificationSettings,
    saveNotificationSettings,
    testTelegramConnection,
    requestNotificationPermission,
    updateNotificationStatus
};
