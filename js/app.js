// ========================================
// FF Dashboard - Main Application
// ========================================

// Global variables
var priceDatabase = [];
var calculationItems = [];
var nextItemId = 1;
var leads = [];
var nextLeadId = 1;
var currentTab = 'dashboard';
var reminders = [];
var nextReminderId = 1;
var currentUser = null;
var users = [];
// Захардкоженные настройки Telegram (неизменяемые)
var TELEGRAM_CONFIG = {
    botToken: 'YOUR_BOT_TOKEN_HERE', // Замените на ваш токен бота
    chatType: 'group', // Всегда групповой чат
    groupId: 'YOUR_GROUP_ID_HERE' // Замените на ID вашей группы (например: -1001234567890)
};

// Пользовательские настройки Telegram (изменяемые)
var globalTelegramSettings = {
    userId: '', // user ID for tagging in groups (пользователь может менять)
    silentMode: true, // тихий режим для обычных сообщений
    tagForReminders: true // тегать пользователей для напоминаний
};

// API Configuration
var API_BASE_URL = 'http://51.250.97.39:3001/api'; // Server notifications API
// var API_BASE_URL = 'http://localhost:3000/api'; // Локальная разработка
var isOnline = navigator.onLine;

// Проверка подключения
window.addEventListener('online', () => {
    isOnline = true;
    console.log('🌐 Подключение восстановлено');
    updateConnectionStatus();
});

window.addEventListener('offline', () => {
    isOnline = false;
    console.log('📱 Работаем офлайн');
    updateConnectionStatus();
});

// Настройки системы
var leadStatuses = [
    { id: 'new', name: 'Новый', color: 'blue' },
    { id: 'contacted', name: 'Связались', color: 'yellow' },
    { id: 'quoted', name: 'Отправили смету', color: 'purple' },
    { id: 'negotiating', name: 'Переговоры', color: 'orange' },
    { id: 'won', name: 'Закрыт успешно', color: 'green' },
    { id: 'lost', name: 'Закрыт неуспешно', color: 'red' }
];

var leadSources = [
    { id: 'website', name: 'Сайт' },
    { id: 'instagram', name: 'Instagram' },
    { id: 'facebook', name: 'Facebook' },
    { id: 'google', name: 'Google' },
    { id: 'yandex', name: 'Яндекс' },
    { id: 'referral', name: 'Рекомендация' },
    { id: 'phone', name: 'Телефонный звонок' },
    { id: 'other', name: 'Другое' }
];

var pipelineStages = [
    { id: 'new', name: 'Новые лиды', color: 'blue', order: 1 },
    { id: 'contacted', name: 'Связались', color: 'yellow', order: 2 },
    { id: 'quoted', name: 'Отправили смету', color: 'purple', order: 3 },
    { id: 'negotiating', name: 'Переговоры', color: 'orange', order: 4 },
    { id: 'won', name: 'Закрыт успешно', color: 'green', order: 5 },
    { id: 'lost', name: 'Закрыт неуспешно', color: 'red', order: 6 }
];

// Услуги фулфилмента
var services = [
    { id: 1, name: 'Упаковка', price: 50, unit: 'шт' },
    { id: 2, name: 'Хранение', price: 10, unit: 'день' },
    { id: 3, name: 'Доставка', price: 200, unit: 'заказ' },
    { id: 4, name: 'Маркировка', price: 25, unit: 'шт' },
    { id: 5, name: 'Сортировка', price: 30, unit: 'кг' }
];
var importServicesData = null; // Данные для импорта услуг

// ========================================
// UTILITY FUNCTIONS
// ========================================

function updateConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        if (isOnline) {
            statusElement.innerHTML = '<i data-lucide="wifi" class="h-4 w-4 text-green-500"></i> Онлайн';
            statusElement.className = 'flex items-center text-green-600 dark:text-green-400 text-sm';
        } else {
            statusElement.innerHTML = '<i data-lucide="wifi-off" class="h-4 w-4 text-red-500"></i> Офлайн';
            statusElement.className = 'flex items-center text-red-600 dark:text-red-400 text-sm';
        }
        lucide.createIcons();
    }
}

