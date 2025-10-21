// ========================================
// FF Dashboard - Kanban Module
// ========================================

// ========================================
// KANBAN FUNCTIONS
// ========================================

function updateKanbanBoard() {
    const kanbanContent = document.getElementById('kanban-content');
    if (!kanbanContent) return;

    // Проверяем, не скрыт ли канбан
    if (kanbanContent.closest('.hidden')) {
        return;
    }

    console.log('Updating Kanban board with leads:', leads);
    console.log('Lead statuses:', leadStatuses);

    // Создаем динамическую структуру канбана на основе статусов лидов
    createDynamicKanbanStructure();

    // Используем статусы лидов вместо отдельных этапов воронки
    const stageIds = leadStatuses.map(status => status.id);
    console.log('Lead status IDs:', stageIds);

    // Обновляем каждую колонку
    stageIds.forEach(stageId => {
        const columnElement = document.getElementById(`${stageId}-leads-column`);
        if (!columnElement) {
            console.log(`Column element not found: ${stageId}-leads-column`);
            return;
        }

        console.log(`Looking for column element: ${stageId}-leads-column`, columnElement);

        // Фильтруем лиды по статусу
        const stageLeads = leads.filter(lead => lead.status === stageId);
        console.log(`Stage ${stageId} has ${stageLeads.length} leads:`, stageLeads);

        // Создаем HTML для карточек
        const cardsHTML = stageLeads.map(lead => createLeadCard(lead)).join('');
        console.log(`Generated HTML for stage ${stageId}:`, cardsHTML);

        // Устанавливаем содержимое колонки
        columnElement.innerHTML = cardsHTML;
        console.log('After setting innerHTML, column content:', columnElement.innerHTML);
        console.log('Column element children count:', columnElement.children.length);

        // Обновляем счетчик лидов
        const countElement = document.getElementById(`${stageId}-leads-count`);
        if (countElement) {
            countElement.textContent = stageLeads.length;
        }
    });

    // Обновляем иконки Lucide
    lucide.createIcons();
}

// Создание динамической структуры канбана на основе статусов лидов
function createDynamicKanbanStructure() {
    const pipelineContainer = document.querySelector('#kanban-content .grid');
    if (!pipelineContainer) return;

    // Создаем HTML для колонок на основе статусов лидов
    const columnsHTML = leadStatuses.map(status => {
        const colorClass = getStatusColorClass(status.color);
        const bgColorClass = getStatusBgColorClass(status.color);
        const textColorClass = getStatusTextColorClass(status.color);
        
        return `
            <div class="${bgColorClass} p-4 rounded-lg" ondrop="drop(event, '${status.id}')" ondragover="allowDrop(event)">
                <h3 class="font-semibold ${textColorClass} mb-2">${status.name}</h3>
                <div class="text-2xl font-bold ${textColorClass} mb-2" id="${status.id}-leads-count">0</div>
                <div id="${status.id}-leads-column" class="space-y-2 min-h-[200px]">
                    <!-- Lead cards will be populated here -->
                </div>
            </div>
        `;
    }).join('');

    // Обновляем контейнер
    pipelineContainer.innerHTML = columnsHTML;
}

