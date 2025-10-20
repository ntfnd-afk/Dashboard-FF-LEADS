# 🔄 Обновление фронтенда для работы с API

## 📋 Изменения в index.html

### 1. Добавление конфигурации API

**Добавить в начало скрипта (после глобальных переменных):**
```javascript
// API Configuration
const API_BASE_URL = 'http://51.250.97.39:3001/api';
let isOnline = navigator.onLine;

// Проверка подключения
window.addEventListener('online', () => {
    isOnline = true;
    console.log('🌐 Подключение восстановлено');
});

window.addEventListener('offline', () => {
    isOnline = false;
    console.log('❌ Подключение потеряно');
});
```

### 2. Замена функций работы с лидами

**Заменить функцию `saveData()`:**
```javascript
// Data management
async function saveData() {
    if (!isOnline) {
        console.log('📱 Офлайн режим - данные сохранены локально');
        localStorage.setItem('ff-price-database', JSON.stringify(priceDatabase));
        localStorage.setItem('ff-calculation-items', JSON.stringify(calculationItems));
        localStorage.setItem('ff-client-name', document.getElementById('clientName').value);
        localStorage.setItem('ff-markup', document.getElementById('markup').value);
        localStorage.setItem('ff-comments', document.getElementById('comments').value);
        return;
    }

    try {
        // Сохраняем прайс в БД
        for (const price of priceDatabase) {
            await fetch(`${API_BASE_URL}/prices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(price)
            });
        }

        // Сохраняем локальные данные
        localStorage.setItem('ff-calculation-items', JSON.stringify(calculationItems));
        localStorage.setItem('ff-client-name', document.getElementById('clientName').value);
        localStorage.setItem('ff-markup', document.getElementById('markup').value);
        localStorage.setItem('ff-comments', document.getElementById('comments').value);
        
        console.log('✅ Данные сохранены в БД');
    } catch (error) {
        console.error('❌ Ошибка сохранения в БД:', error);
        // Fallback к localStorage
        localStorage.setItem('ff-price-database', JSON.stringify(priceDatabase));
    }
}
```

**Заменить функцию `loadData()`:**
```javascript
async function loadData() {
    try {
        if (isOnline) {
            // Загружаем данные из API
            const [leadsResponse, pricesResponse, remindersResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/leads`),
                fetch(`${API_BASE_URL}/prices`),
                fetch(`${API_BASE_URL}/reminders`)
            ]);

            if (leadsResponse.ok) {
                leads = await leadsResponse.json();
            }
            if (pricesResponse.ok) {
                priceDatabase = await pricesResponse.json();
                updatePriceDatabaseTable();
            }
            if (remindersResponse.ok) {
                reminders = await remindersResponse.json();
            }

            console.log('✅ Данные загружены из БД');
        } else {
            // Загружаем из localStorage
            const savedPriceDatabase = localStorage.getItem('ff-price-database');
            const savedLeads = localStorage.getItem('ff-leads');
            const savedReminders = localStorage.getItem('ff-reminders');

            if (savedPriceDatabase) {
                priceDatabase = JSON.parse(savedPriceDatabase);
                updatePriceDatabaseTable();
            }
            if (savedLeads) {
                leads = JSON.parse(savedLeads);
            }
            if (savedReminders) {
                reminders = JSON.parse(savedReminders);
            }

            console.log('📱 Данные загружены из localStorage');
        }

        // Загружаем локальные данные
        const savedCalculationItems = localStorage.getItem('ff-calculation-items');
        const savedClientName = localStorage.getItem('ff-client-name');
        const savedMarkup = localStorage.getItem('ff-markup');
        const savedComments = localStorage.getItem('ff-comments');

        if (savedCalculationItems) {
            calculationItems = JSON.parse(savedCalculationItems);
            updateCalculationTable();
        }
        if (savedClientName) {
            document.getElementById('clientName').value = savedClientName;
        }
        if (savedMarkup) {
            document.getElementById('markup').value = savedMarkup;
        }
        if (savedComments) {
            document.getElementById('comments').value = savedComments;
        }

    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        showNotification('Ошибка загрузки данных. Работаем в офлайн режиме.', 'error');
    }
}
```

### 3. Обновление функций работы с лидами

**Заменить функцию `addLead()`:**
```javascript
async function addLead() {
    const clientName = document.getElementById('leadClientName').value.trim();
    const phone = document.getElementById('leadPhone').value.trim();
    const email = document.getElementById('leadEmail').value.trim();
    const status = document.getElementById('leadStatus').value;
    const source = document.getElementById('leadSource').value;
    const comments = document.getElementById('leadComments').value.trim();

    if (!clientName) {
        alert('Введите имя клиента');
        return;
    }

    const newLead = {
        client_name: clientName,
        phone: phone,
        email: email,
        status: status,
        source: source,
        comments: comments
    };

    try {
        if (isOnline) {
            const response = await fetch(`${API_BASE_URL}/leads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newLead)
            });

            if (response.ok) {
                const savedLead = await response.json();
                leads.push(savedLead);
                showNotification('Лид добавлен', 'success');
            } else {
                throw new Error('Ошибка сохранения лида');
            }
        } else {
            // Офлайн режим
            newLead.id = nextLeadId++;
            newLead.created_at = new Date().toISOString();
            leads.push(newLead);
            localStorage.setItem('ff-leads', JSON.stringify(leads));
            showNotification('Лид добавлен (офлайн)', 'success');
        }

        updateLeadsTable();
        updateDashboard();
        updateKanbanBoard();
        hideAddLeadModal();
        
        // Очищаем форму
        document.getElementById('leadClientName').value = '';
        document.getElementById('leadPhone').value = '';
        document.getElementById('leadEmail').value = '';
        document.getElementById('leadComments').value = '';

    } catch (error) {
        console.error('Ошибка добавления лида:', error);
        showNotification('Ошибка добавления лида', 'error');
    }
}
```

**Заменить функцию `editLead()`:**
```javascript
async function editLead(id) {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;

    const newClientName = prompt('Имя клиента:', lead.client_name);
    if (newClientName === null) return;

    const newPhone = prompt('Телефон:', lead.phone || '');
    const newEmail = prompt('Email:', lead.email || '');
    const newStatus = prompt('Статус:', lead.status);
    const newSource = prompt('Источник:', lead.source || '');
    const newComments = prompt('Комментарии:', lead.comments || '');

    const updatedLead = {
        ...lead,
        client_name: newClientName,
        phone: newPhone,
        email: newEmail,
        status: newStatus,
        source: newSource,
        comments: newComments
    };

    try {
        if (isOnline) {
            const response = await fetch(`${API_BASE_URL}/leads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedLead)
            });

            if (response.ok) {
                const savedLead = await response.json();
                const index = leads.findIndex(l => l.id === id);
                leads[index] = savedLead;
                showNotification('Лид обновлен', 'success');
            } else {
                throw new Error('Ошибка обновления лида');
            }
        } else {
            // Офлайн режим
            const index = leads.findIndex(l => l.id === id);
            leads[index] = updatedLead;
            localStorage.setItem('ff-leads', JSON.stringify(leads));
            showNotification('Лид обновлен (офлайн)', 'success');
        }

        updateLeadsTable();
        updateDashboard();
        updateKanbanBoard();

    } catch (error) {
        console.error('Ошибка обновления лида:', error);
        showNotification('Ошибка обновления лида', 'error');
    }
}
```

**Заменить функцию `deleteLead()`:**
```javascript
async function deleteLead(id) {
    if (!confirm('Удалить лида?')) return;

    try {
        if (isOnline) {
            const response = await fetch(`${API_BASE_URL}/leads/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                leads = leads.filter(l => l.id !== id);
                showNotification('Лид удален', 'success');
            } else {
                throw new Error('Ошибка удаления лида');
            }
        } else {
            // Офлайн режим
            leads = leads.filter(l => l.id !== id);
            localStorage.setItem('ff-leads', JSON.stringify(leads));
            showNotification('Лид удален (офлайн)', 'success');
        }

        updateLeadsTable();
        updateDashboard();
        updateKanbanBoard();

    } catch (error) {
        console.error('Ошибка удаления лида:', error);
        showNotification('Ошибка удаления лида', 'error');
    }
}
```

### 4. Обновление функций работы с напоминаниями

**Заменить функцию `addReminder()`:**
```javascript
async function addReminder() {
    const leadId = parseInt(document.getElementById('reminderLeadId').value);
    const dateTime = document.getElementById('reminderDateTime').value;
    const text = document.getElementById('reminderText').value.trim();
    const botToken = document.getElementById('telegramBotToken').value.trim() || globalTelegramSettings.botToken;
    const chatId = document.getElementById('telegramChatId').value.trim() || globalTelegramSettings.chatId;

    if (!leadId || !dateTime || !text) {
        alert('Заполните все обязательные поля');
        return;
    }

    const newReminder = {
        lead_id: leadId,
        date_time: dateTime,
        text: text,
        telegram_bot_token: botToken,
        telegram_chat_id: chatId
    };

    try {
        if (isOnline) {
            const response = await fetch(`${API_BASE_URL}/reminders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newReminder)
            });

            if (response.ok) {
                const savedReminder = await response.json();
                reminders.push(savedReminder);
                showNotification('Напоминание добавлено', 'success');
            } else {
                throw new Error('Ошибка сохранения напоминания');
            }
        } else {
            // Офлайн режим
            newReminder.id = nextReminderId++;
            newReminder.completed = false;
            newReminder.created_at = new Date().toISOString();
            reminders.push(newReminder);
            localStorage.setItem('ff-reminders', JSON.stringify(reminders));
            showNotification('Напоминание добавлено (офлайн)', 'success');
        }

        updateKanbanBoard();
        hideAddReminderModal();

        // Schedule notification
        scheduleReminderNotification(newReminder);

    } catch (error) {
        console.error('Ошибка добавления напоминания:', error);
        showNotification('Ошибка добавления напоминания', 'error');
    }
}
```

### 5. Добавление индикатора подключения

**Добавить в HTML (в шапку):**
```html
<div class="flex items-center space-x-4">
    <!-- Индикатор подключения -->
    <div id="connectionStatus" class="flex items-center px-3 py-1 rounded-lg">
        <div id="statusDot" class="w-2 h-2 rounded-full mr-2"></div>
        <span id="statusText" class="text-sm">Проверка...</span>
    </div>
    
    <!-- Остальные кнопки -->
    <button onclick="showNotificationSettings()" class="flex items-center px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors">
        <i data-lucide="bell" class="h-4 w-4 mr-2"></i>
        Уведомления
    </button>
    <!-- ... остальные кнопки ... -->
</div>
```

**Добавить CSS:**
```css
#connectionStatus.online {
    background-color: #10b981;
    color: white;
}

#connectionStatus.offline {
    background-color: #ef4444;
    color: white;
}

#statusDot.online {
    background-color: #10b981;
}

#statusDot.offline {
    background-color: #ef4444;
}
```

**Добавить JavaScript для обновления статуса:**
```javascript
function updateConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    const dotElement = document.getElementById('statusDot');
    const textElement = document.getElementById('statusText');

    if (isOnline) {
        statusElement.className = 'flex items-center px-3 py-1 rounded-lg online';
        dotElement.className = 'w-2 h-2 rounded-full mr-2 online';
        textElement.textContent = 'Онлайн';
    } else {
        statusElement.className = 'flex items-center px-3 py-1 rounded-lg offline';
        dotElement.className = 'w-2 h-2 rounded-full mr-2 offline';
        textElement.textContent = 'Офлайн';
    }
}

// Обновляем статус при изменении подключения
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);

// Обновляем статус при загрузке
document.addEventListener('DOMContentLoaded', updateConnectionStatus);
```

## 🎯 Итоговые изменения

### Основные изменения:
1. ✅ **API интеграция** - все CRUD операции через REST API
2. ✅ **Офлайн поддержка** - fallback к localStorage
3. ✅ **Индикатор подключения** - визуальный статус
4. ✅ **Обработка ошибок** - graceful degradation
5. ✅ **Асинхронные операции** - async/await для всех API вызовов

### Преимущества:
- ✅ **Централизованные данные** - все в PostgreSQL
- ✅ **Командная работа** - несколько пользователей одновременно
- ✅ **Надежность** - ACID транзакции
- ✅ **Производительность** - нет лимитов API
- ✅ **Офлайн режим** - работает без интернета

---

**Фронтенд готов для работы с API!** 🚀

**Следующий шаг:** Загрузить обновленный фронтенд на GitHub Pages!
