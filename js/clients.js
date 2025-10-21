// ========================================
// FF Dashboard - Clients Management Module
// ========================================

// ========================================
// CLIENTS DATA
// ========================================

var clients = [];
var nextClientId = 1;

// ========================================
// CLIENT CONVERSION FUNCTIONS
// ========================================

function showConvertLeadModal() {
    // Загружаем доступные лиды для конвертации
    loadLeadsForConversion();
    
    // Устанавливаем текущую дату
    document.getElementById('clientStartDate').value = new Date().toISOString().split('T')[0];
    
    // Загружаем менеджеров
    loadManagersForClient();
    
    document.getElementById('convertLeadModal').classList.remove('hidden');
    
    // Инициализируем иконки
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function hideConvertLeadModal() {
    document.getElementById('convertLeadModal').classList.add('hidden');
    
    // Очищаем форму
    document.getElementById('leadToConvert').value = '';
    document.getElementById('clientStatus').value = 'active';
    document.getElementById('clientStartDate').value = '';
    document.getElementById('clientManager').value = '';
    document.getElementById('clientType').value = 'regular';
    document.getElementById('conversionComments').value = '';
    document.getElementById('keepLeadHistory').checked = true;
    document.getElementById('sendWelcomeEmail').checked = false;
    
    // Скрываем превью
    document.getElementById('conversionPreview').classList.add('hidden');
}

function loadLeadsForConversion() {
    const select = document.getElementById('leadToConvert');
    select.innerHTML = '<option value="">Выберите лид...</option>';
    
    // Фильтруем только лиды, которые еще не конвертированы
    const availableLeads = leads.filter(lead => !lead.convertedToClient);
    
    availableLeads.forEach(lead => {
        const option = document.createElement('option');
        option.value = lead.id;
        option.textContent = `#${lead.id.toString().padStart(4, '0')} - ${lead.clientName || lead.name || 'Без названия'} (${getStatusText(lead.status)})`;
        select.appendChild(option);
    });
    
    // Добавляем обработчик изменения
    select.addEventListener('change', updateConversionPreview);
}

function loadManagersForClient() {
    const select = document.getElementById('clientManager');
    select.innerHTML = '<option value="">Выберите менеджера...</option>';
    
    // Добавляем текущего пользователя
    if (currentUser) {
        const option = document.createElement('option');
        option.value = currentUser.id || currentUser.username;
        option.textContent = currentUser.full_name || currentUser.username;
        option.selected = true; // По умолчанию текущий пользователь
        select.appendChild(option);
    }
    
    // Здесь можно добавить загрузку других пользователей из API
}

function updateConversionPreview() {
    const leadId = document.getElementById('leadToConvert').value;
    const preview = document.getElementById('conversionPreview');
    const previewContent = document.getElementById('previewContent');
    
    if (!leadId) {
        preview.classList.add('hidden');
        return;
    }
    
    const lead = leads.find(l => l.id == leadId);
    if (!lead) {
        preview.classList.add('hidden');
        return;
    }
    
    const clientStatus = document.getElementById('clientStatus').value;
    const clientType = document.getElementById('clientType').value;
    const clientManager = document.getElementById('clientManager').value;
    const startDate = document.getElementById('clientStartDate').value;
    
    previewContent.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <strong>Клиент:</strong> ${lead.clientName || lead.name || 'Без названия'}<br>
                <strong>ИНН:</strong> ${lead.inn || 'Не указан'}<br>
                <strong>Контакт:</strong> ${lead.contactPerson || lead.contact || 'Не указан'}<br>
                <strong>Телефон:</strong> ${lead.phone || 'Не указан'}
            </div>
            <div>
                <strong>Статус клиента:</strong> ${getClientStatusText(clientStatus)}<br>
                <strong>Тип клиента:</strong> ${getClientTypeText(clientType)}<br>
                <strong>Менеджер:</strong> ${getManagerName(clientManager)}<br>
                <strong>Дата начала:</strong> ${startDate || 'Сегодня'}
            </div>
        </div>
    `;
    
    preview.classList.remove('hidden');
}

function getClientStatusText(status) {
    const statusMap = {
        'active': 'Активный',
        'inactive': 'Неактивный',
        'suspended': 'Приостановленный'
    };
    return statusMap[status] || status;
}

function getClientTypeText(type) {
    const typeMap = {
        'regular': 'Обычный',
        'vip': 'VIP',
        'wholesale': 'Оптовый'
    };
    return typeMap[type] || type;
}

function getManagerName(managerId) {
    if (currentUser && (currentUser.id == managerId || currentUser.username == managerId)) {
        return currentUser.full_name || currentUser.username;
    }
    return 'Не назначен';
}

async function convertLeadToClient() {
    const leadId = document.getElementById('leadToConvert').value;
    const clientStatus = document.getElementById('clientStatus').value;
    const clientType = document.getElementById('clientType').value;
    const clientManager = document.getElementById('clientManager').value;
    const startDate = document.getElementById('clientStartDate').value;
    const comments = document.getElementById('conversionComments').value.trim();
    const keepHistory = document.getElementById('keepLeadHistory').checked;
    const sendEmail = document.getElementById('sendWelcomeEmail').checked;
    
    if (!leadId) {
        showNotification('Выберите лид для конвертации', 'error');
        return;
    }
    
    const lead = leads.find(l => l.id == leadId);
    if (!lead) {
        showNotification('Лид не найден', 'error');
        return;
    }
    
    try {
        // Создаем клиента на основе лида
        const newClient = {
            id: nextClientId++,
            leadId: lead.id,
            clientName: lead.clientName || lead.name,
            inn: lead.inn,
            kpp: lead.kpp,
            contactPerson: lead.contactPerson || lead.contact,
            phone: lead.phone,
            email: lead.email,
            source: lead.source,
            status: clientStatus,
            type: clientType,
            manager: clientManager,
            startDate: startDate || new Date().toISOString().split('T')[0],
            comments: comments,
            convertedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            totalRevenue: 0,
            ordersCount: 0
        };
        
        // Сохраняем клиента
        clients.push(newClient);
        localStorage.setItem('ff-clients', JSON.stringify(clients));
        
        // Сохраняем в API (если доступен)
        if (isOnline) {
            try {
                const response = await fetch(`${API_BASE_URL}/clients`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lead_id: lead.id,
                        client_name: newClient.clientName,
                        inn: newClient.inn,
                        kpp: newClient.kpp,
                        contact_person: newClient.contactPerson,
                        phone: newClient.phone,
                        email: newClient.email,
                        source: newClient.source,
                        status: newClient.status,
                        type: newClient.type,
                        manager: newClient.manager,
                        start_date: newClient.startDate,
                        comments: newClient.comments,
                        converted_at: newClient.convertedAt
                    })
                });
                
                if (response.ok) {
                    const savedClient = await response.json();
                    // Обновляем ID клиента с сервера
                    newClient.id = savedClient.id;
                    newClient.serverId = savedClient.id;
                }
            } catch (apiError) {
                console.log('⚠️ Ошибка сохранения клиента в API:', apiError);
            }
        }
        
        // Обновляем лид
        const leadIndex = leads.findIndex(l => l.id == leadId);
        if (leadIndex !== -1) {
            leads[leadIndex].convertedToClient = true;
            leads[leadIndex].clientId = newClient.id;
            leads[leadIndex].updatedAt = new Date().toISOString();
        }
        
        // Сохраняем обновленные лиды
        localStorage.setItem('ff-leads', JSON.stringify(leads));
        
        // Обновляем UI
        updateClientsTable();
        updateLeadsTable();
        updateDashboard();
        updateKanbanBoard();
        
        hideConvertLeadModal();
        showNotification(`Лид #${lead.id} успешно конвертирован в клиента #${newClient.id}`, 'success');
        
        // Если нужно отправить email
        if (sendEmail) {
            // Здесь можно добавить отправку приветственного письма
            console.log('Отправка приветственного письма клиенту:', newClient.email);
        }
        
    } catch (error) {
        console.error('Ошибка конвертации лида:', error);
        showNotification('Ошибка конвертации лида', 'error');
    }
}

