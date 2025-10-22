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

// Загрузка данных воронки
async function loadFunnelData() {
    try {
        console.log('🔄 Загружаем данные воронки...');
        
        // Показываем загрузку
        document.getElementById('funnel-loading').classList.remove('hidden');
        document.getElementById('funnel-error').classList.add('hidden');
        document.getElementById('funnel-steps').innerHTML = '';
        
        // Загружаем лиды
        const response = await fetch(`${API_BASE_URL}leads`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const leads = await response.json();
        console.log('📊 Получены лиды:', leads);
        
        // Обрабатываем данные
        processFunnelData(leads);
        
        // Обновляем время последнего обновления
        document.getElementById('funnelLastUpdate').textContent = new Date().toLocaleTimeString('ru-RU');
        
        // Скрываем загрузку
        document.getElementById('funnel-loading').classList.add('hidden');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных воронки:', error);
        showFunnelError(error.message);
    }
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
    // Загружаем данные воронки при загрузке страницы
    if (typeof loadFunnelData === 'function') {
        loadFunnelData();
    }
});

// Обновляем данные каждые 30 секунд
setInterval(() => {
    if (document.getElementById('funnel-content') && !document.getElementById('funnel-content').classList.contains('hidden')) {
        loadFunnelData();
    }
}, 30000);