function showNotification(message, type = 'info') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
    
    // Определяем стили в зависимости от типа
    switch (type) {
        case 'success':
            notification.className += ' bg-green-500 text-white';
            break;
        case 'error':
            notification.className += ' bg-red-500 text-white';
            break;
        case 'warning':
            notification.className += ' bg-yellow-500 text-white';
            break;
        default:
            notification.className += ' bg-blue-500 text-white';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Автоматическое скрытие через 3 секунды
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function formatDate(dateString) {
    if (!dateString) return 'Не указана';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Неверная дата';
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0
    }).format(amount);
}

// ========================================
// TAB NAVIGATION
// ========================================

function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
        button.classList.remove('border-blue-500', 'text-blue-600', 'dark:text-blue-400');
        button.classList.add('border-transparent', 'text-gray-500', 'dark:text-gray-400');
    });
    
    // Show selected tab content
    document.getElementById(tabName + '-content').classList.remove('hidden');
    
    // Add active class to selected tab button
    const activeButton = document.getElementById('tab-' + tabName);
    activeButton.classList.add('active', 'border-blue-500', 'text-blue-600', 'dark:text-blue-400');
    activeButton.classList.remove('border-transparent', 'text-gray-500', 'dark:text-gray-400');
    
    currentTab = tabName;
    
    // Сохраняем активную вкладку в localStorage
    localStorage.setItem('ff-active-tab', tabName);
    
    // Update content based on tab
    if (tabName === 'dashboard') {
        updateDashboard();
    } else if (tabName === 'leads') {
        updateLeadsTable();
    } else if (tabName === 'kanban') {
        updateKanbanBoard();
    }
}

// ========================================
// DATA LOADING AND SAVING
// ========================================

function loadFromLocalStorage() {
    console.log('📱 Загружаем данные из localStorage');
    
    const savedPriceDatabase = localStorage.getItem('ff-price-database');
    const savedLeads = localStorage.getItem('ff-leads');
    const savedReminders = localStorage.getItem('ff-reminders');
    const savedUsers = localStorage.getItem('ff-users');
    const savedSettings = localStorage.getItem('ff-global-telegram-settings');
    const savedLeadStatuses = localStorage.getItem('ff-lead-statuses');
    const savedLeadSources = localStorage.getItem('ff-lead-sources');
    const savedPipelineStages = localStorage.getItem('ff-pipeline-stages');
    const savedServices = localStorage.getItem('ff-services');

    if (savedPriceDatabase) {
        priceDatabase = JSON.parse(savedPriceDatabase);
        updatePriceDatabaseTable();
    }
    if (savedLeads) {
        leads = JSON.parse(savedLeads);
    }
    if (savedReminders) {
        reminders = JSON.parse(savedReminders);
        console.log('📱 Загружено напоминаний из localStorage:', reminders.length);
    }
    if (savedUsers) {
        users = JSON.parse(savedUsers);
        // Если есть пользователи, делаем первого текущим
        if (users.length > 0 && !currentUser) {
            currentUser = users[0];
            updateCurrentUserDisplay();
        }
    }
    if (savedSettings) {
        globalTelegramSettings = JSON.parse(savedSettings);
    }
    if (savedLeadStatuses) {
        leadStatuses = JSON.parse(savedLeadStatuses);
    }
    if (savedLeadSources) {
        leadSources = JSON.parse(savedLeadSources);
    }
    if (savedPipelineStages) {
        pipelineStages = JSON.parse(savedPipelineStages);
    }
    if (savedServices) {
        services = JSON.parse(savedServices);
    }

    console.log('📱 Данные загружены из localStorage');
}