// ========================================
// CLIENTS TABLE FUNCTIONS
// ========================================

function updateClientsTable() {
    // Показываем краткий индикатор загрузки
    if (typeof showLoading === 'function') {
        showLoading('Обновление списка клиентов...');
    }
    
    updateClientsTableWithData(clients);
    
    // Обновляем счетчик
    document.getElementById('totalClientsCount').textContent = clients.length;
    
    // Скрываем индикатор загрузки
    if (typeof hideLoading === 'function') {
        setTimeout(() => {
            hideLoading();
        }, 200);
    }
}

function updateClientsTableWithData(clientsToShow) {
    const tbody = document.getElementById('clientsTableBody');
    if (!tbody) return;

    if (clientsToShow.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Нет клиентов. Конвертируйте лид в клиента для начала работы.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = clientsToShow.map(client => {
        const canDelete = hasPermission('delete_leads'); // Используем те же права
        const deleteButton = canDelete ? 
            `<button onclick="deleteClient(${client.id})" class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Удалить клиента">
                <i data-lucide="trash-2" class="h-4 w-4"></i>
            </button>` : '';

        return `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-3">
                        <i data-lucide="user-check" class="h-5 w-5 text-green-600 dark:text-green-400"></i>
                    </div>
                    <div>
                        <div class="text-sm font-medium text-gray-900 dark:text-white">
                            ${client.clientName || 'Без названия'}
                        </div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">
                            #${client.id.toString().padStart(4, '0')}
                        </div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900 dark:text-white">
                    ${client.contactPerson || 'Не указано'}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                    ${client.phone || 'Не указан'}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getClientStatusColor(client.status)}">
                    ${getClientStatusText(client.status)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                ${formatDate(client.convertedAt)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                ${formatCurrency(client.totalRevenue || 0)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                    <button onclick="viewClientDetails(${client.id})" class="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300" title="Просмотр деталей">
                        <i data-lucide="eye" class="h-4 w-4"></i>
                    </button>
                    <button onclick="editClient(${client.id})" class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" title="Редактировать">
                        <i data-lucide="edit" class="h-4 w-4"></i>
                    </button>
                    <button onclick="createClientOrder(${client.id})" class="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300" title="Создать заказ">
                        <i data-lucide="shopping-cart" class="h-4 w-4"></i>
                    </button>
                    ${deleteButton}
                </div>
            </td>
        </tr>
        `;
    }).join('');

    lucide.createIcons();
}

function getClientStatusColor(status) {
    const colorMap = {
        'active': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'inactive': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
        'suspended': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
}

function filterClients() {
    const statusFilter = document.getElementById('clientStatusFilter').value;
    const sourceFilter = document.getElementById('clientSourceFilter').value;
    const searchTerm = document.getElementById('searchClients').value.toLowerCase();
    
    let filteredClients = clients;
    
    // Фильтр по статусу
    if (statusFilter) {
        filteredClients = filteredClients.filter(client => client.status === statusFilter);
    }
    
    // Фильтр по источнику
    if (sourceFilter) {
        filteredClients = filteredClients.filter(client => client.source === sourceFilter);
    }
    
    // Поиск
    if (searchTerm) {
        filteredClients = filteredClients.filter(client => 
            (client.clientName && client.clientName.toLowerCase().includes(searchTerm)) ||
            (client.contactPerson && client.contactPerson.toLowerCase().includes(searchTerm)) ||
            (client.phone && client.phone.includes(searchTerm))
        );
    }
    
    updateClientsTableWithData(filteredClients);
}

function clearClientFilters() {
    document.getElementById('clientStatusFilter').value = '';
    document.getElementById('clientSourceFilter').value = '';
    document.getElementById('searchClients').value = '';
    updateClientsTable();
}

// ========================================
// CLIENT MANAGEMENT FUNCTIONS
// ========================================

function viewClientDetails(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client) {
        showNotification('Клиент не найден', 'error');
        return;
    }
    
    // Здесь можно добавить детальное окно клиента
    showNotification(`Просмотр клиента: ${client.clientName}`, 'info');
}

function editClient(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client) {
        showNotification('Клиент не найден', 'error');
        return;
    }
    
    // Здесь можно добавить редактирование клиента
    showNotification(`Редактирование клиента: ${client.clientName}`, 'info');
}

