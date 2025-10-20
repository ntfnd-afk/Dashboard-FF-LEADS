// ========================================
// FF Dashboard - Dashboard Module
// ========================================

// ========================================
// DASHBOARD FUNCTIONS
// ========================================

function updateDashboard() {
    updateStatusChart();
    updateRecentLeads();
    updateStatsCards();
}

function updateStatsCards() {
    const totalLeads = leads.length;
    const newLeads = leads.filter(lead => lead.status === 'new').length;
    const contactedLeads = leads.filter(lead => lead.status === 'contacted').length;
    const wonLeads = leads.filter(lead => lead.status === 'won').length;
    
    // Обновляем карточки статистики
    const totalLeadsElement = document.getElementById('totalLeads');
    const newLeadsElement = document.getElementById('newLeads');
    const contactedLeadsElement = document.getElementById('contactedLeads');
    const wonLeadsElement = document.getElementById('wonLeads');
    
    if (totalLeadsElement) totalLeadsElement.textContent = totalLeads;
    if (newLeadsElement) newLeadsElement.textContent = newLeads;
    if (contactedLeadsElement) contactedLeadsElement.textContent = contactedLeads;
    if (wonLeadsElement) wonLeadsElement.textContent = wonLeads;
}

function updateStatusChart() {
    const chartContainer = document.getElementById('statusChart');
    if (!chartContainer) return;

    // Подсчитываем количество лидов по статусам
    const statusCounts = {};
    leadStatuses.forEach(status => {
        statusCounts[status.id] = leads.filter(lead => lead.status === status.id).length;
    });

    // Создаем HTML для диаграммы
    const totalLeads = leads.length;
    if (totalLeads === 0) {
        chartContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">Нет данных для отображения</p>';
        return;
    }

    chartContainer.innerHTML = leadStatuses.map(status => {
        const count = statusCounts[status.id];
        const percentage = totalLeads > 0 ? (count / totalLeads * 100).toFixed(1) : 0;
        
        return `
            <div class="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <div class="flex items-center space-x-3">
                    <div class="w-4 h-4 rounded-full ${getStatusColorClass(status.color)}"></div>
                    <span class="text-sm font-medium text-gray-900 dark:text-white">${status.name}</span>
                </div>
                <div class="text-right">
                    <div class="text-lg font-bold text-gray-900 dark:text-white">${count}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">${percentage}%</div>
                </div>
            </div>
        `;
    }).join('');
}

function updateRecentLeads() {
    const recentLeadsContainer = document.getElementById('recentLeads');
    if (!recentLeadsContainer) return;

    // Сортируем лиды по дате создания (новые сначала)
    const recentLeads = [...leads]
        .sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at))
        .slice(0, 5);

    if (recentLeads.length === 0) {
        recentLeadsContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">Нет лидов</p>';
        return;
    }

    recentLeadsContainer.innerHTML = recentLeads.map(lead => `
        <div class="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors cursor-pointer" onclick="openLeadDetails(${lead.id})">
            <div class="flex-1">
                <div class="font-medium text-gray-900 dark:text-white truncate">
                    ${lead.clientName || lead.name || 'Без имени'}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                    ${lead.contact || lead.phone || '-'} • ${formatDate(lead.createdAt || lead.created_at)}
                </div>
            </div>
            <div class="ml-3">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(getStatusText(lead.status))}">
                    ${getStatusText(lead.status)}
                </span>
            </div>
        </div>
    `).join('');
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function getStatusColorClass(color) {
    const colorMap = {
        blue: 'bg-blue-500',
        yellow: 'bg-yellow-500',
        purple: 'bg-purple-500',
        orange: 'bg-orange-500',
        green: 'bg-green-500',
        red: 'bg-red-500'
    };
    
    return colorMap[color] || 'bg-gray-500';
}

// ========================================
// EXPORT FOR OTHER MODULES
// ========================================

// Экспортируем функции дашборда для других модулей
window.FFDashboard = {
    updateDashboard,
    updateStatusChart,
    updateRecentLeads,
    updateStatsCards,
    getStatusColorClass
};
