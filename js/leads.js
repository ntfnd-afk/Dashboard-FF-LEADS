// ========================================
// FF Dashboard - Leads Management Module
// ========================================

// ========================================
// FIELD VALIDATION FUNCTIONS
// ========================================

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('border-red-500', 'bg-red-50', 'dark:bg-red-900');
        field.classList.remove('border-gray-300', 'dark:border-gray-600');
        
        // Добавляем сообщение об ошибке
        let errorDiv = field.parentNode.querySelector('.field-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'field-error text-red-500 text-sm mt-1';
            field.parentNode.appendChild(errorDiv);
        }
        errorDiv.textContent = message;
    }
}

function clearFieldErrors() {
    const fields = ['leadClientName', 'leadPhone', 'leadSource', 'leadStatus'];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.remove('border-red-500', 'bg-red-50', 'dark:bg-red-900');
            field.classList.add('border-gray-300', 'dark:border-gray-600');
            
            const errorDiv = field.parentNode.querySelector('.field-error');
            if (errorDiv) {
                errorDiv.remove();
            }
        }
    });
}

function safeSetValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.value = value;
    } else {
        console.warn(`Element with id '${elementId}' not found`);
    }
}

function safeSetChecked(elementId, checked) {
    const element = document.getElementById(elementId);
    if (element) {
        element.checked = checked;
    } else {
        console.warn(`Element with id '${elementId}' not found`);
    }
}

// ========================================
// LEAD MANAGEMENT FUNCTIONS
// ========================================

function showAddLeadModal() {
    updateSelectOptions(); // Обновляем селекты перед показом модального окна
    clearFieldErrors(); // Очищаем ошибки валидации
    
    // Проверяем, редактируем ли мы лид
    const editingId = document.getElementById('addLeadModal').getAttribute('data-editing-id');
    const titleElement = document.getElementById('addLeadModalTitle');
    
    if (editingId) {
        titleElement.textContent = 'Редактирование лида';
    } else {
        titleElement.textContent = 'Добавить новый лид';
    }
    
    document.getElementById('addLeadModal').classList.remove('hidden');
}

function hideAddLeadModal() {
    document.getElementById('addLeadModal').classList.add('hidden');
    
    // Очищаем форму безопасно
    safeSetValue('leadClientName', '');
    safeSetValue('leadInn', '');
    safeSetValue('leadKpp', '');
    safeSetValue('leadContactPerson', '');
    safeSetValue('leadPhone', '');
    safeSetValue('leadEmail', '');
    safeSetValue('leadSource', '');
    safeSetValue('leadStatus', 'new');
    safeSetValue('leadComments', '');
    safeSetChecked('createCalculation', false);
    
    // Очищаем ошибки валидации
    clearFieldErrors();
    
    // Очищаем атрибут редактирования
    document.getElementById('addLeadModal').removeAttribute('data-editing-id');
}

