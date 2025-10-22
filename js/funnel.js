// funnel.js - Логика воронки продаж

// Статусы воронки в правильном порядке
const FUNNEL_STEPS = [
    { key: 'new', name: 'Новый', icon: '🆕', color: 'green' },
    { key: 'contacted', name: 'Связались', icon: '📞', color: 'blue' },
    { key: 'quoted', name: 'На просчете', icon: '💰', color: 'yellow' },
    { key: 'negotiating', name: 'Переговоры', icon: '🤝', color: 'orange' },
    { key: 'closed_successful', name: 'Закрыт успешно', icon: '✅', color: 'red' }
];

// Маппинг статусов из БД на статусы воронки
const STATUS_MAPPING = {
    'new': 'new',
    'contacted': 'contacted', 
    'quoted': 'quoted',
    'negotiating': 'negotiating',
    'won': 'closed_successful',
    'closed_successful': 'closed_successful',
    'closed_won': 'closed_successful',
    'lost': 'closed_unsuccessful',
    'closed_lost': 'closed_unsuccessful',
    'not_relevant': 'closed_unsuccessful',
    'тестовый_статус': 'closed_unsuccessful'
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
    // Подсчитываем лиды по статусам (кумулятивная логика)
    const statusCounts = {};
    FUNNEL_STEPS.forEach(step => {
        statusCounts[step.key] = 0;
    });
    
    // Определяем порядок этапов для кумулятивного подсчета
    const stepOrder = FUNNEL_STEPS.map(step => step.key);
    
    leads.forEach(lead => {
        const mappedStatus = STATUS_MAPPING[lead.status] || 'new';
        
        // Если лид в статусе "неактуально" - не считаем его в воронке
        if (mappedStatus === 'not_relevant' || mappedStatus === 'closed_unsuccessful') {
            return;
        }
        
        // Находим позицию статуса лида в воронке
        const statusIndex = stepOrder.indexOf(mappedStatus);
        
        if (statusIndex !== -1) {
            // Кумулятивно добавляем лид ко всем этапам до его текущего статуса включительно
            for (let i = 0; i <= statusIndex; i++) {
                const stepKey = stepOrder[i];
                statusCounts[stepKey]++;
            }
        } else {
            // Если статус не найден в воронке, считаем как "Новый"
            statusCounts['new']++;
        }
    });
    
    console.log('📈 Кумулятивная статистика по статусам:', statusCounts);
    
    // Сохраняем данные
    funnelData = statusCounts;
    
    // Обновляем UI
    updateFunnelUI(statusCounts);
}

// Обновление интерфейса воронки
function updateFunnelUI(statusCounts) {
    const totalLeads = statusCounts.new;
    const closedDeals = statusCounts.closed_successful || 0;
    
    // Обновляем общую статистику
    document.getElementById('funnel-total-leads').textContent = totalLeads;
    document.getElementById('funnel-closed-deals').textContent = closedDeals;
    
    // Общая конверсия: от первого этапа до последнего
    const totalConversion = totalLeads > 0 ? Math.round((closedDeals / totalLeads) * 100) : 0;
    document.getElementById('funnel-total-conversion').textContent = totalConversion + '%';
    
    // Показываем информацию о фильтрах
    showFunnelFilterInfo();
    
    // Создаем этапы воронки
    createFunnelSteps(statusCounts);
    
    // Средняя конверсия между этапами
    const conversions = [];
    const stepOrder = FUNNEL_STEPS.map(step => step.key);
    
    for (let i = 1; i < stepOrder.length; i++) {
        const currentStep = stepOrder[i];
        const previousStep = stepOrder[i - 1];
        const currentCount = statusCounts[currentStep] || 0;
        const previousCount = statusCounts[previousStep] || 0;
        
        const conversion = previousCount > 0 ? (currentCount / previousCount) * 100 : 0;
        conversions.push(conversion);
    }
    
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

// Создание компактных этапов воронки
function createFunnelSteps(statusCounts) {
    const container = document.getElementById('funnel-steps');
    container.innerHTML = '';
    
    const stepOrder = FUNNEL_STEPS.map(step => step.key);
    const totalLeads = statusCounts.new || 0;
    
    // Создаем контейнер для компактной воронки
    const funnelContainer = document.createElement('div');
    funnelContainer.className = 'space-y-2';
    
    FUNNEL_STEPS.forEach((step, index) => {
        const count = statusCounts[step.key] || 0;
        
        // Рассчитываем конверсию от предыдущего этапа
        let conversion = 100; // Для первого этапа всегда 100%
        if (index > 0) {
            const previousStep = stepOrder[index - 1];
            const previousCount = statusCounts[previousStep] || 0;
            conversion = previousCount > 0 ? Math.round((count / previousCount) * 100) : 0;
        }
        
        // Рассчитываем процент от общего количества лидов
        const percentage = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
        
        // Создаем компактный элемент этапа
        const stepElement = createHorizontalFunnelStep(step, count, percentage, conversion, index, totalLeads);
        funnelContainer.appendChild(stepElement);
    });
    
    container.appendChild(funnelContainer);
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

// Создание компактного горизонтального элемента этапа воронки
function createHorizontalFunnelStep(step, count, percentage, conversion, index, totalLeads) {
    const stepDiv = document.createElement('div');
    stepDiv.className = 'bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm transition-all duration-300 hover:shadow-md';
    
    const isFirstStep = index === 0;
    const conversionClass = isFirstStep ? 'text-gray-600 dark:text-gray-400' : (conversion >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400');
    
    // Определяем цвет прогресс-бара
    const progressColor = getProgressBarColor(step.color);
    
    stepDiv.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <div class="flex items-center">
                <span class="text-lg mr-2">${step.icon}</span>
                <h3 class="text-base font-semibold text-gray-900 dark:text-white">${step.name}</h3>
            </div>
            <div class="flex items-center space-x-4">
                <div class="text-right">
                    <div class="text-lg font-bold text-gray-900 dark:text-white">${count}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">лидов</div>
                </div>
                <div class="text-right">
                    <div class="text-sm font-semibold ${conversionClass}">${conversion}%</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">конверсия</div>
                </div>
                <div class="text-right">
                    <div class="text-sm font-semibold text-gray-900 dark:text-white">${percentage}%</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">от общего</div>
                </div>
            </div>
        </div>
        
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div class="h-full rounded-full transition-all duration-1000 ease-out ${progressColor}" style="width: ${percentage}%"></div>
        </div>
    `;
    
    return stepDiv;
}

// Получение цвета прогресс-бара
function getProgressBarColor(stepColor) {
    const colors = {
        green: 'bg-gradient-to-r from-green-400 to-green-600',
        blue: 'bg-gradient-to-r from-blue-400 to-blue-600',
        yellow: 'bg-gradient-to-r from-yellow-400 to-yellow-600',
        orange: 'bg-gradient-to-r from-orange-400 to-orange-600',
        red: 'bg-gradient-to-r from-red-400 to-red-600',
        purple: 'bg-gradient-to-r from-purple-400 to-purple-600'
    };
    return colors[stepColor] || 'bg-gradient-to-r from-gray-400 to-gray-600';
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
