// ========================================
// FF Dashboard - Admin Settings Module
// ========================================

// ========================================
// ADMIN SETTINGS FUNCTIONS
// ========================================

function showAdminSettings() {
    document.getElementById('adminSettingsModal').classList.remove('hidden');
    loadAdminSettings();
}

function hideAdminSettings() {
    document.getElementById('adminSettingsModal').classList.add('hidden');
}

function loadAdminSettings() {
    // Загружаем статусы
    updateStatusList();
    // Загружаем источники
    updateSourceList();
    // Загружаем этапы воронки
    updatePipelineList();
    // Загружаем услуги
    updateServicesList();
    
    // Открываем первый аккордеон по умолчанию
    toggleAccordion('statusAccordion');
}

function toggleAccordion(accordionId) {
    const accordion = document.getElementById(accordionId);
    const icon = document.getElementById(accordionId + 'Icon');
    
    if (accordion.classList.contains('hidden')) {
        accordion.classList.remove('hidden');
        icon.style.transform = 'rotate(180deg)';
    } else {
        accordion.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)';
    }
}

function toggleAllAccordions() {
    const accordions = ['statusAccordion', 'sourceAccordion', 'pipelineAccordion', 'servicesAccordion'];
    const allHidden = accordions.every(id => document.getElementById(id).classList.contains('hidden'));
    
    accordions.forEach(id => {
        const accordion = document.getElementById(id);
        const icon = document.getElementById(id + 'Icon');
        
        if (allHidden) {
            accordion.classList.remove('hidden');
            icon.style.transform = 'rotate(180deg)';
        } else {
            accordion.classList.add('hidden');
            icon.style.transform = 'rotate(0deg)';
        }
    });
}

// ========================================
// STATUS MANAGEMENT FUNCTIONS
// ========================================

function updateStatusList() {
    const statusList = document.getElementById('statusList');
    if (!statusList) return;

    statusList.innerHTML = leadStatuses.map(status => `
        <div class="flex items-center justify-between p-3 bg-white dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-500">
            <div class="flex items-center space-x-3">
                <div class="w-4 h-4 rounded-full ${getStatusColorClass(status.color)}"></div>
                <span class="text-sm font-medium text-gray-900 dark:text-white">${status.name}</span>
            </div>
            <div class="flex space-x-2">
                <button onclick="editStatus('${status.id}')" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" title="Редактировать">
                    <i data-lucide="edit" class="h-4 w-4"></i>
                </button>
                <button onclick="deleteStatus('${status.id}')" class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300" title="Удалить">
                    <i data-lucide="trash-2" class="h-4 w-4"></i>
                </button>
            </div>
        </div>
    `).join('');

    lucide.createIcons();
}

function addNewStatus() {
    const name = document.getElementById('newStatusName').value.trim();
    const color = document.getElementById('newStatusColor').value;

    if (!name) {
        showNotification('Введите название статуса', 'error');
        return;
    }

    const newStatus = {
        id: name.toLowerCase().replace(/\s+/g, '_'),
        name: name,
        color: color
    };

    leadStatuses.push(newStatus);
    updateStatusList();
    updateKanbanBoard();
    updateDashboard();

    // Очищаем поля
    document.getElementById('newStatusName').value = '';
    document.getElementById('newStatusColor').value = 'blue';

    showNotification('Статус добавлен', 'success');
}

function editStatus(statusId) {
    const status = leadStatuses.find(s => s.id === statusId);
    if (!status) return;

    const newName = prompt('Название статуса:', status.name);
    if (newName === null) return;

    const newColor = prompt('Цвет (blue, yellow, purple, orange, green, red):', status.color);
    if (newColor === null) return;

    if (!newName.trim()) {
        showNotification('Название не может быть пустым', 'error');
        return;
    }

    status.name = newName.trim();
    status.color = newColor.trim();

    updateStatusList();
    updateLeadsTable();
    updateKanbanBoard();
    updateDashboard();
    showNotification('Статус обновлен', 'success');
}

function deleteStatus(statusId) {
    if (!confirm('Вы уверены, что хотите удалить этот статус? Лиды с этим статусом будут перемещены в "Новый".')) return;

    // Перемещаем лиды с удаляемого статуса в "Новый"
    leads.forEach(lead => {
        if (lead.status === statusId) {
            lead.status = 'new';
        }
    });

    leadStatuses = leadStatuses.filter(s => s.id !== statusId);
    updateStatusList();
    updateLeadsTable();
    updateKanbanBoard();
    updateDashboard();

    showNotification('Статус удален', 'success');
}

