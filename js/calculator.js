// ========================================
// FF Dashboard - Calculator Module
// ========================================

// ========================================
// CALCULATOR FUNCTIONS
// ========================================

function addCalculationItem() {
    const newItem = {
        id: nextItemId++,
        service: '',
        quantity: 1,
        unit: 'шт',
        price: 0,
        total: 0
    };
    calculationItems.push(newItem);
    updateCalculationTable();
    saveData();
}

function removeCalculationItem(id) {
    calculationItems = calculationItems.filter(item => item.id !== id);
    updateCalculationTable();
    saveData();
}

function updateCalculationItem(id, field, value) {
    const item = calculationItems.find(item => item.id === id);
    if (item) {
        item[field] = value;
        if (field === 'quantity' || field === 'price') {
            item.total = item.quantity * item.price;
        }
        updateCalculationTable();
        saveData();
    }
}

function updateCalculationTable() {
    const tbody = document.getElementById('calculationTableBody');
    const totalsSection = document.getElementById('totalsSection');
    
    if (calculationItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Нет добавленных услуг. Нажмите "Добавить услугу" для начала расчета.
                </td>
            </tr>
        `;
        totalsSection.classList.add('hidden');
        return;
    }

    tbody.innerHTML = calculationItems.map((item, index) => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                ${index + 1}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <select onchange="handleServiceChange(${item.id}, this.value)" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white">
                    <option value="">Выберите услугу</option>
                    ${services.map(service => `
                        <option value="${service.name}" ${item.service === service.name ? 'selected' : ''}>${service.name}</option>
                    `).join('')}
                </select>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <input type="number" value="${item.quantity}" onchange="updateCalculationItem(${item.id}, 'quantity', parseFloat(this.value) || 0)" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white" min="0" step="0.01">
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <select onchange="updateCalculationItem(${item.id}, 'unit', this.value)" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white">
                    <option value="шт" ${item.unit === 'шт' ? 'selected' : ''}>шт</option>
                    <option value="короб" ${item.unit === 'короб' ? 'selected' : ''}>короб</option>
                    <option value="палет" ${item.unit === 'палет' ? 'selected' : ''}>палет</option>
                    <option value="рейс" ${item.unit === 'рейс' ? 'selected' : ''}>рейс</option>
                    <option value="кг" ${item.unit === 'кг' ? 'selected' : ''}>кг</option>
                    <option value="м³" ${item.unit === 'м³' ? 'selected' : ''}>м³</option>
                    <option value="день" ${item.unit === 'день' ? 'selected' : ''}>день</option>
                    <option value="месяц" ${item.unit === 'месяц' ? 'selected' : ''}>месяц</option>
                    <option value="заказ" ${item.unit === 'заказ' ? 'selected' : ''}>заказ</option>
                </select>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <input type="number" value="${item.price}" onchange="updateCalculationItem(${item.id}, 'price', parseFloat(this.value) || 0)" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white" min="0" step="0.01">
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                ${item.total.toLocaleString('ru-RU')} ₽
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <button onclick="removeCalculationItem(${item.id})" class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                    <i data-lucide="trash-2" class="h-4 w-4"></i>
                </button>
            </td>
        </tr>
    `).join('');

    totalsSection.classList.remove('hidden');
    updateTotals();
    lucide.createIcons();
}

function handleServiceChange(id, serviceName) {
    const service = services.find(s => s.name === serviceName);
    if (service) {
        updateCalculationItem(id, 'price', service.price);
        updateCalculationItem(id, 'unit', service.unit);
    }
    updateCalculationItem(id, 'service', serviceName);
}

function updateTotals() {
    const subtotal = calculationItems.reduce((sum, item) => sum + item.total, 0);
    const markup = parseFloat(document.getElementById('markup').value) || 0;
    const markupAmount = (subtotal * markup) / 100;
    const total = subtotal + markupAmount;

    document.getElementById('subtotal').textContent = subtotal.toLocaleString('ru-RU') + ' ₽';
    document.getElementById('markupAmount').textContent = markupAmount.toLocaleString('ru-RU') + ' ₽';
    document.getElementById('total').textContent = total.toLocaleString('ru-RU') + ' ₽';

    const markupRow = document.getElementById('markupRow');
    if (markupAmount > 0) {
        markupRow.classList.remove('hidden');
    } else {
        markupRow.classList.add('hidden');
    }
}

// ========================================
// CALCULATION SAVE/LOAD FUNCTIONS
// ========================================

