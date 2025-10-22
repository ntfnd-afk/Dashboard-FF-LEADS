-- ========================================
-- FF Dashboard - Calculations Table Schema
-- ========================================

-- Создание таблицы расчетов
CREATE TABLE IF NOT EXISTS calculations (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    calculation_number VARCHAR(50) NOT NULL,
    calculation_date DATE NOT NULL,
    manager VARCHAR(100),
    comments TEXT,
    total_services_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    vat_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft', -- draft, approved, rejected, completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    approved_by VARCHAR(100),
    approved_at TIMESTAMP
);

-- Создание таблицы услуг в расчетах
CREATE TABLE IF NOT EXISTS calculation_items (
    id SERIAL PRIMARY KEY,
    calculation_id INTEGER REFERENCES calculations(id) ON DELETE CASCADE,
    service_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_calculations_lead_id ON calculations(lead_id);
CREATE INDEX IF NOT EXISTS idx_calculations_client_id ON calculations(client_id);
CREATE INDEX IF NOT EXISTS idx_calculations_calculation_number ON calculations(calculation_number);
CREATE INDEX IF NOT EXISTS idx_calculations_calculation_date ON calculations(calculation_date);
CREATE INDEX IF NOT EXISTS idx_calculations_status ON calculations(status);
CREATE INDEX IF NOT EXISTS idx_calculations_manager ON calculations(manager);
CREATE INDEX IF NOT EXISTS idx_calculations_created_at ON calculations(created_at);

CREATE INDEX IF NOT EXISTS idx_calculation_items_calculation_id ON calculation_items(calculation_id);
CREATE INDEX IF NOT EXISTS idx_calculation_items_service_name ON calculation_items(service_name);

-- Добавление комментариев к таблицам и колонкам
COMMENT ON TABLE calculations IS 'Таблица расчетов для лидов и клиентов';
COMMENT ON COLUMN calculations.lead_id IS 'ID лида, для которого создан расчет';
COMMENT ON COLUMN calculations.client_id IS 'ID клиента (если лид конвертирован)';
COMMENT ON COLUMN calculations.calculation_number IS 'Номер расчета';
COMMENT ON COLUMN calculations.calculation_date IS 'Дата расчета';
COMMENT ON COLUMN calculations.manager IS 'Менеджер, создавший расчет';
COMMENT ON COLUMN calculations.comments IS 'Комментарии к расчету';
COMMENT ON COLUMN calculations.total_services_cost IS 'Общая стоимость услуг без НДС';
COMMENT ON COLUMN calculations.vat_amount IS 'Сумма НДС';
COMMENT ON COLUMN calculations.total_amount IS 'Общая сумма с НДС';
COMMENT ON COLUMN calculations.status IS 'Статус расчета (draft, approved, rejected, completed)';
COMMENT ON COLUMN calculations.created_by IS 'Пользователь, создавший расчет';
COMMENT ON COLUMN calculations.approved_by IS 'Пользователь, утвердивший расчет';
COMMENT ON COLUMN calculations.approved_at IS 'Дата утверждения расчета';

COMMENT ON TABLE calculation_items IS 'Услуги в расчетах';
COMMENT ON COLUMN calculation_items.calculation_id IS 'ID расчета';
COMMENT ON COLUMN calculation_items.service_name IS 'Название услуги';
COMMENT ON COLUMN calculation_items.quantity IS 'Количество';
COMMENT ON COLUMN calculation_items.unit_price IS 'Цена за единицу';
COMMENT ON COLUMN calculation_items.total_price IS 'Общая цена';

-- Создание триггера для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_calculations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_calculations_updated_at
    BEFORE UPDATE ON calculations
    FOR EACH ROW
    EXECUTE FUNCTION update_calculations_updated_at();

-- Создание представления для удобного просмотра расчетов с деталями
CREATE OR REPLACE VIEW calculations_with_details AS
SELECT 
    c.id,
    c.lead_id,
    c.client_id,
    c.calculation_number,
    c.calculation_date,
    c.manager,
    c.comments,
    c.total_services_cost,
    c.vat_amount,
    c.total_amount,
    c.status,
    c.created_at,
    c.updated_at,
    c.created_by,
    c.approved_by,
    c.approved_at,
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

-- Создание функции для получения статистики расчетов
CREATE OR REPLACE FUNCTION get_calculations_stats()
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
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_calculations,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_calculations,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_calculations,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_calculations,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_calculations,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(AVG(total_amount), 0) as avg_amount,
        COUNT(*) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)) as calculations_this_month,
        COUNT(*) FILTER (WHERE DATE_TRUNC('year', created_at) = DATE_TRUNC('year', CURRENT_DATE)) as calculations_this_year
    FROM calculations;
END;
$$ LANGUAGE plpgsql;

-- Создание функции для получения расчетов по лиду
CREATE OR REPLACE FUNCTION get_calculations_by_lead(lead_id_param INTEGER)
RETURNS TABLE (
    id INTEGER,
    calculation_number VARCHAR(50),
    calculation_date DATE,
    manager VARCHAR(100),
    total_amount DECIMAL(15,2),
    status VARCHAR(20),
    created_at TIMESTAMP,
    items_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.calculation_number,
        c.calculation_date,
        c.manager,
        c.total_amount,
        c.status,
        c.created_at,
        COUNT(ci.id) as items_count
    FROM calculations c
    LEFT JOIN calculation_items ci ON c.id = ci.calculation_id
    WHERE c.lead_id = lead_id_param
    GROUP BY c.id, c.calculation_number, c.calculation_date, c.manager, c.total_amount, c.status, c.created_at
    ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Примеры запросов для работы с расчетами

-- Получить все расчеты
-- SELECT * FROM calculations ORDER BY created_at DESC;

-- Получить расчеты с деталями
-- SELECT * FROM calculations_with_details ORDER BY created_at DESC;

-- Получить расчеты по лиду
-- SELECT * FROM get_calculations_by_lead(1);

-- Получить статистику расчетов
-- SELECT * FROM get_calculations_stats();

-- Получить расчеты по статусу
-- SELECT * FROM calculations WHERE status = 'approved';

-- Получить расчеты по менеджеру
-- SELECT * FROM calculations WHERE manager = 'admin';

-- Получить расчеты за период
-- SELECT * FROM calculations WHERE calculation_date BETWEEN '2024-01-01' AND '2024-12-31';

-- Обновить статус расчета
-- UPDATE calculations SET status = 'approved', approved_by = 'admin', approved_at = CURRENT_TIMESTAMP WHERE id = 1;

-- Получить детали расчета
-- SELECT ci.* FROM calculation_items ci WHERE ci.calculation_id = 1;

-- Получить расчеты с общей суммой больше определенной
-- SELECT * FROM calculations WHERE total_amount > 10000;

-- Получить топ-10 расчетов по сумме
-- SELECT * FROM calculations ORDER BY total_amount DESC LIMIT 10;