// ========================================
// SOURCE MANAGEMENT FUNCTIONS
// ========================================

function updateSourceList() {
    const sourceList = document.getElementById('sourceList');
    if (!sourceList) return;

    sourceList.innerHTML = leadSources.map(source => `
        <div class="flex items-center justify-between p-3 bg-white dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-500">
            <div class="flex items-center space-x-3">
                <span class="text-sm font-medium text-gray-900 dark:text-white">${source.name}</span>
            </div>
            <div class="flex space-x-2">
                <button onclick="editSource('${source.id}')" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" title="Редактировать">
                    <i data-lucide="edit" class="h-4 w-4"></i>
                </button>
                <button onclick="deleteSource('${source.id}')" class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300" title="Удалить">
                    <i data-lucide="trash-2" class="h-4 w-4"></i>
                </button>
            </div>
        </div>
    `).join('');

    lucide.createIcons();
}

function addNewSource() {
    const name = document.getElementById('newSourceName').value.trim();

    if (!name) {
        showNotification('Введите название источника', 'error');
        return;
    }

    const newSource = {
        id: name.toLowerCase().replace(/\s+/g, '_'),
        name: name
    };

    leadSources.push(newSource);
    updateSourceList();

    // Очищаем поля
    document.getElementById('newSourceName').value = '';

    showNotification('Источник добавлен', 'success');
}

function editSource(sourceId) {
    const source = leadSources.find(s => s.id === sourceId);
    if (!source) return;

    const newName = prompt('Название источника:', source.name);
    if (newName === null) return;

    if (!newName.trim()) {
        showNotification('Название не может быть пустым', 'error');
        return;
    }

    source.name = newName.trim();

    updateSourceList();
    updateLeadsTable();
    updateKanbanBoard();
    updateDashboard();
    showNotification('Источник обновлен', 'success');
}

function deleteSource(sourceId) {
    if (!confirm('Вы уверены, что хотите удалить этот источник? Лиды с этим источником будут перемещены в "Другое".')) return;

    // Перемещаем лиды с удаляемого источника в "Другое"
    leads.forEach(lead => {
        if (lead.source === sourceId) {
            lead.source = 'other';
        }
    });

    leadSources = leadSources.filter(s => s.id !== sourceId);
    updateSourceList();
    updateLeadsTable();
    updateKanbanBoard();
    updateDashboard();

    showNotification('Источник удален', 'success');
}

// ========================================
// SAVE ADMIN SETTINGS
// ========================================

async function saveAdminSettings() {
    try {
        if (isOnline) {
            // Сохраняем настройки на сервере
            const response = await fetch(`${API_BASE_URL}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'lead_statuses',
                    value: JSON.stringify(leadStatuses)
                })
            });
            
            if (!response.ok) {
                throw new Error('Ошибка сохранения статусов');
            }
            
            const response2 = await fetch(`${API_BASE_URL}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'lead_sources',
                    value: JSON.stringify(leadSources)
                })
            });
            
            if (!response2.ok) {
                throw new Error('Ошибка сохранения источников');
            }
            
        }
        
        // Сохраняем в localStorage
        localStorage.setItem('ff-lead-statuses', JSON.stringify(leadStatuses));
        localStorage.setItem('ff-lead-sources', JSON.stringify(leadSources));
        
        hideAdminSettings();
        showNotification('Настройки системы сохранены', 'success');
        
        // Обновляем интерфейс
        updateSelectOptions(); // Обновляем селекты в формах
        updateLeadsTable();
        updateKanbanBoard();
        updateDashboard();
        
    } catch (error) {
        console.error('Ошибка сохранения настроек:', error);
        showNotification('Ошибка сохранения настроек', 'error');
    }
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

// Экспортируем функции админ настроек для других модулей
window.FFAdmin = {
    showAdminSettings,
    hideAdminSettings,
    loadAdminSettings,
    toggleAccordion,
    toggleAllAccordions,
    updateStatusList,
    addNewStatus,
    editStatus,
    deleteStatus,
    updateSourceList,
    addNewSource,
    editSource,
    deleteSource,
    saveAdminSettings,
    getStatusColorClass
};
