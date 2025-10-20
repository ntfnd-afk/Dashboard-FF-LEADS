// ========================================
// FF Dashboard - Services Management Module
// ========================================

// ========================================
// SERVICES MANAGEMENT FUNCTIONS
// ========================================

function updateServicesList() {
    const servicesList = document.getElementById('servicesList');
    if (!servicesList) return;

    if (services.length === 0) {
        servicesList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-sm text-center py-4">Нет добавленных услуг</p>';
        return;
    }

    servicesList.innerHTML = services.map(service => `
        <div class="flex items-center justify-between p-3 bg-white dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-500">
            <div class="flex-1">
                <div class="font-medium text-gray-900 dark:text-white">${service.name}</div>
                <div class="text-sm text-gray-500 dark:text-gray-400">${service.price} ₽ / ${service.unit}</div>
            </div>
            <div class="flex space-x-2">
                <button onclick="editService(${service.id})" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" title="Редактировать">
                    <i data-lucide="edit" class="h-4 w-4"></i>
                </button>
                <button onclick="deleteService(${service.id})" class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300" title="Удалить">
                    <i data-lucide="trash-2" class="h-4 w-4"></i>
                </button>
            </div>
        </div>
    `).join('');

    lucide.createIcons();
}

function addNewService() {
    const name = document.getElementById('newServiceName').value.trim();
    const price = parseFloat(document.getElementById('newServicePrice').value);
    const unit = document.getElementById('newServiceUnit').value.trim();

    if (!name || isNaN(price) || !unit) {
        showNotification('Заполните все поля', 'error');
        return;
    }

    const newService = {
        id: Date.now(),
        name: name,
        price: price,
        unit: unit
    };

    services.push(newService);
    updateServicesList();
    saveServices();

    // Очищаем поля
    document.getElementById('newServiceName').value = '';
    document.getElementById('newServicePrice').value = '';
    document.getElementById('newServiceUnit').value = '';

    showNotification('Услуга добавлена', 'success');
}

function editService(serviceId) {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    const newName = prompt('Название услуги:', service.name);
    if (newName === null) return;

    const newPrice = prompt('Цена:', service.price);
    if (newPrice === null) return;

    const newUnit = prompt('Единица измерения:', service.unit);
    if (newUnit === null) return;

    if (!newName.trim() || isNaN(parseFloat(newPrice)) || !newUnit.trim()) {
        showNotification('Некорректные данные', 'error');
        return;
    }

    // Обновляем услугу
    service.name = newName.trim();
    service.price = parseFloat(newPrice);
    service.unit = newUnit.trim();

    updateServicesList();
    saveServices();
    showNotification('Услуга обновлена', 'success');
}

function deleteService(serviceId) {
    if (!confirm('Вы уверены, что хотите удалить эту услугу?')) return;

    services = services.filter(s => s.id !== serviceId);
    updateServicesList();
    saveServices();
    showNotification('Услуга удалена', 'success');
}