function saveCalculation() {
    const clientName = document.getElementById('clientName').value.trim();
    const comments = document.getElementById('comments').value.trim();
    const markup = parseFloat(document.getElementById('markup').value) || 0;

    if (!clientName) {
        showNotification('Введите имя клиента', 'error');
        return;
    }

    if (calculationItems.length === 0) {
        showNotification('Добавьте хотя бы одну услугу', 'error');
        return;
    }

    const calculation = {
        items: calculationItems,
        subtotal: calculationItems.reduce((sum, item) => sum + item.total, 0),
        markup: markup,
        markupAmount: (calculationItems.reduce((sum, item) => sum + item.total, 0) * markup) / 100,
        total: calculationItems.reduce((sum, item) => sum + item.total, 0) + ((calculationItems.reduce((sum, item) => sum + item.total, 0) * markup) / 100),
        createdAt: new Date().toISOString()
    };

    // Сохраняем расчет в localStorage
    localStorage.setItem('ff-calculation', JSON.stringify(calculation));
    localStorage.setItem('ff-calculation-client', clientName);
    localStorage.setItem('ff-calculation-comments', comments);

    showNotification('Расчет сохранен', 'success');
}

function loadCalculation() {
    const savedCalculation = localStorage.getItem('ff-calculation');
    const savedClient = localStorage.getItem('ff-calculation-client');
    const savedComments = localStorage.getItem('ff-calculation-comments');

    if (savedCalculation) {
        const calculation = JSON.parse(savedCalculation);
        calculationItems = calculation.items || [];
        nextItemId = Math.max(...calculationItems.map(item => item.id), 0) + 1;
        
        document.getElementById('clientName').value = savedClient || '';
        document.getElementById('comments').value = savedComments || '';
        document.getElementById('markup').value = calculation.markup || 0;
        
        updateCalculationTable();
        showNotification('Расчет загружен', 'success');
    } else {
        showNotification('Нет сохраненного расчета', 'warning');
    }
}

function clearAll() {
    if (!confirm('Вы уверены, что хотите очистить все данные?')) return;

    calculationItems = [];
    nextItemId = 1;
    document.getElementById('clientName').value = '';
    document.getElementById('comments').value = '';
    document.getElementById('markup').value = 0;
    
    updateCalculationTable();
    saveData();
    showNotification('Все данные очищены', 'success');
}

// ========================================
// EXPORT FUNCTIONS
// ========================================

function exportToPDF() {
    const clientName = document.getElementById('clientName').value.trim();
    const comments = document.getElementById('comments').value.trim();
    
    if (!clientName) {
        showNotification('Введите имя клиента', 'error');
        return;
    }

    if (calculationItems.length === 0) {
        showNotification('Добавьте хотя бы одну услугу', 'error');
        return;
    }

    // Создаем HTML для PDF
    const htmlContent = generatePDFContent(clientName, comments);
    
    // Открываем новое окно для печати
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
}

function generatePDFContent(clientName, comments) {
    const subtotal = calculationItems.reduce((sum, item) => sum + item.total, 0);
    const markup = parseFloat(document.getElementById('markup').value) || 0;
    const markupAmount = (subtotal * markup) / 100;
    const total = subtotal + markupAmount;

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Расчет фулфилмента - ${clientName}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .client-info { margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .totals { text-align: right; margin-top: 20px; }
                .total-row { font-weight: bold; font-size: 18px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Расчет услуг фулфилмента</h1>
                <p>Дата: ${new Date().toLocaleDateString('ru-RU')}</p>
            </div>
            
            <div class="client-info">
                <h2>Клиент: ${clientName}</h2>
                ${comments ? `<p><strong>Комментарии:</strong> ${comments}</p>` : ''}
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>№</th>
                        <th>Услуга</th>
                        <th>Количество</th>
                        <th>Единица</th>
                        <th>Цена за единицу</th>
                        <th>Итого</th>
                    </tr>
                </thead>
                <tbody>
                    ${calculationItems.map((item, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${item.service}</td>
                            <td>${item.quantity}</td>
                            <td>${item.unit}</td>
                            <td>${item.price.toLocaleString('ru-RU')} ₽</td>
                            <td>${item.total.toLocaleString('ru-RU')} ₽</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="totals">
                <p>Промежуточный итог: ${subtotal.toLocaleString('ru-RU')} ₽</p>
                ${markupAmount > 0 ? `<p>Наценка (${markup}%): ${markupAmount.toLocaleString('ru-RU')} ₽</p>` : ''}
                <p class="total-row">Итого по ТЗ: ${total.toLocaleString('ru-RU')} ₽</p>
            </div>
        </body>
        </html>
    `;
}

// ========================================
// EXPORT FOR OTHER MODULES
// ========================================

// Экспортируем функции калькулятора для других модулей
window.FFCalculator = {
    addCalculationItem,
    removeCalculationItem,
    updateCalculationItem,
    updateCalculationTable,
    handleServiceChange,
    updateTotals,
    saveCalculation,
    loadCalculation,
    clearAll,
    exportToPDF,
    generatePDFContent
};