async function loadData() {
    try {
        // Сначала всегда загружаем из localStorage как fallback
        console.log('🔄 Начинаем загрузку данных...');
        loadFromLocalStorage();
        
        if (isOnline) {
            try {
                // Загружаем данные из API
                const [leadsResponse, remindersResponse, pricesResponse, usersResponse, settingsResponse] = await Promise.all([
                    fetch(`${API_BASE_URL}/leads`),
                    fetch(`${API_BASE_URL}/reminders`),
                    fetch(`${API_BASE_URL}/prices`),
                    fetch(`${API_BASE_URL}/users`),
                    fetch(`${API_BASE_URL}/settings`)
                ]);

                let apiDataLoaded = false;

                if (leadsResponse.ok) {
                    leads = await leadsResponse.json();
                    // Нормализуем поля лидов для совместимости
                    leads = leads.map(lead => ({
                        ...lead,
                        clientName: lead.client_name || lead.clientName || lead.name,
                        contact: lead.phone || lead.contact,
                        comments: lead.notes || lead.comments
                    }));
                    localStorage.setItem('ff-leads', JSON.stringify(leads));
                    apiDataLoaded = true;
                }
                if (remindersResponse.ok) {
                    reminders = await remindersResponse.json();
                    localStorage.setItem('ff-reminders', JSON.stringify(reminders));
                    apiDataLoaded = true;
                }
                if (pricesResponse.ok) {
                    priceDatabase = await pricesResponse.json();
                    localStorage.setItem('ff-price-database', JSON.stringify(priceDatabase));
                    updatePriceDatabaseTable();
                    apiDataLoaded = true;
                }
                if (usersResponse.ok) {
                    users = await usersResponse.json();
                    localStorage.setItem('ff-users', JSON.stringify(users));
                    apiDataLoaded = true;
                }
                if (settingsResponse.ok) {
                    const settings = await settingsResponse.json();
                    if (settings && settings.length > 0) {
                        // Загружаем настройки Telegram
                        const telegramSettings = settings.find(s => s.key === 'telegram_settings');
                        if (telegramSettings) {
                            globalTelegramSettings = JSON.parse(telegramSettings.value);
                            localStorage.setItem('ff-global-telegram-settings', JSON.stringify(globalTelegramSettings));
                        }
                        
                        // Загружаем статусы лидов
                        const leadStatusesSetting = settings.find(s => s.key === 'lead_statuses');
                        if (leadStatusesSetting) {
                            leadStatuses = JSON.parse(leadStatusesSetting.value);
                            localStorage.setItem('ff-lead-statuses', JSON.stringify(leadStatuses));
                        }
                        
                        // Загружаем источники лидов
                        const leadSourcesSetting = settings.find(s => s.key === 'lead_sources');
                        if (leadSourcesSetting) {
                            leadSources = JSON.parse(leadSourcesSetting.value);
                            localStorage.setItem('ff-lead-sources', JSON.stringify(leadSources));
                        }
                        
                        // Загружаем этапы воронки
                        const pipelineStagesSetting = settings.find(s => s.key === 'pipeline_stages');
                        if (pipelineStagesSetting) {
                            pipelineStages = JSON.parse(pipelineStagesSetting.value);
                            localStorage.setItem('ff-pipeline-stages', JSON.stringify(pipelineStages));
                        }
                        
                        // Загружаем услуги фулфилмента
                        const servicesSetting = settings.find(s => s.key === 'services');
                        if (servicesSetting) {
                            services = JSON.parse(servicesSetting.value);
                            localStorage.setItem('ff-services', JSON.stringify(services));
                        }
                        apiDataLoaded = true;
                    }
                }

                if (apiDataLoaded) {
                    console.log('✅ Данные загружены из БД');
                } else {
                    console.log('⚠️ API недоступен, загружаем из localStorage');
                    loadFromLocalStorage();
                }
            } catch (apiError) {
                console.log('⚠️ API недоступен, загружаем из localStorage:', apiError);
                // Если API недоступен, загружаем из localStorage
                loadFromLocalStorage();
            }
        } else {
            // Загружаем из localStorage
            loadFromLocalStorage();
        }

        // Обновляем UI после загрузки данных
        setTimeout(() => {
            if (typeof updateGlobalRemindersList === 'function') {
                console.log('Обновляем UI напоминаний после загрузки данных');
                updateGlobalRemindersList();
            } else {
                console.log('Функция updateGlobalRemindersList еще не загружена');
            }
        }, 100);

        // Загружаем локальные данные
        const savedCalculationItems = localStorage.getItem('ff-calculation-items');
        const savedClientName = localStorage.getItem('ff-client-name');
        const savedComments = localStorage.getItem('ff-comments');
        const savedMarkup = localStorage.getItem('ff-markup');

        if (savedCalculationItems) {
            calculationItems = JSON.parse(savedCalculationItems);
            updateCalculationTable();
        }
        if (savedClientName) {
            document.getElementById('clientName').value = savedClientName;
        }
        if (savedComments) {
            document.getElementById('comments').value = savedComments;
        }
        if (savedMarkup) {
            document.getElementById('markup').value = savedMarkup;
        }

        // Обновляем интерфейс
        updateDashboard();
        updateLeadsTable();
        updateKanbanBoard();
        updateRemindersList();
        updateGlobalRemindersList();
        updateConnectionStatus();

    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showNotification('Ошибка загрузки данных. Работаем в офлайн режиме', 'warning');
        
        // Загружаем из localStorage в случае ошибки
        loadFromLocalStorage();
    }
    
    // Обновляем UI после загрузки данных
    if (typeof updateGlobalRemindersList === 'function') {
        updateGlobalRemindersList();
    }
}