function createClientOrder(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client) {
        showNotification('Клиент не найден', 'error');
        return;
    }
    
    // Здесь можно добавить создание заказа для клиента
    showNotification(`Создание заказа для клиента: ${client.clientName}`, 'info');
}

function deleteClient(clientId) {
    // Проверяем права доступа
    if (!hasPermission('delete_leads')) {
        showNotification('У вас нет прав для удаления клиентов. Обратитесь к администратору.', 'error');
        return;
    }
    
    if (!confirm('Вы уверены, что хотите удалить этого клиента?')) return;

    try {
        const clientIndex = clients.findIndex(c => c.id === clientId);
        if (clientIndex !== -1) {
            clients.splice(clientIndex, 1);
            localStorage.setItem('ff-clients', JSON.stringify(clients));
            
            // Обновляем связанный лид
            const relatedLead = leads.find(l => l.clientId === clientId);
            if (relatedLead) {
                relatedLead.convertedToClient = false;
                relatedLead.clientId = null;
                localStorage.setItem('ff-leads', JSON.stringify(leads));
            }
            
            updateClientsTable();
            updateLeadsTable();
            updateDashboard();
            showNotification('Клиент удален', 'success');
        }
    } catch (error) {
        console.error('Ошибка удаления клиента:', error);
        showNotification('Ошибка удаления клиента', 'error');
    }
}