async function addLead() {
    const clientName = document.getElementById('leadClientName').value.trim();
    const inn = document.getElementById('leadInn').value.trim();
    const kpp = document.getElementById('leadKpp').value.trim();
    const contactPerson = document.getElementById('leadContactPerson').value.trim();
    const phone = document.getElementById('leadPhone').value.trim();
    const email = document.getElementById('leadEmail').value.trim();
    const source = document.getElementById('leadSource').value;
    const status = document.getElementById('leadStatus').value;
    const comments = document.getElementById('leadComments').value.trim();
    const createCalculation = document.getElementById('createCalculation').checked;

    // Валидация обязательных полей
    let hasErrors = false;
    
    // Очищаем предыдущие ошибки
    clearFieldErrors();
    
    if (!clientName) {
        showFieldError('leadClientName', 'Название компании обязательно');
        hasErrors = true;
    }
    
    if (!phone) {
        showFieldError('leadPhone', 'Телефон обязателен');
        hasErrors = true;
    }
    
    if (!source) {
        showFieldError('leadSource', 'Источник обязателен');
        hasErrors = true;
    }
    
    if (!status) {
        showFieldError('leadStatus', 'Статус обязателен');
        hasErrors = true;
    }

    if (hasErrors) {
        showNotification('Заполните все обязательные поля', 'error');
        return;
    }

    try {
        const editingId = document.getElementById('addLeadModal').getAttribute('data-editing-id');
        
        // Подготавливаем данные для отправки
        const leadData = {
            name: clientName,
            phone: phone,
            source: source,
            status: status,
            notes: comments,
            inn: inn || null,
            kpp: kpp || null,
            contact_person: contactPerson || null,
            email: email || null
        };
        
        console.log('📤 Отправляем в БД:', leadData);
        console.log('📤 URL запроса:', `${API_BASE_URL}/leads${editingId ? `/${editingId}` : ''}`);
        console.log('📤 Метод:', editingId ? 'PUT' : 'POST');
        
        
        if (editingId) {
            // Редактируем существующий лид
            const response = await fetch(`${API_BASE_URL}/leads/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(leadData)
            });

            if (response.ok) {
                const updatedLead = await response.json();
                console.log('📥 Ответ от сервера:', updatedLead);
                console.log('📥 Статус ответа:', response.status);
                console.log('📥 Заголовки ответа:', response.headers);
                
                const index = leads.findIndex(l => l.id === parseInt(editingId));
                if (index !== -1) {
                    leads[index] = {
                        ...updatedLead,
                        clientName: updatedLead.client_name || updatedLead.name,
                        contact: updatedLead.phone,
                        comments: updatedLead.notes,
                        // Используем данные из ответа или fallback на отправленные данные
                        inn: updatedLead.inn || leadData.inn,
                        kpp: updatedLead.kpp || leadData.kpp,
                        contactPerson: updatedLead.contact_person || leadData.contact_person,
                        email: updatedLead.email || leadData.email
                    };
                }
                showNotification('Лид обновлен', 'success');
            } else {
                console.error('❌ Ошибка ответа сервера:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('❌ Текст ошибки:', errorText);
                throw new Error('Ошибка обновления лида');
            }
        } else {
            // Создаем новый лид
            const response = await fetch(`${API_BASE_URL}/leads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(leadData)
            });

            if (response.ok) {
                const newLead = await response.json();
                console.log('📥 Ответ от сервера при создании:', newLead);
                console.log('📥 Статус ответа:', response.status);
                
                leads.push({
                    ...newLead,
                    clientName: newLead.client_name || newLead.name,
                    contact: newLead.phone,
                    comments: newLead.notes,
                    // Используем данные из ответа или fallback на отправленные данные
                    inn: newLead.inn || leadData.inn,
                    kpp: newLead.kpp || leadData.kpp,
                    contactPerson: newLead.contact_person || leadData.contact_person,
                    email: newLead.email || leadData.email
                });
                showNotification('Лид добавлен', 'success');
            } else {
                console.error('❌ Ошибка ответа сервера при создании:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('❌ Текст ошибки:', errorText);
                throw new Error('Ошибка сохранения лида');
            }
        }

        localStorage.setItem('ff-leads', JSON.stringify(leads));
        hideAddLeadModal();
        updateLeadsTable();
        updateDashboard();
        updateKanbanBoard();

        // Если нужно создать расчет
        if (createCalculation) {
            setTimeout(() => {
                showTab('calculator');
                document.getElementById('clientName').value = clientName;
                document.getElementById('comments').value = comments;
            }, 500);
        }

    } catch (error) {
        console.error('Ошибка добавления лида:', error);
        showNotification('Ошибка добавления лида', 'error');
    }
}

function editLead(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    console.log('🔍 Редактируем лид:', lead);
    console.log('🔍 Поля лида:', {
        inn: lead.inn,
        kpp: lead.kpp,
        contactPerson: lead.contactPerson,
        email: lead.email
    });

    // Store lead ID for editing
    document.getElementById('addLeadModal').setAttribute('data-editing-id', leadId);
    
    // Show modal first to update select options
    showAddLeadModal();
    
    // Fill form with lead data AFTER select options are updated
    safeSetValue('leadClientName', lead.clientName || lead.name || '');
    safeSetValue('leadInn', lead.inn || '');
    safeSetValue('leadKpp', lead.kpp || '');
    safeSetValue('leadContactPerson', lead.contactPerson || '');
    safeSetValue('leadPhone', lead.contact || lead.phone || '');
    safeSetValue('leadEmail', lead.email || '');
    safeSetValue('leadSource', lead.source || '');
    safeSetValue('leadStatus', lead.status || 'new');
    safeSetValue('leadComments', lead.comments || lead.notes || '');
    safeSetChecked('createCalculation', false);
}

