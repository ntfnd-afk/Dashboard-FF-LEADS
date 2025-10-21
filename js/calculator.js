// calculator.js
// Модальный калькулятор для лидов

let currentLeadForCalculation = null;
let modalServices = [];
let nextServiceId = 1;

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
    populateCalculatorModal(lead);
    showCalculatorModal();
}

function showCalculatorModal() {
    const modal = document.getElementById('calculatorModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function hideCalculatorModal() {
    const modal = document.getElementById('calculatorModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    // Очищаем данные
    currentLeadForCalculation = null;
    modalServices = [];
    nextServiceId = 1;
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

function saveCalculationFromModal() {
    if (!currentLeadForCalculation) {
        showNotification('Нет данных для сохранения', 'error');
        return;
    }
    
    if (modalServices.length === 0) {
        showNotification('Добавьте хотя бы одну услугу', 'error');
        return;
    }
    
    const calculationData = {
        leadId: currentLeadForCalculation.id,
        leadName: currentLeadForCalculation.clientName || currentLeadForCalculation.name,
        services: modalServices,
        calculationNumber: document.getElementById('modalCalculationNumber').value,
        calculationDate: document.getElementById('modalCalculationDate').value,
        manager: document.getElementById('modalManager').value,
        comments: document.getElementById('modalComments').value,
        totalServicesCost: modalServices.reduce((sum, service) => sum + service.total, 0),
        vatAmount: modalServices.reduce((sum, service) => sum + service.total, 0) * 0.2,
        totalAmount: modalServices.reduce((sum, service) => sum + service.total, 0) * 1.2,
        createdAt: new Date().toISOString()
    };
    
    // Сохраняем в localStorage
    const savedCalculations = JSON.parse(localStorage.getItem('ff-calculations') || '[]');
    savedCalculations.push(calculationData);
    localStorage.setItem('ff-calculations', JSON.stringify(savedCalculations));
    
    showNotification('Расчет сохранен', 'success');
    console.log('Сохраненный расчет:', calculationData);
}

// ========================================
// EXPORT FUNCTIONS
// ========================================

const FFCalculator = {
    openCalculatorForLead,
    showCalculatorModal,
    hideCalculatorModal,
    populateCalculatorModal,
    addServiceToModal,
    removeServiceFromModal,
    updateServiceInModal,
    updateServiceFromDropdown,
    updateModalServicesList,
    calculateTotalInModal,
    generatePDFFromModal,
    saveCalculationFromModal
};

// Make functions available globally for onclick attributes
window.openCalculatorForLead = openCalculatorForLead;
window.showCalculatorModal = showCalculatorModal;
window.hideCalculatorModal = hideCalculatorModal;
window.addServiceToModal = addServiceToModal;
window.removeServiceFromModal = removeServiceFromModal;
window.updateServiceInModal = updateServiceInModal;
window.updateServiceFromDropdown = updateServiceFromDropdown;
window.calculateTotalInModal = calculateTotalInModal;
window.generatePDFFromModal = generatePDFFromModal;
window.saveCalculationFromModal = saveCalculationFromModal;