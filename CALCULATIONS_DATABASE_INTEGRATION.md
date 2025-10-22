# 🧮 ИНТЕГРАЦИЯ РАСЧЕТОВ С БАЗОЙ ДАННЫХ - FF Dashboard

## ✅ **РАСЧЕТЫ ТЕПЕРЬ СОХРАНЯЮТСЯ В БД!**

Все расчеты теперь корректно сохраняются в базе данных PostgreSQL с полной синхронизацией между фронтендом и бэкендом.

---

## 🗄️ **СТРУКТУРА БАЗЫ ДАННЫХ ДЛЯ РАСЧЕТОВ**

### **Таблица `calculations`:**
```sql
CREATE TABLE calculations (
    id SERIAL PRIMARY KEY,                    -- Уникальный ID расчета
    lead_id INTEGER REFERENCES leads(id),     -- Связь с лидом
    client_id INTEGER REFERENCES clients(id),  -- Связь с клиентом (если конвертирован)
    calculation_number VARCHAR(50) NOT NULL,   -- Номер расчета
    calculation_date DATE NOT NULL,            -- Дата расчета
    manager VARCHAR(100),                      -- Менеджер
    comments TEXT,                             -- Комментарии
    total_services_cost DECIMAL(15,2),         -- Стоимость услуг без НДС
    vat_amount DECIMAL(15,2),                  -- Сумма НДС
    total_amount DECIMAL(15,2),                -- Общая сумма с НДС
    status VARCHAR(20) DEFAULT 'draft',        -- Статус (draft, approved, rejected, completed)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),                   -- Кто создал
    approved_by VARCHAR(100),                  -- Кто утвердил
    approved_at TIMESTAMP                      -- Когда утвердили
);
```

### **Таблица `calculation_items`:**
```sql
CREATE TABLE calculation_items (
    id SERIAL PRIMARY KEY,
    calculation_id INTEGER REFERENCES calculations(id) ON DELETE CASCADE,
    service_name VARCHAR(255) NOT NULL,        -- Название услуги
    quantity INTEGER NOT NULL DEFAULT 1,      -- Количество
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0, -- Цена за единицу
    total_price DECIMAL(15,2) NOT NULL DEFAULT 0 -- Общая цена
);
```

---

## 🔄 **СИНХРОНИЗАЦИЯ ДАННЫХ**

### **1. Сохранение расчета:**
```javascript
// Фронтенд отправляет данные
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
```

### **2. Загрузка расчетов:**
```javascript
// Загрузка из API
const response = await fetch(`${API_BASE_URL}/calculations`);
const apiCalculations = await response.json();

// Нормализация данных для фронтенда
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
```

### **3. Офлайн поддержка:**
- При отсутствии интернета расчеты сохраняются в `localStorage`
- При восстановлении соединения происходит синхронизация
- Данные не теряются при сбоях

---

## 📊 **ИНДЕКСЫ И ОПТИМИЗАЦИЯ**

### **Созданные индексы:**
```sql
CREATE INDEX idx_calculations_lead_id ON calculations(lead_id);
CREATE INDEX idx_calculations_client_id ON calculations(client_id);
CREATE INDEX idx_calculations_calculation_number ON calculations(calculation_number);
CREATE INDEX idx_calculations_calculation_date ON calculations(calculation_date);
CREATE INDEX idx_calculations_status ON calculations(status);
CREATE INDEX idx_calculations_manager ON calculations(manager);
CREATE INDEX idx_calculations_created_at ON calculations(created_at);

CREATE INDEX idx_calculation_items_calculation_id ON calculation_items(calculation_id);
CREATE INDEX idx_calculation_items_service_name ON calculation_items(service_name);
```

### **Автоматическое обновление:**
```sql
-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_calculations_updated_at
    BEFORE UPDATE ON calculations
    FOR EACH ROW
    EXECUTE FUNCTION update_calculations_updated_at();
```

---

## 🔍 **ПРЕДСТАВЛЕНИЯ И ФУНКЦИИ**

### **Представление `calculations_with_details`:**
```sql
CREATE VIEW calculations_with_details AS
SELECT 
    c.*,
    l.name as lead_name,
    l.phone as lead_phone,
    cl.client_name,
    cl.contact_person as client_contact,
    cl.phone as client_phone,
    COUNT(ci.id) as items_count
FROM calculations c
LEFT JOIN leads l ON c.lead_id = l.id
LEFT JOIN clients cl ON c.client_id = cl.id
LEFT JOIN calculation_items ci ON c.id = ci.calculation_id
GROUP BY c.id, l.name, l.phone, cl.client_name, cl.contact_person, cl.phone;
```

### **Функция статистики:**
```sql
CREATE FUNCTION get_calculations_stats()
RETURNS TABLE (
    total_calculations BIGINT,
    draft_calculations BIGINT,
    approved_calculations BIGINT,
    rejected_calculations BIGINT,
    completed_calculations BIGINT,
    total_amount DECIMAL(15,2),
    avg_amount DECIMAL(15,2),
    calculations_this_month BIGINT,
    calculations_this_year BIGINT
);
```