async function deleteLead(leadId) {
    // Проверяем права доступа
    if (!hasPermission('delete_leads')) {
        showNotification('У вас нет прав для удаления лидов. Обратитесь к администратору.', 'error');
        return;
    }
    
    if (!confirm('Вы уверены, что хотите удалить этого лида?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            leads = leads.filter(l => l.id !== leadId);
            localStorage.setItem('ff-leads', JSON.stringify(leads));
            updateLeadsTable();
            updateDashboard();
            updateKanbanBoard();
            showNotification('Лид удален', 'success');
        } else {
            throw new Error('Ошибка удаления лида');
        }
    } catch (error) {
        console.error('Ошибка удаления лида:', error);
        showNotification('Ошибка удаления лида', 'error');
    }
}

function openLeadCalculator(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    showTab('calculator');
    
    // Заполняем данные клиента
    document.getElementById('clientName').value = lead.clientName || lead.name || '';
    document.getElementById('comments').value = lead.comments || lead.notes || '';
    
    // Если у лида есть расчет, загружаем его
    if (lead.calculation) {
        calculationItems = lead.calculation.items || [];
        nextItemId = Math.max(...calculationItems.map(item => item.id), 0) + 1;
        document.getElementById('markup').value = lead.calculation.markup || 0;
        updateCalculationTable();
    } else {
        // Очищаем калькулятор
        calculationItems = [];
        nextItemId = 1;
        document.getElementById('markup').value = 0;
        updateCalculationTable();
    }
}

function openLeadDetails(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    // Открываем модальное окно с деталями лида
    viewLeadDetails(leadId);
}

// ========================================
// LEAD DETAILS FUNCTIONS
// ========================================

let currentLeadDetails = null;

function viewLeadDetails(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) {
        showNotification('Лид не найден', 'error');
        return;
    }
    
    currentLeadDetails = lead;
    populateLeadDetails(lead);
    showLeadDetailsModal();
}