function createLeadCard(lead) {
    console.log('Creating card for lead:', lead);
    
    const leadName = lead.clientName || lead.name || 'Без имени';
    const leadContact = lead.contact || lead.phone || '';
    const leadSource = getSourceText(lead.source);
    const leadPrice = lead.calculation ? lead.calculation.total || 0 : 0;

    const cardHTML = `
        <div class="kanban-card bg-white border border-gray-200 rounded-lg p-3 shadow-sm mb-2" draggable="true" ondragstart="dragStart(event, ${lead.id})" onclick="openLeadDetails(${lead.id})">
            <div class="flex items-start justify-between mb-2">
                <div class="font-medium text-sm text-gray-900 dark:text-white truncate">${leadName}</div>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">${leadContact}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-2">${leadSource}</div>
            <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-gray-900 dark:text-white">${formatCurrency(leadPrice)}</span>
                <div class="flex space-x-1">
                    <button onclick="event.stopPropagation(); addReminderForLead(${lead.id})" class="text-gray-400 hover:text-yellow-500" title="Добавить напоминание">
                        <i data-lucide="bell-plus" class="h-3 w-3"></i>
                    </button>
                    <button onclick="event.stopPropagation(); openLeadCalculator(${lead.id})" class="text-gray-400 hover:text-blue-500" title="Калькулятор">
                        <i data-lucide="calculator" class="h-3 w-3"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    console.log('Generated card HTML:', cardHTML);
    return cardHTML;
}

// ========================================
// DRAG AND DROP FUNCTIONS
// ========================================

function dragStart(event, leadId) {
    event.dataTransfer.setData('text/plain', leadId.toString());
    event.dataTransfer.effectAllowed = 'move';
}

function allowDrop(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
}

async function drop(event, newStatus) {
    event.preventDefault();
    
    const leadId = parseInt(event.dataTransfer.getData('text/plain'));
    const lead = leads.find(l => l.id === leadId);
    
    if (!lead) return;
    
    const oldStatus = lead.status;
    
    // Обновляем статус лида
    lead.status = newStatus;
    
    try {
        // Отправляем обновление на сервер
        const response = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: lead.clientName || lead.name,
                phone: lead.contact || lead.phone,
                source: lead.source,
                status: newStatus,
                notes: lead.comments || lead.notes
            })
        });

        if (response.ok) {
            // Сохраняем в localStorage
            localStorage.setItem('ff-leads', JSON.stringify(leads));
            
            // Обновляем интерфейс
            updateKanbanBoard();
            updateLeadsTable();
            updateDashboard();
            
            showNotification(`Лид перемещен в "${getStatusText(newStatus)}"`, 'success');
        } else {
            // Откатываем изменения при ошибке
            lead.status = oldStatus;
            updateKanbanBoard();
            throw new Error('Ошибка обновления статуса лида');
        }
    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        showNotification('Ошибка обновления статуса лида', 'error');
        
        // Откатываем изменения
        lead.status = oldStatus;
        updateKanbanBoard();
    }
}

// ========================================
// PIPELINE MANAGEMENT FUNCTIONS
// ========================================

function showPipelineSettings() {
    document.getElementById('pipelineSettingsModal').classList.remove('hidden');
    updatePipelineStagesDisplay();
}

function hidePipelineSettings() {
    document.getElementById('pipelineSettingsModal').classList.add('hidden');
}

function updatePipelineStagesDisplay() {
    const pipelineList = document.getElementById('pipelineList');
    if (!pipelineList) return;

    pipelineList.innerHTML = pipelineStages.map(stage => `
        <div class="flex items-center justify-between p-3 bg-white dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-500">
            <div class="flex items-center space-x-3">
                <div class="w-4 h-4 rounded-full ${getStatusColorClass(stage.color)}"></div>
                <span class="text-sm font-medium text-gray-900 dark:text-white">${stage.name}</span>
            </div>
            <div class="flex space-x-2">
                <button onclick="editPipelineStage('${stage.id}')" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" title="Редактировать">
                    <i data-lucide="edit" class="h-4 w-4"></i>
                </button>
                <button onclick="removePipelineStage('${stage.id}')" class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300" title="Удалить">
                    <i data-lucide="trash-2" class="h-4 w-4"></i>
                </button>
            </div>
        </div>
    `).join('');

    lucide.createIcons();
}

function updatePipelineStage(stageId) {
    const stage = pipelineStages.find(s => s.id === stageId);
    if (!stage) return;

    const newName = prompt('Название этапа:', stage.name);
    if (newName === null) return;

    const newColor = prompt('Цвет (blue, yellow, purple, orange, green, red):', stage.color);
    if (newColor === null) return;

    if (!newName.trim()) {
        showNotification('Название не может быть пустым', 'error');
        return;
    }

    stage.name = newName.trim();
    stage.color = newColor.trim();

    updatePipelineStagesDisplay();
    updateKanbanBoard();
    showNotification('Этап воронки обновлен', 'success');
}

function addPipelineStage() {
    const name = document.getElementById('newPipelineName').value.trim();
    const color = document.getElementById('newPipelineColor').value;

    if (!name) {
        showNotification('Введите название этапа', 'error');
        return;
    }

    const newStage = {
        id: name.toLowerCase().replace(/\s+/g, '_'),
        name: name,
        color: color
    };

    pipelineStages.push(newStage);
    updatePipelineStagesDisplay();
    updateKanbanBoard();

    // Очищаем поля
    document.getElementById('newPipelineName').value = '';
    document.getElementById('newPipelineColor').value = 'blue';

    showNotification('Этап воронки добавлен', 'success');
}

function removePipelineStage(stageId) {
    if (!confirm('Вы уверены, что хотите удалить этот этап? Лиды с этим статусом будут перемещены в "Новый".')) return;

    // Перемещаем лиды с удаляемого этапа в "Новый"
    leads.forEach(lead => {
        if (lead.status === stageId) {
            lead.status = 'new';
        }
    });

    pipelineStages = pipelineStages.filter(s => s.id !== stageId);
    updatePipelineStagesDisplay();
    updateKanbanBoard();
    updateLeadsTable();
    updateDashboard();

    showNotification('Этап воронки удален', 'success');
}

async function savePipelineSettings() {
    try {
        if (isOnline) {
            const response = await fetch(`${API_BASE_URL}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'pipeline_stages',
                    value: JSON.stringify(pipelineStages)
                })
            });
            
            if (!response.ok) {
                throw new Error('Ошибка сохранения этапов воронки');
            }
        }
        
        localStorage.setItem('ff-pipeline-stages', JSON.stringify(pipelineStages));
        hidePipelineSettings();
        showNotification('Настройки воронки сохранены', 'success');
        
    } catch (error) {
        console.error('Ошибка сохранения настроек воронки:', error);
        showNotification('Ошибка сохранения настроек воронки', 'error');
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

function getStatusBgColorClass(color) {
    const colorMap = {
        blue: 'bg-blue-50 dark:bg-blue-900',
        yellow: 'bg-yellow-50 dark:bg-yellow-900',
        purple: 'bg-purple-50 dark:bg-purple-900',
        orange: 'bg-orange-50 dark:bg-orange-900',
        green: 'bg-green-50 dark:bg-green-900',
        red: 'bg-red-50 dark:bg-red-900',
        gray: 'bg-gray-50 dark:bg-gray-900'
    };
    return colorMap[color] || 'bg-gray-50 dark:bg-gray-900';
}

function getStatusTextColorClass(color) {
    const colorMap = {
        blue: 'text-blue-900 dark:text-blue-100',
        yellow: 'text-yellow-900 dark:text-yellow-100',
        purple: 'text-purple-900 dark:text-purple-100',
        orange: 'text-orange-900 dark:text-orange-100',
        green: 'text-green-900 dark:text-green-100',
        red: 'text-red-900 dark:text-red-100',
        gray: 'text-gray-900 dark:text-gray-100'
    };
    return colorMap[color] || 'text-gray-900 dark:text-gray-100';
}

// ========================================
// EXPORT FOR OTHER MODULES
// ========================================

// Экспортируем функции канбана для других модулей
window.FFKanban = {
    updateKanbanBoard,
    createLeadCard,
    dragStart,
    allowDrop,
    drop,
    showPipelineSettings,
    hidePipelineSettings,
    updatePipelineStagesDisplay,
    updatePipelineStage,
    addPipelineStage,
    removePipelineStage,
    savePipelineSettings,
    getStatusColorClass
};

// Make functions available globally for onclick attributes
window.updateKanbanBoard = updateKanbanBoard;
window.createLeadCard = createLeadCard;
window.dragStart = dragStart;
window.allowDrop = allowDrop;
window.drop = drop;
window.showPipelineSettings = showPipelineSettings;
window.hidePipelineSettings = hidePipelineSettings;
window.updatePipelineStagesDisplay = updatePipelineStagesDisplay;
window.updatePipelineStage = updatePipelineStage;
window.addPipelineStage = addPipelineStage;
window.removePipelineStage = removePipelineStage;
window.savePipelineSettings = savePipelineSettings;
window.getStatusColorClass = getStatusColorClass;