// ========================================
// DATA LOADING
// ========================================

function loadClientsFromStorage() {
    const savedClients = localStorage.getItem('ff-clients');
    if (savedClients) {
        clients = JSON.parse(savedClients);
        // Обновляем nextClientId
        if (clients.length > 0) {
            nextClientId = Math.max(...clients.map(c => c.id)) + 1;
        }
    }
}

async function loadClientsFromAPI() {
    if (!isOnline) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/clients`);
        if (response.ok) {
            const apiClients = await response.json();
            
            // Обновляем клиентов из API
            clients = apiClients.map(client => ({
                id: client.id,
                leadId: client.lead_id,
                clientName: client.client_name,
                inn: client.inn,
                kpp: client.kpp,
                contactPerson: client.contact_person,
                phone: client.phone,
                email: client.email,
                source: client.source,
                status: client.status,
                type: client.type,
                manager: client.manager,
                startDate: client.start_date,
                comments: client.comments,
                convertedAt: client.converted_at,
                createdAt: client.created_at,
                updatedAt: client.updated_at,
                totalRevenue: client.total_revenue || 0,
                ordersCount: client.orders_count || 0,
                serverId: client.id
            }));
            
            // Сохраняем в localStorage
            localStorage.setItem('ff-clients', JSON.stringify(clients));
            
            // Обновляем nextClientId
            if (clients.length > 0) {
                nextClientId = Math.max(...clients.map(c => c.id)) + 1;
            }
            
            console.log('✅ Клиенты загружены из API:', clients.length);
        }
    } catch (error) {
        console.log('⚠️ Ошибка загрузки клиентов из API:', error);
    }
}

// ========================================
// EXPORT FOR OTHER MODULES
// ========================================

// Экспортируем функции управления клиентами для других модулей
window.FFClients = {
    showConvertLeadModal,
    hideConvertLeadModal,
    convertLeadToClient,
    updateClientsTable,
    updateClientsTableWithData,
    filterClients,
    clearClientFilters,
    viewClientDetails,
    editClient,
    createClientOrder,
    deleteClient,
    loadClientsFromStorage,
    loadClientsFromAPI,
    getClientStatusText,
    getClientStatusColor
};

// Make functions available globally for onclick attributes
window.showConvertLeadModal = showConvertLeadModal;
window.hideConvertLeadModal = hideConvertLeadModal;
window.convertLeadToClient = convertLeadToClient;
window.updateClientsTable = updateClientsTable;
window.filterClients = filterClients;
window.clearClientFilters = clearClientFilters;
window.viewClientDetails = viewClientDetails;
window.editClient = editClient;
window.createClientOrder = createClientOrder;
window.deleteClient = deleteClient;
