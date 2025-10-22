// funnel.js - Логика воронки продаж

// Статусы воронки в правильном порядке
const FUNNEL_STEPS = [
    { key: 'new', name: 'Новый', icon: '🆕', color: 'green' },
    { key: 'contacted', name: 'Связались', icon: '📞', color: 'blue' },
    { key: 'quoted', name: 'На просчете', icon: '💰', color: 'yellow' },
    { key: 'negotiating', name: 'Переговоры', icon: '🤝', color: 'orange' },
    { key: 'closed', name: 'Закрыт успешно', icon: '✅', color: 'red' }
];

// Маппинг статусов из БД на статусы воронки
const STATUS_MAPPING = {
    'new': 'new',
    'contacted': 'contacted', 
    'quoted': 'quoted',
    'negotiating': 'negotiating',
    'closed': 'closed',
    'closed_won': 'closed',
    'closed_lost': 'closed'
};

// Цвета для этапов воронки
const STEP_COLORS = {
    green: 'border-green-500 bg-green-50 dark:bg-green-900/20',
    blue: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
    yellow: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    orange: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
    red: 'border-red-500 bg-red-50 dark:bg-red-900/20'
};

let funnelData = {};
let funnelSources = [];

// Загрузка данных воронки
async function loadFunnelData() {
    try {
        console.log('🔄 Загружаем данные воронки...');
        
        // Показываем загрузку
        document.getElementById('funnel-loading').classList.remove('hidden');
        document.getElementById('funnel-error').classList.add('hidden');
        document.getElementById('funnel-steps').innerHTML = '';
        
        // Получаем параметры фильтрации
        const filters = getFunnelFilters();
        console.log('🔍 Фильтры воронки:', filters);
        
        // Загружаем лиды с фильтрами
        const response = await fetch(`${API_BASE_URL}leads`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const leads = await response.json();
        console.log('📊 Получены лиды:', leads);
        
        // Фильтруем данные
        const filteredLeads = filterLeads(leads, filters);
        console.log('📈 Отфильтрованные лиды:', filteredLeads);
        
        // Загружаем источники для фильтра
        await loadFunnelSources(leads);
        
        // Обрабатываем данные
        processFunnelData(filteredLeads);
        
        // Обновляем время последнего обновления
        document.getElementById('funnelLastUpdate').textContent = new Date().toLocaleTimeString('ru-RU');
        
        // Скрываем загрузку
        document.getElementById('funnel-loading').classList.add('hidden');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных воронки:', error);
        showFunnelError(error.message);
    }
}

// Получение параметров фильтрации
function getFunnelFilters() {
    const dateFrom = document.getElementById('funnelDateFrom').value;
    const dateTo = document.getElementById('funnelDateTo').value;
    const source = document.getElementById('funnelSourceFilter').value;
    
    return {
        dateFrom: dateFrom ? new Date(dateFrom) : null,
        dateTo: dateTo ? new Date(dateTo) : null,
        source: source || null
    };
}

// Фильтрация лидов
function filterLeads(leads, filters) {
    return leads.filter(lead => {
        // Фильтр по дате
        if (filters.dateFrom || filters.dateTo) {
            const leadDate = new Date(lead.created_at);
            
            if (filters.dateFrom && leadDate < filters.dateFrom) {
                return false;
            }
            
            if (filters.dateTo) {
                const endDate = new Date(filters.dateTo);
                endDate.setHours(23, 59, 59, 999); // Включаем весь день
                if (leadDate > endDate) {
                    return false;
                }
            }
        }
        
        // Фильтр по источнику
        if (filters.source && lead.source !== filters.source) {
            return false;
        }
        
        return true;
    });
}

// Загрузка источников для фильтра
async function loadFunnelSources(leads) {
    try {
        // Загружаем общие источники из настроек
        const response = await fetch(`${API_BASE_URL}settings`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const settings = await response.json();
        console.log('⚙️ Настройки:', settings);
        
        // Находим настройку lead_sources
        const leadSourcesSetting = settings.find(setting => setting.key === 'lead_sources');
        let sources = [];
        
        if (leadSourcesSetting && leadSourcesSetting.value) {
            try {
                sources = JSON.parse(leadSourcesSetting.value);
                console.log('📊 Общие источники из настроек:', sources);
            } catch (error) {
                console.error('❌ Ошибка парсинга источников:', error);
                // Fallback: используем источники из лидов
                sources = [...new Set(leads.map(lead => lead.source).filter(source => source))];
            }
        } else {
            // Fallback: используем источники из лидов
            sources = [...new Set(leads.map(lead => lead.source).filter(source => source))];
        }
        
        funnelSources = sources;
        
        // Обновляем селект источников
        const sourceSelect = document.getElementById('funnelSourceFilter');
        const currentValue = sourceSelect.value;
        
        // Очищаем опции (кроме "Все источники")
        sourceSelect.innerHTML = '<option value="">Все источники</option>';
        
        // Добавляем источники из настроек
        sources.forEach(source => {
            const option = document.createElement('option');
            option.value = source.id || source; // Используем id если есть, иначе само значение
            option.textContent = source.name || source; // Используем name если есть, иначе само значение
            sourceSelect.appendChild(option);
        });
        
        // Восстанавливаем выбранное значение
        sourceSelect.value = currentValue;
        
    } catch (error) {
        console.error('❌ Ошибка загрузки источников:', error);
        
        // Fallback: используем источники из лидов
        const sources = [...new Set(leads.map(lead => lead.source).filter(source => source))];
        funnelSources = sources;
        
        // Обновляем селект источников
        const sourceSelect = document.getElementById('funnelSourceFilter');
        const currentValue = sourceSelect.value;
        
        // Очищаем опции (кроме "Все источники")
        sourceSelect.innerHTML = '<option value="">Все источники</option>';
        
        // Добавляем источники
        sources.forEach(source => {
            const option = document.createElement('option');
            option.value = source;
            option.textContent = source;
            sourceSelect.appendChild(option);
        });
        
        // Восстанавливаем выбранное значение
        sourceSelect.value = currentValue;
    }
}

// Сброс фильтров воронки
function resetFunnelFilters() {
    document.getElementById('funnelDateFrom').value = '';
    document.getElementById('funnelDateTo').value = '';
    document.getElementById('funnelSourceFilter').value = '';
    
    // Перезагружаем данные
    loadFunnelData();
}

// Обработка данных воронки
function processFunnelData(leads) {
    // Подсчитываем лиды по статусам
    const statusCounts = {};
    FUNNEL_STEPS.forEach(step => {
        statusCounts[step.key] = 0;
    });
    
    leads.forEach(lead => {
        const mappedStatus = STATUS_MAPPING[lead.status] || 'new';
        if (statusCounts.hasOwnProperty(mappedStatus)) {
            statusCounts[mappedStatus]++;
        }
    });
    
    console.log('📈 Статистика по статусам:', statusCounts);
    
    // Сохраняем данные
    funnelData = statusCounts;
    
    // Обновляем UI
    updateFunnelUI(statusCounts);
}

// Обновление интерфейса воронки
function updateFunnelUI(statusCounts) {
    const totalLeads = statusCounts.new;
    
    // Обновляем общую статистику
    document.getElementById('funnel-total-leads').textContent = totalLeads;
    document.getElementById('funnel-closed-deals').textContent = statusCounts.closed;
    
    const totalConversion = totalLeads > 0 ? Math.round((statusCounts.closed / totalLeads) * 100) : 0;
    document.getElementById('funnel-total-conversion').textContent = totalConversion + '%';
    
    // Показываем информацию о фильтрах
    showFunnelFilterInfo();
    
    // Создаем этапы воронки
    createFunnelSteps(statusCounts);
    
    // Средняя конверсия
    const conversions = [];
    let previousCount = totalLeads;
    
    FUNNEL_STEPS.slice(1).forEach(step => {
        const count = statusCounts[step.key] || 0;
        const conversion = previousCount > 0 ? (count / previousCount) * 100 : 0;
        conversions.push(conversion);
        previousCount = count;
    });
    
    const avgConversion = conversions.length > 0 ? 
        Math.round(conversions.reduce((a, b) => a + b, 0) / conversions.length) : 0;
    document.getElementById('funnel-avg-conversion').textContent = avgConversion + '%';
}

// Показ информации о примененных фильтрах
function showFunnelFilterInfo() {
    const filters = getFunnelFilters();
    const filterInfo = [];
    
    // Убираем показ периода в заголовке - он уже есть в фильтрах
    // if (filters.dateFrom || filters.dateTo) {
    //     const fromStr = filters.dateFrom ? filters.dateFrom.toLocaleDateString('ru-RU') : 'начала';
    //     const toStr = filters.dateTo ? filters.dateTo.toLocaleDateString('ru-RU') : 'сегодня';
    //     filterInfo.push(`📅 Период: ${fromStr} - ${toStr}`);
    // }
    
    if (filters.source) {
        filterInfo.push(`📊 Источник: ${filters.source}`);
    }
    
    // Обновляем заголовок с информацией о фильтрах
    const title = document.querySelector('#funnel-content h2');
    if (filterInfo.length > 0) {
        title.innerHTML = `🎯 Воронка продаж <span class="text-sm font-normal text-gray-500 dark:text-gray-400">(${filterInfo.join(', ')})</span>`;
    } else {
        title.innerHTML = '🎯 Воронка продаж';
    }
}

// Создание этапов воронки
function createFunnelSteps(statusCounts) {
    const container = document.getElementById('funnel-steps');
    container.innerHTML = '';
    
    let previousCount = statusCounts.new;
    
    FUNNEL_STEPS.forEach((step, index) => {
        const count = statusCounts[step.key] || 0;
        const percentage = previousCount > 0 ? Math.round((count / previousCount) * 100) : 0;
        const conversion = index > 0 ? Math.round((count / previousCount) * 100) : 100;
        
        // Создаем элемент этапа
        const stepElement = createFunnelStepElement(step, count, percentage, conversion, index);
        container.appendChild(stepElement);
        
        // Добавляем стрелку между этапами (кроме последнего)
        if (index < FUNNEL_STEPS.length - 1) {
            const arrowElement = createArrowElement();
            container.appendChild(arrowElement);
        }
        
        previousCount = count;
    });
}

// Создание элемента этапа воронки
function createFunnelStepElement(step, count, percentage, conversion, index) {
    const stepDiv = document.createElement('div');
    stepDiv.className = `bg-white dark:bg-gray-800 rounded-lg border-l-4 ${STEP_COLORS[step.color]} p-6 shadow-md transition-all duration-300 hover:shadow-lg`;
    
    const isFirstStep = index === 0;
    const conversionText = isFirstStep ? 'Базовый уровень' : `Конверсия: ${conversion}%`;
    const conversionClass = isFirstStep ? '' : (conversion >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400');
    
    stepDiv.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center">
                <span class="text-2xl mr-3">${step.icon}</span>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${step.name}</h3>
            </div>
            <div class="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1 rounded-full font-semibold">
                ${count}
            </div>
        </div>
        <div class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            ${percentage}%
        </div>
        <div class="text-sm ${conversionClass}">
            ${conversionText}
        </div>
        <div class="mt-3 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div class="bg-blue-600 h-2 rounded-full transition-all duration-500" style="width: ${percentage}%"></div>
        </div>
    `;
    
    return stepDiv;
}

// Создание стрелки между этапами
function createArrowElement() {
    const arrowDiv = document.createElement('div');
    arrowDiv.className = 'flex justify-center py-2';
    arrowDiv.innerHTML = `
        <div class="text-gray-400 dark:text-gray-500">
            <i data-lucide="chevron-down" class="h-6 w-6"></i>
        </div>
    `;
    return arrowDiv;
}

// Показ ошибки воронки
function showFunnelError(message) {
    document.getElementById('funnel-loading').classList.add('hidden');
    document.getElementById('funnel-error').classList.remove('hidden');
    document.getElementById('funnel-error-message').textContent = message;
}

// Инициализация воронки при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Устанавливаем даты по умолчанию (последние 30 дней)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    document.getElementById('funnelDateFrom').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('funnelDateTo').value = today.toISOString().split('T')[0];
    
    // Загружаем данные воронки при загрузке страницы
    if (typeof loadFunnelData === 'function') {
        loadFunnelData();
    }
});

// Система событий для обновления воронки
let funnelUpdateTimeout = null;

// Функция для обновления воронки с дебаунсом
function scheduleFunnelUpdate() {
    // Отменяем предыдущее обновление
    if (funnelUpdateTimeout) {
        clearTimeout(funnelUpdateTimeout);
    }
    
    // Планируем обновление через 2 секунды (дебаунс)
    funnelUpdateTimeout = setTimeout(() => {
        if (document.getElementById('funnel-content') && !document.getElementById('funnel-content').classList.contains('hidden')) {
            console.log('🔄 Обновляем воронку по событию...');
            loadFunnelData();
        }
    }, 2000);
}

// Глобальная функция для вызова из других модулей
window.updateFunnel = scheduleFunnelUpdate;