function showLeadDetailsModal() {
    document.getElementById('leadDetailsModal').classList.remove('hidden');
    
    // Обновляем UI в зависимости от роли
    updateLeadDetailsUI();
    
    // Инициализируем иконки
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function hideLeadDetails() {
    document.getElementById('leadDetailsModal').classList.add('hidden');
    currentLeadDetails = null;
}

function populateLeadDetails(lead) {
    // Заголовок и подзаголовок
    document.getElementById('leadDetailsTitle').textContent = lead.clientName || lead.name || 'Без названия';
    document.getElementById('leadDetailsSubtitle').textContent = `Лид #${lead.id} - ${getStatusText(lead.status)}`;
    
    // Номер лида
    document.getElementById('leadDetailsId').textContent = `#${lead.id.toString().padStart(4, '0')}`;
    
    // Статус
    const statusElement = document.getElementById('leadDetailsStatus');
    statusElement.textContent = getStatusText(lead.status);
    statusElement.className = `inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(lead.status)}`;
    
    // Информация о клиенте
    document.getElementById('leadDetailsCompany').textContent = lead.clientName || lead.name || 'Не указано';
    document.getElementById('leadDetailsInn').textContent = lead.inn || 'Не указан';
    document.getElementById('leadDetailsKpp').textContent = lead.kpp || 'Не указан';
    document.getElementById('leadDetailsContact').textContent = lead.contactPerson || lead.contact || 'Не указано';
    document.getElementById('leadDetailsPhone').textContent = lead.phone || lead.contact || 'Не указан';
    document.getElementById('leadDetailsEmail').textContent = lead.email || 'Не указан';
    
    // Информация о лиде
    const sourceElement = document.getElementById('leadDetailsSource');
    sourceElement.textContent = getSourceText(lead.source);
    sourceElement.className = `inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getSourceColor(lead.source)}`;
    
    document.getElementById('leadDetailsCreatedAt').textContent = formatDate(lead.createdAt || lead.created_at);
    document.getElementById('leadDetailsUpdatedAt').textContent = formatDate(lead.updatedAt || lead.updated_at || lead.createdAt || lead.created_at);
    document.getElementById('leadDetailsResponsible').textContent = currentUser?.full_name || 'Не назначен';
    
    // Комментарии
    document.getElementById('leadDetailsComments').textContent = lead.comments || lead.notes || 'Комментарии отсутствуют';
    
    // Расчеты
    populateLeadCalculations(lead);
}

function populateLeadCalculations(lead) {
    const calculationsSection = document.getElementById('leadDetailsCalculations');
    if (!calculationsSection) return;
    
    // Получаем расчеты для лида
    const leadCalculations = typeof window.getCalculationsForLead === 'function' ? 
        window.getCalculationsForLead(lead.id) : [];
    
    if (leadCalculations.length === 0) {
        calculationsSection.innerHTML = `
            <div class="text-center py-6">
                <div class="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i data-lucide="calculator" class="h-6 w-6 text-gray-400"></i>
                </div>
                <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Расчетов не найдено
                </h4>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Для этого лида еще не было создано расчетов
                </p>
                <button onclick="openLeadCalculatorFromDetails()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center mx-auto text-sm">
                    <i data-lucide="plus" class="h-4 w-4 mr-2"></i>
                    Добавить расчет
                </button>
            </div>
        `;
    } else {
        const totalAmount = leadCalculations.reduce((sum, calc) => sum + (calc.totalAmount || 0), 0);
        
        calculationsSection.innerHTML = `
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="text-sm font-medium text-gray-900 dark:text-white">
                            Расчеты (${leadCalculations.length})
                        </h4>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            Общая сумма: <span class="font-semibold text-green-600 dark:text-green-400">${formatCurrency(totalAmount)}</span>
                        </p>
                    </div>
                    <button onclick="openLeadCalculatorFromDetails()" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center text-xs">
                        <i data-lucide="plus" class="h-3 w-3 mr-1"></i>
                        Добавить
                    </button>
                </div>
                
                <div class="space-y-2">
                    ${leadCalculations.slice(0, 3).map(calc => `
                        <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div>
                                <div class="text-xs font-medium text-gray-900 dark:text-white">#${calc.id}</div>
                                <div class="text-xs text-gray-500 dark:text-gray-400">${calc.calculationDate || 'Без даты'}</div>
                            </div>
                            <div class="text-xs font-semibold text-gray-900 dark:text-white">${formatCurrency(calc.totalAmount || 0)}</div>
                        </div>
                    `).join('')}
                    
                    ${leadCalculations.length > 3 ? `
                        <div class="text-center">
                            <button onclick="openCalculatorForLead(${lead.id})" class="text-xs text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                                Показать все расчеты (${leadCalculations.length})
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // Обновляем иконки Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function updateLeadDetailsUI() {
    // Скрываем кнопку удаления для менеджеров
    const deleteBtn = document.getElementById('deleteLeadFromDetailsBtn');
    if (deleteBtn) {
        if (hasPermission('delete_leads')) {
            deleteBtn.style.display = 'inline-flex';
        } else {
            deleteBtn.style.display = 'none';
        }
    }
}

// Действия из детального окна
function editLeadFromDetails() {
    if (currentLeadDetails) {
        hideLeadDetails();
        editLead(currentLeadDetails.id);
    }
}

function openLeadCalculatorFromDetails() {
    if (currentLeadDetails) {
        // Открываем калькулятор в модальном окне
        if (typeof window.showCalculatorModal === 'function') {
            window.showCalculatorModal(currentLeadDetails.id);
        } else {
            // Fallback - переключаемся на вкладку калькулятора
            hideLeadDetails();
            openLeadCalculator(currentLeadDetails.id);
        }
    }
}

function createReminderFromDetails() {
    if (currentLeadDetails) {
        hideLeadDetails();
        // Открываем модальное окно создания напоминания с предзаполненным текстом
        const reminderText = `Связаться с клиентом: ${currentLeadDetails.clientName || currentLeadDetails.name}`;
        document.getElementById('reminderText').value = reminderText;
        showAddReminderModal();
    }
}

function changeStatusFromDetails() {
    if (currentLeadDetails) {
        // Показываем выбор статуса
        const statusOptions = leadStatuses.map(status => 
            `<option value="${status.id}" ${status.id === currentLeadDetails.status ? 'selected' : ''}>${status.name}</option>`
        ).join('');
        
        const newStatus = prompt(`Выберите новый статус для лида #${currentLeadDetails.id}:\n\n${leadStatuses.map(s => `${s.id}. ${s.name}`).join('\n')}\n\nВведите номер статуса:`, currentLeadDetails.status);
        
        if (newStatus && newStatus !== currentLeadDetails.status) {
            // Обновляем статус лида
            const leadIndex = leads.findIndex(l => l.id === currentLeadDetails.id);
            if (leadIndex !== -1) {
                leads[leadIndex].status = newStatus;
                leads[leadIndex].updatedAt = new Date().toISOString();
                
                // Сохраняем изменения
                localStorage.setItem('ff-leads', JSON.stringify(leads));
                
                // Обновляем UI
                updateLeadsTable();
                updateKanbanBoard();
                updateDashboard();
                
                // Обновляем детальное окно
                currentLeadDetails.status = newStatus;
                populateLeadDetails(currentLeadDetails);
                
                showNotification('Статус лида обновлен', 'success');
            }
        }
    }
}

function convertLeadFromDetails() {
    if (currentLeadDetails) {
        hideLeadDetails();
        
        // Предзаполняем форму конвертации
        const leadSelect = document.getElementById('leadToConvert');
        if (leadSelect) {
            leadSelect.value = currentLeadDetails.id;
            // Обновляем превью
            if (typeof updateConversionPreview === 'function') {
                updateConversionPreview();
            }
        }
        
        showConvertLeadModal();
    }
}

// ========================================
// LEADS TABLE FUNCTIONS
// ========================================

function updateLeadsTable() {
    // Показываем краткий индикатор загрузки при обновлении таблицы
    if (typeof showLoading === 'function') {
        showLoading('Обновление списка лидов...');
    }
    
    updateLeadsTableWithData(leads);
    
    // Обновляем селекторы фильтров при обновлении таблицы лидов
    updateSelectOptions();
    
    // Скрываем индикатор загрузки
    if (typeof hideLoading === 'function') {
        setTimeout(() => {
            hideLoading();
        }, 200);
    }
}

function updateLeadsTableWithData(leadsToShow) {
    const tbody = document.getElementById('leadsTableBody');
    if (!tbody) return;

    if (leadsToShow.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Нет лидов. Нажмите "Добавить лид" для создания первого лида.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = leadsToShow.map(lead => {
        const canDelete = hasPermission('delete_leads');
        const deleteButton = canDelete ? 
            `<button onclick="deleteLead(${lead.id})" class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Удалить лид">
                <i data-lucide="trash-2" class="h-4 w-4"></i>
            </button>` : '';

        return `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                ${lead.clientName || lead.name || 'Без имени'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                ${lead.contact || lead.phone || '-'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                ${getSourceText(lead.source)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead.status)}">
                    ${getStatusText(lead.status)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                ${createCalculationsCell(lead)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                ${formatDate(lead.createdAt || lead.created_at)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                    <button onclick="viewLeadDetails(${lead.id})" class="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300" title="Просмотр деталей">
                        <i data-lucide="eye" class="h-4 w-4"></i>
                    </button>
                    <button onclick="editLead(${lead.id})" class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" title="Редактировать">
                        <i data-lucide="edit" class="h-4 w-4"></i>
                    </button>
                    <button onclick="openCalculatorForLead(${lead.id})" class="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300" title="Калькулятор">
                        <i data-lucide="calculator" class="h-4 w-4"></i>
                    </button>
                    ${deleteButton}
                </div>
            </td>
        </tr>
        `;
    }).join('');

    lucide.createIcons();
}

function filterLeads() {
    const statusFilter = document.getElementById('statusFilter').value;
    const sourceFilter = document.getElementById('sourceFilter').value;
    const searchTerm = document.getElementById('searchLeads').value.toLowerCase();

    let filteredLeads = leads;

    // Фильтр по статусу
    if (statusFilter) {
        filteredLeads = filteredLeads.filter(lead => lead.status === statusFilter);
    }

    // Фильтр по источнику
    if (sourceFilter) {
        filteredLeads = filteredLeads.filter(lead => lead.source === sourceFilter);
    }

    // Поиск по имени или контакту
    if (searchTerm) {
        filteredLeads = filteredLeads.filter(lead => 
            (lead.clientName || lead.name || '').toLowerCase().includes(searchTerm) ||
            (lead.contact || lead.phone || '').toLowerCase().includes(searchTerm)
        );
    }

    updateLeadsTableWithData(filteredLeads);
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function getStatusText(statusId) {
    const status = leadStatuses.find(s => s.id === statusId);
    return status ? status.name : statusId;
}

function getSourceText(sourceId) {
    const source = leadSources.find(s => s.id === sourceId);
    return source ? source.name : sourceId;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function getSourceColor(sourceId) {
    const colorMap = {
        website: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        instagram: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
        facebook: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        google: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        yandex: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        referral: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        phone: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };
    return colorMap[sourceId] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
}

function formatDate(dateString) {
    if (!dateString) return 'Не указано';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

function getStatusColor(statusId) {
    const status = leadStatuses.find(s => s.id === statusId);
    if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    
    const colorMap = {
        blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
        orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
        green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };
    
    return colorMap[status.color] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
}

function updateSelectOptions() {
    console.log('🔄 Обновляем селекторы фильтров...');
    console.log('leadStatuses:', leadStatuses);
    console.log('leadSources:', leadSources);
    
    // Обновляем селект статусов в форме добавления лида
    const statusSelect = document.getElementById('leadStatus');
    if (statusSelect && leadStatuses && leadStatuses.length > 0) {
        statusSelect.innerHTML = leadStatuses.map(status => 
            `<option value="${status.id}">${status.name}</option>`
        ).join('');
        console.log('✅ Селект статусов в форме обновлен');
    }

    // Обновляем селект источников в форме добавления лида
    const sourceSelect = document.getElementById('leadSource');
    if (sourceSelect && leadSources && leadSources.length > 0) {
        sourceSelect.innerHTML = leadSources.map(source => 
            `<option value="${source.id}">${source.name}</option>`
        ).join('');
        console.log('✅ Селект источников в форме обновлен');
    }

    // Обновляем селекты в фильтрах
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter && leadStatuses && leadStatuses.length > 0) {
        statusFilter.innerHTML = `
            <option value="">Все статусы</option>
            ${leadStatuses.map(status => 
                `<option value="${status.id}">${status.name}</option>`
            ).join('')}
        `;
        console.log('✅ Фильтр статусов обновлен');
    }

    const sourceFilter = document.getElementById('sourceFilter');
    if (sourceFilter && leadSources && leadSources.length > 0) {
        sourceFilter.innerHTML = `
            <option value="">Все источники</option>
            ${leadSources.map(source => 
                `<option value="${source.id}">${source.name}</option>`
            ).join('')}
        `;
        console.log('✅ Фильтр источников обновлен');
    }
    
    console.log('✅ Все селекторы обновлены');
}

// ========================================
// EXPORT FOR OTHER MODULES
// ========================================

// Экспортируем функции управления лидами для других модулей
window.FFLeads = {
    showAddLeadModal,
    hideAddLeadModal,
    addLead,
    editLead,
    deleteLead,
    openLeadCalculator,
    openLeadDetails,
    updateLeadsTable,
    updateLeadsTableWithData,
    filterLeads,
    getStatusText,
    getSourceText,
    getStatusColor,
    updateSelectOptions,
    viewLeadDetails,
    showLeadDetailsModal,
    hideLeadDetails,
    populateLeadDetails,
    populateLeadCalculations,
    updateLeadDetailsUI,
    editLeadFromDetails,
    openLeadCalculatorFromDetails,
    createReminderFromDetails,
    changeStatusFromDetails,
    deleteLeadFromDetails,
    convertLeadFromDetails
};

// Make functions available globally for onclick attributes
window.showAddLeadModal = showAddLeadModal;
window.hideAddLeadModal = hideAddLeadModal;
window.saveLead = saveLead;
window.editLead = editLead;
window.deleteLead = deleteLead;
window.openLeadCalculator = openLeadCalculator;
window.openLeadDetails = openLeadDetails;
window.updateLeadsTable = updateLeadsTable;
window.updateLeadsTableWithData = updateLeadsTableWithData;
window.filterLeads = filterLeads;
window.getStatusText = getStatusText;
window.getSourceText = getSourceText;
window.getStatusColor = getStatusColor;
window.updateSelectOptions = updateSelectOptions;
window.clearFilters = clearFilters;

// Lead Details functions
window.viewLeadDetails = viewLeadDetails;
window.showLeadDetailsModal = showLeadDetailsModal;
window.hideLeadDetails = hideLeadDetails;
window.populateLeadDetails = populateLeadDetails;
window.populateLeadCalculations = populateLeadCalculations;
window.updateLeadDetailsUI = updateLeadDetailsUI;
window.editLeadFromDetails = editLeadFromDetails;
window.openLeadCalculatorFromDetails = openLeadCalculatorFromDetails;
window.createReminderFromDetails = createReminderFromDetails;
window.changeStatusFromDetails = changeStatusFromDetails;
window.deleteLeadFromDetails = deleteLeadFromDetails;
window.convertLeadFromDetails = convertLeadFromDetails;

// Функции для работы с расчетами в таблице лидов
function createCalculationsCell(lead) {
    // Получаем расчеты для лида
    const leadCalculations = typeof window.getCalculationsForLead === 'function' ? 
        window.getCalculationsForLead(lead.id) : [];
    
    if (leadCalculations.length === 0) {
        return `
            <div class="flex items-center space-x-2">
                <span class="text-gray-400">Нет расчетов</span>
                <button onclick="openCalculatorForLead(${lead.id})" class="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300" title="Создать расчет">
                    <i data-lucide="plus" class="h-4 w-4"></i>
                </button>
            </div>
        `;
    }
    
    const totalAmount = leadCalculations.reduce((sum, calc) => sum + (calc.totalAmount || 0), 0);
    
    return `
        <div class="space-y-1">
            <div class="flex items-center space-x-2">
                <span class="text-sm font-medium text-gray-900 dark:text-white">${leadCalculations.length} расчетов</span>
                <span class="text-sm font-bold text-green-600 dark:text-green-400">${formatCurrency(totalAmount)}</span>
            </div>
            <button onclick="toggleCalculationsAccordion(${lead.id})" class="text-xs text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                <i data-lucide="chevron-down" class="h-3 w-3 mr-1 inline"></i>
                Показать расчеты
            </button>
            <div id="calculations-${lead.id}" class="hidden mt-2 space-y-1">
                ${leadCalculations.map(calc => `
                    <div class="text-xs bg-gray-50 dark:bg-gray-700 rounded p-2">
                        <div class="flex justify-between items-center">
                            <span class="text-gray-700 dark:text-gray-300">#${calc.id}</span>
                            <span class="font-semibold text-gray-900 dark:text-white">${formatCurrency(calc.totalAmount || 0)}</span>
                        </div>
                        <div class="text-gray-500 dark:text-gray-400">${calc.calculationDate || 'Без даты'}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function toggleCalculationsAccordion(leadId) {
    const accordion = document.getElementById(`calculations-${leadId}`);
    if (accordion) {
        accordion.classList.toggle('hidden');
        
        // Обновляем иконку
        const button = accordion.previousElementSibling;
        const icon = button.querySelector('i');
        if (accordion.classList.contains('hidden')) {
            icon.setAttribute('data-lucide', 'chevron-down');
        } else {
            icon.setAttribute('data-lucide', 'chevron-up');
        }
        
        // Обновляем иконки Lucide
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
}

// Экспортируем новые функции
window.createCalculationsCell = createCalculationsCell;
window.toggleCalculationsAccordion = toggleCalculationsAccordion;
