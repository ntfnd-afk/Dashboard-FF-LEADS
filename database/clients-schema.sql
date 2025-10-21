-- ========================================
-- FF Dashboard - Clients Table Schema
-- ========================================

-- Создание таблицы клиентов
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL,
    inn VARCHAR(12),
    kpp VARCHAR(9),
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    source VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    type VARCHAR(20) DEFAULT 'regular',
    manager VARCHAR(100),
    start_date DATE DEFAULT CURRENT_DATE,
    comments TEXT,
    converted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    orders_count INTEGER DEFAULT 0
);

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_clients_lead_id ON clients(lead_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_type ON clients(type);
CREATE INDEX IF NOT EXISTS idx_clients_manager ON clients(manager);
CREATE INDEX IF NOT EXISTS idx_clients_converted_at ON clients(converted_at);
CREATE INDEX IF NOT EXISTS idx_clients_client_name ON clients(client_name);

-- Добавление комментариев к таблице и колонкам
COMMENT ON TABLE clients IS 'Таблица клиентов - конвертированные лиды';
COMMENT ON COLUMN clients.lead_id IS 'ID исходного лида';
COMMENT ON COLUMN clients.client_name IS 'Название компании клиента';
COMMENT ON COLUMN clients.inn IS 'ИНН клиента';
COMMENT ON COLUMN clients.kpp IS 'КПП клиента';
COMMENT ON COLUMN clients.contact_person IS 'Контактное лицо';
COMMENT ON COLUMN clients.phone IS 'Телефон клиента';
COMMENT ON COLUMN clients.email IS 'Email клиента';
COMMENT ON COLUMN clients.source IS 'Источник клиента';
COMMENT ON COLUMN clients.status IS 'Статус клиента (active, inactive, suspended)';
COMMENT ON COLUMN clients.type IS 'Тип клиента (regular, vip, wholesale)';
COMMENT ON COLUMN clients.manager IS 'Менеджер клиента';
COMMENT ON COLUMN clients.start_date IS 'Дата начала сотрудничества';
COMMENT ON COLUMN clients.comments IS 'Комментарии к клиенту';
COMMENT ON COLUMN clients.converted_at IS 'Дата конвертации из лида';
COMMENT ON COLUMN clients.total_revenue IS 'Общий оборот клиента';
COMMENT ON COLUMN clients.orders_count IS 'Количество заказов клиента';

-- Обновление таблицы лидов для связи с клиентами
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_to_client BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL;

-- Создание индекса для связи лидов с клиентами
CREATE INDEX IF NOT EXISTS idx_leads_client_id ON leads(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_converted_to_client ON leads(converted_to_client);

-- Добавление комментариев к новым колонкам лидов
COMMENT ON COLUMN leads.converted_to_client IS 'Флаг конвертации лида в клиента';
COMMENT ON COLUMN leads.client_id IS 'ID клиента, если лид конвертирован';

-- Создание триггера для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_clients_updated_at();

-- Создание представления для удобного просмотра клиентов с информацией о лидах
CREATE OR REPLACE VIEW clients_with_leads AS
SELECT 
    c.id,
    c.client_name,
    c.inn,
    c.kpp,
    c.contact_person,
    c.phone,
    c.email,
    c.source,
    c.status,
    c.type,
    c.manager,
    c.start_date,
    c.comments,
    c.converted_at,
    c.created_at,
    c.updated_at,
    c.total_revenue,
    c.orders_count,
    l.id as original_lead_id,
    l.created_at as lead_created_at,
    l.status as original_lead_status
FROM clients c
LEFT JOIN leads l ON c.lead_id = l.id;

-- Создание функции для получения статистики клиентов
CREATE OR REPLACE FUNCTION get_clients_stats()
RETURNS TABLE (
    total_clients BIGINT,
    active_clients BIGINT,
    inactive_clients BIGINT,
    suspended_clients BIGINT,
    total_revenue DECIMAL(15,2),
    avg_revenue_per_client DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_clients,
        COUNT(*) FILTER (WHERE status = 'active') as active_clients,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive_clients,
        COUNT(*) FILTER (WHERE status = 'suspended') as suspended_clients,
        COALESCE(SUM(total_revenue), 0) as total_revenue,
        COALESCE(AVG(total_revenue), 0) as avg_revenue_per_client
    FROM clients;
END;
$$ LANGUAGE plpgsql;

-- Примеры запросов для работы с клиентами

-- Получить всех активных клиентов
-- SELECT * FROM clients WHERE status = 'active';

-- Получить клиентов с их исходными лидами
-- SELECT * FROM clients_with_leads;

-- Получить статистику клиентов
-- SELECT * FROM get_clients_stats();

-- Получить клиентов по менеджеру
-- SELECT * FROM clients WHERE manager = 'admin';

-- Получить клиентов с оборотом больше определенной суммы
-- SELECT * FROM clients WHERE total_revenue > 10000;

-- Обновить оборот клиента
-- UPDATE clients SET total_revenue = total_revenue + 5000 WHERE id = 1;

-- Увеличить счетчик заказов
-- UPDATE clients SET orders_count = orders_count + 1 WHERE id = 1;