function saveData() {
    // Сохраняем данные расчета
    localStorage.setItem('ff-calculation-items', JSON.stringify(calculationItems));
    localStorage.setItem('ff-client-name', document.getElementById('clientName').value);
    localStorage.setItem('ff-comments', document.getElementById('comments').value);
    localStorage.setItem('ff-markup', document.getElementById('markup').value);
    
    // Сохраняем основные данные
    localStorage.setItem('ff-leads', JSON.stringify(leads));
    localStorage.setItem('ff-reminders', JSON.stringify(reminders));
    localStorage.setItem('ff-price-database', JSON.stringify(priceDatabase));
    localStorage.setItem('ff-users', JSON.stringify(users));
    localStorage.setItem('ff-global-telegram-settings', JSON.stringify(globalTelegramSettings));
    localStorage.setItem('ff-lead-statuses', JSON.stringify(leadStatuses));
    localStorage.setItem('ff-lead-sources', JSON.stringify(leadSources));
    localStorage.setItem('ff-pipeline-stages', JSON.stringify(pipelineStages));
    localStorage.setItem('ff-services', JSON.stringify(services));
}

// ========================================
// INITIALIZATION
// ========================================

// App initialization functions (called from index.html)
function initializeApp() {
    // Проверяем авторизацию при загрузке
    const savedUser = localStorage.getItem('ff-current-user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateCurrentUserDisplay();
        // Скрываем модальное окно входа если пользователь авторизован
        document.getElementById('loginModal').classList.add('hidden');
        
        // Показываем кнопку админ настроек для админов
        if (currentUser.role === 'admin') {
            document.getElementById('adminSettingsBtn').style.display = 'block';
        }
    } else {
        // Показываем модальное окно входа
        document.getElementById('loginModal').classList.remove('hidden');
    }

    // Загружаем данные
    loadData();

    // Восстанавливаем активную вкладку
    const savedTab = localStorage.getItem('ff-active-tab');
    if (savedTab) {
        showTab(savedTab);
    }

    // Инициализируем иконки Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Устанавливаем текущую дату
    const currentDate = new Date().toLocaleDateString('ru-RU');
    const currentDateElement = document.getElementById('currentDate');
    if (currentDateElement) {
        currentDateElement.value = currentDate;
    }
    
    // Принудительно обновляем UI напоминаний после полной инициализации
    setTimeout(() => {
        if (typeof updateGlobalRemindersList === 'function') {
            console.log('Принудительно обновляем UI напоминаний в initializeApp');
            updateGlobalRemindersList();
        } else {
            console.log('Функция updateGlobalRemindersList все еще не загружена');
        }
    }, 500);
}

// ========================================
// EXPORT FOR OTHER MODULES
// ========================================

// Экспортируем основные переменные и функции для других модулей
window.FFApp = {
    // Variables
    priceDatabase,
    calculationItems,
    nextItemId,
    leads,
    nextLeadId,
    currentTab,
    reminders,
    nextReminderId,
    currentUser,
    users,
    globalTelegramSettings,
    TELEGRAM_CONFIG,
    API_BASE_URL,
    isOnline,
    leadStatuses,
    leadSources,
    pipelineStages,
    services,
    importServicesData,
    
    // Functions
    updateConnectionStatus,
    showNotification,
    formatDate,
    formatCurrency,
    showTab,
    loadData,
    saveData,
    initializeApp
};

// Make functions available globally for onclick attributes
window.showTab = showTab;
window.loadData = loadData;
window.saveData = saveData;
window.updateConnectionStatus = updateConnectionStatus;
window.showNotification = showNotification;
window.formatDate = formatDate;
window.formatCurrency = formatCurrency;