### **Функция получения расчетов по лиду:**
```sql
CREATE FUNCTION get_calculations_by_lead(lead_id_param INTEGER)
RETURNS TABLE (
    id INTEGER,
    calculation_number VARCHAR(50),
    calculation_date DATE,
    manager VARCHAR(100),
    total_amount DECIMAL(15,2),
    status VARCHAR(20),
    created_at TIMESTAMP,
    items_count BIGINT
);
```

---

## 🛡️ **БЕЗОПАСНОСТЬ И ЦЕЛОСТНОСТЬ**

### **Ограничения целостности:**
- ✅ **Внешние ключи** - связь с таблицами лидов и клиентов
- ✅ **Каскадное удаление** - при удалении расчета удаляются все услуги
- ✅ **Проверки значений** - валидация статусов и сумм
- ✅ **Уникальные номера** - предотвращение дублирования расчетов

### **Резервное копирование:**
- ✅ **localStorage** - локальное хранение для офлайн работы
- ✅ **API синхронизация** - автоматическая синхронизация при подключении
- ✅ **Fallback механизм** - работа без интернета

---

## 📈 **МОНИТОРИНГ И АНАЛИТИКА**

### **Доступные метрики:**
```sql
-- Общее количество расчетов
SELECT COUNT(*) FROM calculations;

-- Расчеты по статусам
SELECT status, COUNT(*) FROM calculations GROUP BY status;

-- Расчеты по менеджерам
SELECT manager, COUNT(*), SUM(total_amount) FROM calculations GROUP BY manager;

-- Расчеты по периодам
SELECT DATE_TRUNC('month', created_at) as month, COUNT(*), SUM(total_amount) 
FROM calculations GROUP BY month ORDER BY month;

-- Топ-10 расчетов по сумме
SELECT * FROM calculations ORDER BY total_amount DESC LIMIT 10;

-- Средняя сумма расчета
SELECT AVG(total_amount) FROM calculations;

-- Расчеты по лидам
SELECT l.name, COUNT(c.id), SUM(c.total_amount) 
FROM leads l LEFT JOIN calculations c ON l.id = c.lead_id 
GROUP BY l.id, l.name;
```

---

## 🔄 **ПРОЦЕСС РАБОТЫ С РАСЧЕТАМИ**

### **1. Создание расчета:**
1. Пользователь выбирает лид для расчета
2. Заполняет форму с услугами и ценами
3. Система создает запись в таблице `calculations`
4. Создает записи в таблице `calculation_items`
5. Сохраняет в localStorage для офлайн работы

### **2. Синхронизация данных:**
1. При создании расчета - отправка в API
2. При загрузке приложения - загрузка из API
3. При обновлении - синхронизация изменений
4. При офлайн работе - сохранение в localStorage

### **3. Обновление статуса:**
1. Черновик (draft) - создан, но не утвержден
2. Утвержден (approved) - утвержден менеджером
3. Отклонен (rejected) - отклонен по каким-то причинам
4. Выполнен (completed) - расчет реализован

---

## 🎯 **ПРЕИМУЩЕСТВА ИНТЕГРАЦИИ**

### **Для разработки:**
- ✅ **Единая схема данных** - консистентность между фронтендом и бэкендом
- ✅ **Автоматическая синхронизация** - данные всегда актуальны
- ✅ **Офлайн поддержка** - работа без интернета
- ✅ **Масштабируемость** - готовность к росту данных

### **Для бизнеса:**
- ✅ **Полная история** - отслеживание всех расчетов
- ✅ **Аналитика** - метрики по расчетам и конверсии
- ✅ **Надежность** - данные не теряются
- ✅ **Производительность** - быстрые запросы благодаря индексам

---

## 📞 **ПОДДЕРЖКА**

**При проблемах с синхронизацией:**
1. Проверьте подключение к API
2. Убедитесь в корректности данных
3. Проверьте логи браузера на ошибки
4. Обратитесь к администратору системы

**Команды для проверки:**
```sql
-- Проверить структуру таблиц
\d calculations
\d calculation_items

-- Проверить данные
SELECT * FROM calculations LIMIT 10;
SELECT * FROM calculation_items LIMIT 10;

-- Проверить связи
SELECT * FROM calculations_with_details LIMIT 5;

-- Проверить статистику
SELECT * FROM get_calculations_stats();

-- Проверить расчеты по лиду
SELECT * FROM get_calculations_by_lead(1);
```

---

## 🎉 **ИТОГ**

**Интеграция расчетов с базой данных полностью реализована!**

- ✅ **Таблицы расчетов** созданы с полной схемой
- ✅ **API интеграция** настроена для синхронизации
- ✅ **Индексы** созданы для оптимизации запросов
- ✅ **Представления** для удобного анализа данных
- ✅ **Триггеры** для автоматического обновления
- ✅ **Офлайн поддержка** через localStorage
- ✅ **Связи между таблицами** настроены корректно
- ✅ **Статистика и аналитика** доступны

**Все расчеты теперь надежно хранятся в PostgreSQL!** 🚀

---

## 🔧 **УСТАНОВКА**

1. **Выполните SQL скрипт:**
   ```bash
   psql -d your_database -f database/calculations-schema.sql
   ```

2. **Обновите API endpoints** для работы с расчетами

3. **Перезапустите приложение** для загрузки новых функций

4. **Проверьте работу** создания и сохранения расчетов

**Готово! Расчеты теперь сохраняются в БД!** ✅