async function saveServices() {
    try {
        if (isOnline) {
            const response = await fetch(`${API_BASE_URL}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'services',
                    value: JSON.stringify(services)
                })
            });
            
            if (!response.ok) {
                throw new Error('Ошибка сохранения услуг');
            }
        }
        
        localStorage.setItem('ff-services', JSON.stringify(services));
        
        // Обновляем калькулятор если он открыт
        if (typeof updateCalculationTable === 'function') {
            updateCalculationTable();
        }
    } catch (error) {
        console.error('Ошибка сохранения услуг:', error);
        showNotification('Ошибка сохранения услуг', 'error');
    }
}

// ========================================
// EXCEL IMPORT FUNCTIONS
// ========================================

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('selectedFileName').textContent = file.name;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            // Простой парсер Excel (для демонстрации)
            // В реальном проекте лучше использовать библиотеку типа SheetJS
            const data = e.target.result;
            parseExcelData(data);
        } catch (error) {
            console.error('Ошибка чтения файла:', error);
            showNotification('Ошибка чтения Excel файла', 'error');
        }
    };
    reader.readAsText(file);
}

function parseExcelData(data) {
    // Простой парсер CSV (Excel файлы можно сохранить как CSV)
    const lines = data.split('\n');
    const parsedServices = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Поддерживаем разные разделители: | или ;
        let parts;
        if (line.includes('|')) {
            parts = line.split('|').map(part => part.trim());
        } else if (line.includes(';')) {
            parts = line.split(';').map(part => part.trim());
        } else {
            parts = line.split(',').map(part => part.trim());
        }

        if (parts.length >= 3) {
            const name = parts[0];
            const price = parseFloat(parts[1].replace(',', '.')); // Поддержка запятой как разделителя десятичных
            const unit = parts[2];

            if (name && !isNaN(price) && unit) {
                parsedServices.push({
                    id: Date.now() + i,
                    name: name,
                    price: price,
                    unit: unit
                });
            }
        }
    }

    if (parsedServices.length === 0) {
        showNotification('Не удалось найти услуги в файле. Проверьте формат: Услуга|Цена|Единица', 'error');
        return;
    }

    importServicesData = parsedServices;
    showImportServicesModal();
}

function showImportServicesModal() {
    document.getElementById('importServicesModal').classList.remove('hidden');
    updateImportPreview();
}

function hideImportServicesModal() {
    document.getElementById('importServicesModal').classList.add('hidden');
    importServicesData = null;
    document.getElementById('servicesFileInput').value = '';
    document.getElementById('selectedFileName').textContent = '';
}

function updateImportPreview() {
    const preview = document.getElementById('importPreview');
    const previewContent = document.getElementById('importPreviewContent');

    if (!importServicesData || importServicesData.length === 0) {
        preview.classList.add('hidden');
        return;
    }

    preview.classList.remove('hidden');
    previewContent.innerHTML = importServicesData.map(service => 
        `<div class="flex justify-between py-1 border-b border-gray-200 dark:border-gray-600">
            <span>${service.name}</span>
            <span>${service.price} ₽ / ${service.unit}</span>
        </div>`
    ).join('');
}

async function confirmImportServices() {
    if (!importServicesData || importServicesData.length === 0) {
        showNotification('Нет данных для импорта', 'error');
        return;
    }

    const importMode = document.querySelector('input[name="importMode"]:checked').value;

    try {
        if (importMode === 'replace') {
            // Проверяем, используются ли услуги в существующих расчетах
            const usedServices = checkUsedServices();
            if (usedServices.length > 0) {
                const message = `Следующие услуги используются в существующих расчетах и будут сохранены:\n${usedServices.join(', ')}`;
                alert(message);
            }
            
            // Заменяем все услуги, но сохраняем используемые
            const preservedServices = services.filter(service => usedServices.includes(service.name));
            services = [...preservedServices, ...importServicesData];
        } else {
            // Добавляем к существующим
            services = [...services, ...importServicesData];
        }

        await saveServices();
        updateServicesList();
        hideImportServicesModal();
        
        showNotification(`Импортировано ${importServicesData.length} услуг`, 'success');
    } catch (error) {
        console.error('Ошибка импорта:', error);
        showNotification('Ошибка импорта услуг', 'error');
    }
}

function checkUsedServices() {
    const usedServices = new Set();
    
    // Проверяем все лиды на наличие расчетов
    leads.forEach(lead => {
        if (lead.calculation && lead.calculation.items) {
            lead.calculation.items.forEach(item => {
                if (item.service) {
                    usedServices.add(item.service);
                }
            });
        }
    });
    
    return Array.from(usedServices);
}

// ========================================
// EXPORT FOR OTHER MODULES
// ========================================

// Экспортируем функции управления услугами для других модулей
window.FFServices = {
    updateServicesList,
    addNewService,
    editService,
    deleteService,
    saveServices,
    handleFileSelect,
    parseExcelData,
    showImportServicesModal,
    hideImportServicesModal,
    updateImportPreview,
    confirmImportServices,
    checkUsedServices
};
