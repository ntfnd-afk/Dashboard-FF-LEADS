// calculator.js
// Модальный калькулятор для лидов

let currentLeadForCalculation = null;
let modalServices = [];
let nextServiceId = 1;
let calculations = []; // Массив всех расчетов
let nextCalculationId = 1; // Счетчик для ID расчетов

// ========================================
// CALCULATIONS MANAGEMENT FUNCTIONS
// ========================================

// Загрузка расчетов из localStorage
function loadCalculationsFromStorage() {
    try {
        const stored = localStorage.getItem('ff-calculations');
        if (stored) {
            calculations = JSON.parse(stored);
            if (calculations.length > 0) {
                nextCalculationId = Math.max(...calculations.map(c => c.id)) + 1;
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки расчетов:', error);
        calculations = [];
    }
}

// Загрузка расчетов из базы данных
async function loadCalculationsFromDatabase() {
    try {
        if (typeof isOnline === 'function' && isOnline()) {
            const response = await fetch(`${API_BASE_URL}/calculations`);
            if (response.ok) {
                const apiCalculations = await response.json();
                
                // Нормализуем данные для фронтенда
                calculations = apiCalculations.map(calc => ({
                    id: calc.id,
                    leadId: calc.lead_id,
                    clientId: calc.client_id,
                    calculationNumber: calc.calculation_number,
                    calculationDate: calc.calculation_date,
                    manager: calc.manager,
                    comments: calc.comments,
                    totalServicesCost: parseFloat(calc.total_services_cost) || 0,
                    vatAmount: parseFloat(calc.vat_amount) || 0,
                    totalAmount: parseFloat(calc.total_amount) || 0,
                    status: calc.status,
                    createdAt: calc.created_at,
                    updatedAt: calc.updated_at,
                    createdBy: calc.created_by,
                    approvedBy: calc.approved_by,
                    approvedAt: calc.approved_at,
                    serverId: calc.id,
                    services: calc.items ? calc.items.map(item => ({
                        id: item.id,
                        name: item.service_name,
                        quantity: item.quantity,
                        price: parseFloat(item.unit_price) || 0,
                        total: parseFloat(item.total_price) || 0
                    })) : []
                }));
                
                if (calculations.length > 0) {
                    nextCalculationId = Math.max(...calculations.map(c => c.id)) + 1;
                }
                
                // Сохраняем в localStorage для офлайн работы
                saveCalculationsToStorage();
                
                console.log('Расчеты загружены из БД:', calculations.length);
                return true;
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки расчетов из БД:', error);
    }
    
    // Fallback: загружаем из localStorage
    loadCalculationsFromStorage();
    return false;
}

// Сохранение расчетов в localStorage
function saveCalculationsToStorage() {
    try {
        localStorage.setItem('ff-calculations', JSON.stringify(calculations));
    } catch (error) {
        console.error('Ошибка сохранения расчетов:', error);
    }
}

// Получение расчетов по лиду
function getCalculationsForLead(leadId) {
    return calculations.filter(calc => calc.leadId === leadId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Новые сверху
}

// Создание уникального кода лида
function generateLeadCode(lead) {
    if (lead.uniqueCode) {
        return lead.uniqueCode;
    }
    
    // Генерируем уникальный код на основе ID и даты создания
    const date = new Date(lead.createdAt || Date.now());
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const leadCode = `LD${lead.id.toString().padStart(4, '0')}${dateStr}`;
    
    // Обновляем лид с уникальным кодом
    lead.uniqueCode = leadCode;
    
    // Сохраняем обновленный лид
    const leadIndex = leads.findIndex(l => l.id === lead.id);
    if (leadIndex !== -1) {
        leads[leadIndex] = lead;
        localStorage.setItem('ff-leads', JSON.stringify(leads));
    }
    
    return leadCode;
}

// ========================================
// MODAL CALCULATOR FUNCTIONS
// ========================================

function openCalculatorForLead(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) {
        showNotification('Лид не найден', 'error');
        return;
    }
    
    currentLeadForCalculation = lead;
    
    // Генерируем уникальный код лида если его нет
    generateLeadCode(lead);
    
    // Загружаем расчеты для этого лида
    const leadCalculations = getCalculationsForLead(leadId);
    
    // Показываем модальное окно со списком расчетов
    showCalculatorModal();
    showCalculationsList(leadCalculations);
}

function showCalculatorModal(leadId = null) {
    const modal = document.getElementById('calculatorModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Если передан leadId, инициализируем калькулятор для этого лида
        if (leadId) {
            const lead = leads.find(l => l.id === leadId);
            if (lead) {
                currentLeadForCalculation = lead;
                
                // Заполняем данные клиента
                document.getElementById('modalClientName').value = lead.clientName || lead.name || '';
                document.getElementById('modalComments').value = lead.comments || lead.notes || '';
                document.getElementById('modalCalculationDate').value = new Date().toLocaleDateString('ru-RU');
                document.getElementById('modalManager').value = currentUser?.full_name || '';
                document.getElementById('modalCalculationNumber').value = generateCalculationNumber();
                
                // Очищаем услуги для нового расчета
                modalServices = [];
                nextServiceId = 1;
                
                // Показываем форму нового расчета сразу
                showNewCalculationForm();
            }
        }
    }
}

function hideCalculatorModal() {
    const modal = document.getElementById('calculatorModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    // Обновляем детали лида, если они открыты
    if (currentLeadForCalculation && typeof window.populateLeadCalculations === 'function') {
        window.populateLeadCalculations(currentLeadForCalculation);
    }
    
    // Очищаем данные
    currentLeadForCalculation = null;
    modalServices = [];
    nextServiceId = 1;
    
    // Скрываем форму нового расчета
    const newCalculationForm = document.getElementById('newCalculationForm');
    if (newCalculationForm) {
        newCalculationForm.classList.add('hidden');
    }
}

function populateCalculatorModal(lead) {
    // Заполняем заголовок
    document.getElementById('calculatorModalTitle').textContent = `Расчет фулфилмента: ${lead.clientName || lead.name}`;
    document.getElementById('calculatorModalSubtitle').textContent = `Лид #${lead.id.toString().padStart(4, '0')}`;
    
    // Заполняем информацию о клиенте
    document.getElementById('modalClientName').value = lead.clientName || lead.name || '';
    document.getElementById('modalCalculationDate').value = new Date().toLocaleDateString('ru-RU');
    document.getElementById('modalCalculationNumber').value = generateCalculationNumber();
    document.getElementById('modalManager').value = currentUser?.full_name || '';
    document.getElementById('modalComments').value = lead.comments || '';
    
    // Очищаем услуги
    modalServices = [];
    updateModalServicesList();
    calculateTotalInModal();
}

function generateCalculationNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CALC-${year}${month}${day}-${random}`;
}

// Заполнение модального окна историей расчетов
function populateCalculatorHistory(lead, calculations) {
    const modalTitle = document.getElementById('calculatorModalTitle');
    const modalSubtitle = document.getElementById('calculatorModalSubtitle');
    const modalContent = document.getElementById('calculatorModalContent');
    
    if (modalTitle) {
        modalTitle.textContent = `Расчеты для лида: ${lead.clientName || lead.name}`;
    }
    
    if (modalSubtitle) {
        modalSubtitle.textContent = `Код лида: ${lead.uniqueCode}`;
    }
    
    if (modalContent) {
        if (calculations.length === 0) {
            // Нет расчетов - показываем сообщение и кнопку добавления
            modalContent.innerHTML = `
                <div class="text-center py-8">
                    <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i data-lucide="calculator" class="h-8 w-8 text-gray-400"></i>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Расчетов не найдено
                    </h3>
                    <p class="text-gray-500 dark:text-gray-400 mb-6">
                        Для этого лида еще не было создано расчетов
                    </p>
                    <button onclick="showNewCalculationForm()" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center mx-auto">
                        <i data-lucide="plus" class="h-5 w-5 mr-2"></i>
                        Добавить расчет
                    </button>
                </div>
            `;
        } else {
            // Есть расчеты - показываем список
            modalContent.innerHTML = `
                <div class="mb-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                            История расчетов (${calculations.length})
                        </h3>
                        <button onclick="showNewCalculationForm()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center">
                            <i data-lucide="plus" class="h-4 w-4 mr-2"></i>
                            Добавить расчет
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        ${calculations.map(calc => createCalculationCard(calc)).join('')}
                    </div>
                </div>
                
                <!-- Форма нового расчета будет создана динамически при нажатии кнопки -->
            `;
        }
    }
    
    lucide.createIcons();
}

// Создание карточки расчета
function createCalculationCard(calculation) {
    const totalAmount = calculation.services.reduce((sum, service) => sum + (service.quantity * service.price), 0);
    const vatAmount = totalAmount * 0.2;
    const finalAmount = totalAmount + vatAmount;
    
    return `
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
                <div>
                    <h4 class="font-semibold text-gray-900 dark:text-white">
                        Расчет #${calculation.id}
                    </h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        ${new Date(calculation.createdAt).toLocaleDateString('ru-RU')} в ${new Date(calculation.createdAt).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}
                    </p>
                </div>
                <div class="text-right">
                    <div class="text-lg font-bold text-blue-600 dark:text-blue-400">
                        ${formatCurrency(finalAmount)}
                    </div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                        ${calculation.services.length} услуг
                    </div>
                </div>
            </div>
            
            <div class="mb-3">
                <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">Услуги:</div>
                <div class="space-y-1">
                    ${calculation.services.map(service => `
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-700 dark:text-gray-300">${service.name}</span>
                            <span class="text-gray-900 dark:text-white">${service.quantity} × ${formatCurrency(service.price)} = ${formatCurrency(service.quantity * service.price)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                <div class="text-sm text-gray-500 dark:text-gray-400">
                    Менеджер: ${calculation.manager || 'Не указан'}
                </div>
                <div class="flex space-x-2">
                    <button onclick="viewCalculation(${calculation.id})" class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors">
                        <i data-lucide="eye" class="h-4 w-4 mr-1 inline"></i>
                        Просмотр
                    </button>
                    <button onclick="generatePDFForCalculation(${calculation.id})" class="px-3 py-1 text-sm bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 rounded transition-colors">
                        <i data-lucide="file-text" class="h-4 w-4 mr-1 inline"></i>
                        PDF
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Создание формы нового расчета
function createNewCalculationForm() {
    return `
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    Новый расчет
                </h3>
                <button onclick="hideNewCalculationForm()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <i data-lucide="x" class="h-6 w-6"></i>
                </button>
            </div>
            
            <!-- Информация о расчете -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Клиент
                    </label>
                    <input type="text" id="modalClientName" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white" readonly>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Дата
                    </label>
                    <input type="text" id="modalCalculationDate" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 dark:text-white" readonly>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Номер расчета
                    </label>
                    <input type="text" id="modalCalculationNumber" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white" placeholder="Автоматически">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Менеджер
                    </label>
                    <input type="text" id="modalManager" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white" placeholder="Имя менеджера">
                </div>
            </div>
            
            <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Комментарии
                </label>
                <textarea id="modalComments" rows="3" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white" placeholder="Дополнительная информация"></textarea>
            </div>

            <!-- Услуги -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                        Услуги фулфилмента
                    </h3>
                    <button onclick="addServiceToModal()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                        <i data-lucide="plus" class="h-4 w-4 mr-2 inline"></i>
                        Добавить услугу
                    </button>
                </div>
                
                <div id="modalServicesList" class="space-y-4">
                    <!-- Услуги будут добавлены динамически -->
                </div>
            </div>

            <!-- Результаты расчета -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    Результаты расчета
                </h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-4">
                        <div class="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                            <span class="text-gray-600 dark:text-gray-400">Стоимость услуг:</span>
                            <span class="font-semibold text-gray-900 dark:text-white" id="modalTotalServicesCost">0 ₽</span>
                        </div>
                        <div class="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                            <span class="text-gray-600 dark:text-gray-400">НДС (20%):</span>
                            <span class="font-semibold text-gray-900 dark:text-white" id="modalVatAmount">0 ₽</span>
                        </div>
                        <div class="flex justify-between items-center py-2 text-lg font-bold">
                            <span class="text-gray-900 dark:text-white">Итого:</span>
                            <span class="text-blue-600 dark:text-blue-400" id="modalTotalAmount">0 ₽</span>
                        </div>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Действия</h4>
                            <div class="space-y-2">
                                <button onclick="calculateTotalInModal()" class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                                    <i data-lucide="calculator" class="h-4 w-4 mr-2 inline"></i>
                                    Пересчитать
                                </button>
                                <button onclick="generatePDFFromModal()" class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                                    <i data-lucide="file-text" class="h-4 w-4 mr-2 inline"></i>
                                    Создать PDF
                                </button>
                                <button onclick="saveCalculationFromModal()" class="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                                    <i data-lucide="save" class="h-4 w-4 mr-2 inline"></i>
                                    Сохранить расчет
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Показать форму нового расчета
function showNewCalculationForm() {
    console.log('showNewCalculationForm вызвана');
    
    // Обновляем заголовок модального окна
    const modalTitle = document.getElementById('calculatorModalTitle');
    const modalSubtitle = document.getElementById('calculatorModalSubtitle');
    
    if (modalTitle && currentLeadForCalculation) {
        modalTitle.textContent = `Новый расчет для: ${currentLeadForCalculation.clientName || currentLeadForCalculation.name}`;
    }
    
    if (modalSubtitle && currentLeadForCalculation) {
        modalSubtitle.textContent = `Лид #${currentLeadForCalculation.id.toString().padStart(4, '0')}`;
    }
    
    // Очищаем содержимое модального окна и добавляем форму
    const modalContent = document.getElementById('calculatorModalContent');
    if (modalContent) {
        modalContent.innerHTML = `
            <div id="newCalculationForm">
                ${createNewCalculationForm()}
            </div>
        `;
        
        // Заполняем форму данными лида
        if (currentLeadForCalculation) {
            document.getElementById('modalClientName').value = currentLeadForCalculation.clientName || currentLeadForCalculation.name || '';
            document.getElementById('modalCalculationDate').value = new Date().toLocaleDateString('ru-RU');
            document.getElementById('modalCalculationNumber').value = generateCalculationNumber();
            document.getElementById('modalManager').value = currentUser?.full_name || '';
            document.getElementById('modalComments').value = currentLeadForCalculation.comments || '';
        }
        
        // Очищаем услуги
        modalServices = [];
        nextServiceId = 1;
        updateModalServicesList();
        calculateTotalInModal();
        
        lucide.createIcons();
    } else {
        console.error('Элемент calculatorModalContent не найден');
    }
}

// Скрыть форму нового расчета
function hideNewCalculationForm() {
    const form = document.getElementById('newCalculationForm');
    if (form) {
        form.classList.add('hidden');
    }
}

// ========================================
// SERVICES MANAGEMENT
// ========================================

function addServiceToModal() {
    const service = {
        id: nextServiceId++,
        serviceId: null, // ID услуги из настроек
        name: '',
        description: '',
        quantity: 1,
        price: 0,
        total: 0
    };
    
    modalServices.push(service);
    updateModalServicesList();
}

function removeServiceFromModal(serviceId) {
    modalServices = modalServices.filter(s => s.id !== serviceId);
    updateModalServicesList();
    calculateTotalInModal();
}

function updateServiceInModal(serviceId, field, value) {
    const service = modalServices.find(s => s.id === serviceId);
    if (service) {
        service[field] = value;
        
        if (field === 'quantity' || field === 'price') {
            service.total = service.quantity * service.price;
        }
        
        updateModalServicesList();
        calculateTotalInModal();
    }
}

function updateServiceFromDropdown(serviceId, selectedServiceId) {
    const service = modalServices.find(s => s.id === serviceId);
    if (service && selectedServiceId) {
        const selectedService = services.find(s => s.id == selectedServiceId);
        if (selectedService) {
            service.serviceId = selectedService.id;
            service.name = selectedService.name;
            service.price = selectedService.price;
            service.total = service.quantity * service.price;
            
            updateModalServicesList();
            calculateTotalInModal();
        }
    }
}

function updateModalServicesList() {
    const container = document.getElementById('modalServicesList');
    if (!container) return;
    
    if (modalServices.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                <i data-lucide="plus-circle" class="h-12 w-12 mx-auto mb-4"></i>
                <p>Нажмите "Добавить услугу" для создания расчета</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    container.innerHTML = modalServices.map(service => `
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <div class="flex items-center justify-between mb-4">
                <h4 class="font-semibold text-gray-900 dark:text-white">Услуга #${service.id}</h4>
                <button onclick="removeServiceFromModal(${service.id})" class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                    <i data-lucide="trash-2" class="h-4 w-4"></i>
                </button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название услуги</label>
                    <select onchange="updateServiceFromDropdown(${service.id}, this.value)" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white">
                        <option value="">Выберите услугу</option>
                        ${services.map(s => `<option value="${s.id}" ${service.serviceId === s.id ? 'selected' : ''}>${s.name} - ${s.price} ₽/${s.unit}</option>`).join('')}
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Описание</label>
                    <input type="text" value="${service.description}" onchange="updateServiceInModal(${service.id}, 'description', this.value)" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white" placeholder="Описание услуги">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Количество</label>
                    <input type="number" value="${service.quantity}" onchange="updateServiceInModal(${service.id}, 'quantity', parseInt(this.value) || 0)" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white" min="0">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Цена за единицу (₽)</label>
                    <input type="number" value="${service.price}" onchange="updateServiceInModal(${service.id}, 'price', parseFloat(this.value) || 0)" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white" min="0" step="0.01">
                </div>
            </div>
            
            <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div class="flex justify-between items-center">
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Итого по услуге:</span>
                    <span class="text-lg font-bold text-blue-600 dark:text-blue-400">${service.total.toFixed(2)} ₽</span>
                </div>
            </div>
        </div>
    `).join('');
    
    lucide.createIcons();
}

// ========================================
// CALCULATION FUNCTIONS
// ========================================

function calculateTotalInModal() {
    const totalServicesCost = modalServices.reduce((sum, service) => sum + service.total, 0);
    const vatAmount = totalServicesCost * 0.2;
    const totalAmount = totalServicesCost + vatAmount;
    
    document.getElementById('modalTotalServicesCost').textContent = `${totalServicesCost.toFixed(2)} ₽`;
    document.getElementById('modalVatAmount').textContent = `${vatAmount.toFixed(2)} ₽`;
    document.getElementById('modalTotalAmount').textContent = `${totalAmount.toFixed(2)} ₽`;
}

function generatePDFFromModal() {
    if (!currentLeadForCalculation) {
        showNotification('Нет данных для создания PDF', 'error');
        return;
    }
    
    if (modalServices.length === 0) {
        showNotification('Добавьте хотя бы одну услугу', 'error');
        return;
    }
    
    const calculationData = {
        lead: currentLeadForCalculation,
        services: modalServices,
        calculationNumber: document.getElementById('modalCalculationNumber').value,
        calculationDate: document.getElementById('modalCalculationDate').value,
        manager: document.getElementById('modalManager').value,
        comments: document.getElementById('modalComments').value,
        totalServicesCost: modalServices.reduce((sum, service) => sum + service.total, 0),
        vatAmount: modalServices.reduce((sum, service) => sum + service.total, 0) * 0.2,
        totalAmount: modalServices.reduce((sum, service) => sum + service.total, 0) * 1.2
    };
    
    // Здесь будет логика создания PDF
    showNotification('PDF будет создан для расчета', 'info');
    console.log('PDF данные:', calculationData);
}

async function saveCalculationFromModal() {
    if (!currentLeadForCalculation) {
        showNotification('Нет данных для сохранения', 'error');
        return;
    }
    
    if (modalServices.length === 0) {
        showNotification('Добавьте хотя бы одну услугу', 'error');
        return;
    }
    
    const calculationData = {
        id: nextCalculationId++,
        leadId: currentLeadForCalculation.id,
        leadUniqueCode: currentLeadForCalculation.uniqueCode,
        leadName: currentLeadForCalculation.clientName || currentLeadForCalculation.name,
        services: [...modalServices], // Копируем массив услуг
        calculationNumber: document.getElementById('modalCalculationNumber').value,
        calculationDate: document.getElementById('modalCalculationDate').value,
        manager: document.getElementById('modalManager').value,
        comments: document.getElementById('modalComments').value,
        totalServicesCost: modalServices.reduce((sum, service) => sum + service.total, 0),
        vatAmount: modalServices.reduce((sum, service) => sum + service.total, 0) * 0.2,
        totalAmount: modalServices.reduce((sum, service) => sum + service.total, 0) * 1.2,
        createdAt: new Date().toISOString()
    };
    
    try {
        // Сохраняем в базу данных (если онлайн)
        if (typeof isOnline === 'function' && isOnline()) {
            const response = await fetch(`${API_BASE_URL}/calculations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: calculationData.leadId,
                    client_id: currentLeadForCalculation.clientId || null,
                    calculation_number: calculationData.calculationNumber,
                    calculation_date: calculationData.calculationDate,
                    manager: calculationData.manager,
                    comments: calculationData.comments,
                    total_services_cost: calculationData.totalServicesCost,
                    vat_amount: calculationData.vatAmount,
                    total_amount: calculationData.totalAmount,
                    status: 'draft',
                    created_by: currentUser?.username || 'unknown',
                    items: modalServices.map(service => ({
                        service_name: service.name,
                        quantity: service.quantity,
                        unit_price: service.price,
                        total_price: service.total
                    }))
                })
            });
            
            if (response.ok) {
                const savedCalculation = await response.json();
                calculationData.id = savedCalculation.id;
                calculationData.serverId = savedCalculation.id;
                console.log('Расчет сохранен в БД:', savedCalculation);
            } else {
                console.warn('Ошибка сохранения в БД, сохраняем локально');
            }
        }
        
        // Добавляем в массив расчетов
        calculations.push(calculationData);
        
        // Сохраняем в localStorage
        saveCalculationsToStorage();
        
        // Обновляем расчет в лиде
        const leadIndex = leads.findIndex(l => l.id === currentLeadForCalculation.id);
        if (leadIndex !== -1) {
            leads[leadIndex].calculation = {
                items: [...modalServices],
                total: calculationData.totalAmount,
                markup: 0 // Можно добавить наценку позже
            };
            leads[leadIndex].updatedAt = new Date().toISOString();
            
            // Сохраняем обновленные лиды
            localStorage.setItem('ff-leads', JSON.stringify(leads));
            
            // Обновляем UI
            if (typeof updateLeadsTable === 'function') {
                updateLeadsTable();
            }
            if (typeof updateKanbanBoard === 'function') {
                updateKanbanBoard();
            }
            if (typeof updateDashboard === 'function') {
                updateDashboard();
            }
        }
        
        showNotification('Расчет сохранен', 'success');
        console.log('Сохраненный расчет:', calculationData);
        
        // Показываем список всех расчетов лида
        const leadCalculations = getCalculationsForLead(currentLeadForCalculation.id);
        showCalculationsList(leadCalculations);
        
    } catch (error) {
        console.error('Ошибка сохранения расчета:', error);
        showNotification('Ошибка сохранения расчета', 'error');
    }
}

// Показать список расчетов лида
function showCalculationsList(calculations) {
    const modalTitle = document.getElementById('calculatorModalTitle');
    const modalSubtitle = document.getElementById('calculatorModalSubtitle');
    const modalContent = document.getElementById('calculatorModalContent');
    
    if (modalTitle && currentLeadForCalculation) {
        modalTitle.textContent = `Расчеты для: ${currentLeadForCalculation.clientName || currentLeadForCalculation.name}`;
    }
    
    if (modalSubtitle && currentLeadForCalculation) {
        modalSubtitle.textContent = `Лид #${currentLeadForCalculation.id.toString().padStart(4, '0')} - ${calculations.length} расчетов`;
    }
    
    if (modalContent) {
        if (calculations.length === 0) {
            modalContent.innerHTML = `
                <div class="text-center py-8">
                    <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i data-lucide="calculator" class="h-8 w-8 text-gray-400"></i>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Расчетов не найдено
                    </h3>
                    <p class="text-gray-500 dark:text-gray-400 mb-6">
                        Для этого лида еще не было создано расчетов
                    </p>
                    <button onclick="showNewCalculationForm()" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center mx-auto">
                        <i data-lucide="plus" class="h-5 w-5 mr-2"></i>
                        Добавить расчет
                    </button>
                </div>
            `;
        } else {
            modalContent.innerHTML = `
                <div class="mb-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                            История расчетов (${calculations.length})
                        </h3>
                        <button onclick="showNewCalculationForm()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center">
                            <i data-lucide="plus" class="h-4 w-4 mr-2"></i>
                            Добавить расчет
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        ${calculations.map(calc => createCalculationCard(calc)).join('')}
                    </div>
                </div>
            `;
        }
    }
    
    lucide.createIcons();
}

// Просмотр расчета
function viewCalculation(calculationId) {
    const calculation = calculations.find(c => c.id === calculationId);
    if (!calculation) {
        showNotification('Расчет не найден', 'error');
        return;
    }
    
    // Показываем детали расчета в модальном окне
    showCalculationDetails(calculation);
}

// Показать детали расчета
function showCalculationDetails(calculation) {
    const modalContent = document.getElementById('calculatorModalContent');
    if (modalContent) {
        modalContent.innerHTML = `
            <div class="mb-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                        Детали расчета #${calculation.id}
                    </h3>
                    <button onclick="openCalculatorForLead(${calculation.leadId})" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                        <i data-lucide="arrow-left" class="h-4 w-4 mr-2 inline"></i>
                        Назад к списку
                    </button>
                </div>
                
                <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <h4 class="font-semibold text-gray-900 dark:text-white mb-3">Информация о расчете</h4>
                            <div class="space-y-2">
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-400">Номер:</span>
                                    <span class="text-gray-900 dark:text-white">${calculation.calculationNumber}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-400">Дата:</span>
                                    <span class="text-gray-900 dark:text-white">${calculation.calculationDate}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-400">Менеджер:</span>
                                    <span class="text-gray-900 dark:text-white">${calculation.manager || 'Не указан'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <h4 class="font-semibold text-gray-900 dark:text-white mb-3">Финансовые показатели</h4>
                            <div class="space-y-2">
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-400">Стоимость услуг:</span>
                                    <span class="text-gray-900 dark:text-white">${formatCurrency(calculation.totalServicesCost)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600 dark:text-gray-400">НДС (20%):</span>
                                    <span class="text-gray-900 dark:text-white">${formatCurrency(calculation.vatAmount)}</span>
                                </div>
                                <div class="flex justify-between text-lg font-bold">
                                    <span class="text-gray-900 dark:text-white">Итого:</span>
                                    <span class="text-blue-600 dark:text-blue-400">${formatCurrency(calculation.totalAmount)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-6">
                        <h4 class="font-semibold text-gray-900 dark:text-white mb-3">Услуги</h4>
                        <div class="space-y-2">
                            ${calculation.services.map(service => `
                                <div class="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                                    <div>
                                        <div class="font-medium text-gray-900 dark:text-white">${service.name}</div>
                                        <div class="text-sm text-gray-500 dark:text-gray-400">${service.description || ''}</div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-gray-900 dark:text-white">${service.quantity} × ${formatCurrency(service.price)}</div>
                                        <div class="font-semibold text-gray-900 dark:text-white">${formatCurrency(service.quantity * service.price)}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    ${calculation.comments ? `
                        <div class="mb-6">
                            <h4 class="font-semibold text-gray-900 dark:text-white mb-3">Комментарии</h4>
                            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <p class="text-gray-700 dark:text-gray-300">${calculation.comments}</p>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="flex justify-end space-x-3">
                        <button onclick="generatePDFForCalculation(${calculation.id})" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                            <i data-lucide="file-text" class="h-4 w-4 mr-2 inline"></i>
                            Создать PDF
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    lucide.createIcons();
}

// Генерация PDF для конкретного расчета
function generatePDFForCalculation(calculationId) {
    const calculation = calculations.find(c => c.id === calculationId);
    if (!calculation) {
        showNotification('Расчет не найден', 'error');
        return;
    }
    
    // Здесь будет логика создания PDF
    showNotification(`PDF будет создан для расчета #${calculation.id}`, 'info');
    console.log('PDF данные для расчета:', calculation);
}

// Инициализация калькулятора
async function initializeCalculator() {
    console.log('Инициализация калькулятора...');
    
    // Загружаем расчеты из базы данных или localStorage
    await loadCalculationsFromDatabase();
    
    console.log('Калькулятор инициализирован. Загружено расчетов:', calculations.length);
}

// ========================================
// EXPORT FUNCTIONS
// ========================================

const FFCalculator = {
    openCalculatorForLead,
    showCalculatorModal,
    hideCalculatorModal,
    populateCalculatorHistory,
    showNewCalculationForm,
    hideNewCalculationForm,
    viewCalculation,
    showCalculationDetails,
    generatePDFForCalculation,
    initializeCalculator,
    addServiceToModal,
    removeServiceFromModal,
    updateServiceInModal,
    updateServiceFromDropdown,
    updateModalServicesList,
    calculateTotalInModal,
    generatePDFFromModal,
    saveCalculationFromModal,
    loadCalculationsFromDatabase,
    loadCalculationsFromStorage,
    saveCalculationsToStorage,
    getCalculationsForLead,
    showCalculationsList
};

// Make functions available globally for onclick attributes
window.openCalculatorForLead = openCalculatorForLead;
window.showCalculatorModal = showCalculatorModal;
window.hideCalculatorModal = hideCalculatorModal;
window.showNewCalculationForm = showNewCalculationForm;
window.hideNewCalculationForm = hideNewCalculationForm;
window.viewCalculation = viewCalculation;
window.generatePDFForCalculation = generatePDFForCalculation;
window.addServiceToModal = addServiceToModal;
window.removeServiceFromModal = removeServiceFromModal;
window.updateServiceInModal = updateServiceInModal;
window.updateServiceFromDropdown = updateServiceFromDropdown;
window.calculateTotalInModal = calculateTotalInModal;
window.generatePDFFromModal = generatePDFFromModal;
window.saveCalculationFromModal = saveCalculationFromModal;
window.loadCalculationsFromDatabase = loadCalculationsFromDatabase;
window.loadCalculationsFromStorage = loadCalculationsFromStorage;
window.saveCalculationsToStorage = saveCalculationsToStorage;
window.getCalculationsForLead = getCalculationsForLead;
window.showCalculationsList = showCalculationsList;
window.generateCalculationNumber = generateCalculationNumber;
window.generateLeadCode = generateLeadCode;
window.createNewCalculationForm = createNewCalculationForm;
window.updateModalServicesList = updateModalServicesList;
window.initializeCalculator = initializeCalculator;

// Инициализируем калькулятор при загрузке
document.addEventListener('DOMContentLoaded', function() {
    initializeCalculator();
});