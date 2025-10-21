#!/bin/bash
# restore-database.sh
# Скрипт восстановления базы данных из резервной копии

# Настройки
DB_NAME="ff_dashboard"
DB_USER="postgres"
BACKUP_DIR="/home/ubuntu/backups"

# Проверяем аргументы
if [ $# -eq 0 ]; then
    echo "❌ Использование: $0 <имя_файла_бэкапа>"
    echo "📋 Доступные бэкапы:"
    ls -la $BACKUP_DIR/ff_dashboard_backup_*.sql.gz 2>/dev/null || echo "   Бэкапы не найдены"
    exit 1
fi

BACKUP_FILE="$1"

# Проверяем существование файла
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Файл бэкапа не найден: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  ВНИМАНИЕ: Это действие полностью заменит текущую базу данных!"
echo "📁 Файл бэкапа: $BACKUP_FILE"
echo "🗄️ База данных: $DB_NAME"
echo ""
read -p "Вы уверены? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Операция отменена"
    exit 1
fi

# Создаем резервную копию текущей БД перед восстановлением
echo "🔄 Создание резервной копии текущей БД..."
CURRENT_BACKUP="$BACKUP_DIR/ff_dashboard_current_$(date +%Y%m%d_%H%M%S).sql"
sudo -u postgres pg_dump $DB_NAME > $CURRENT_BACKUP
gzip $CURRENT_BACKUP
echo "✅ Текущая БД сохранена: $CURRENT_BACKUP.gz"

# Восстанавливаем из бэкапа
echo "🔄 Восстановление базы данных..."

# Распаковываем если нужно
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "📦 Распаковка файла..."
    gunzip -c "$BACKUP_FILE" | sudo -u postgres psql $DB_NAME
else
    sudo -u postgres psql $DB_NAME < "$BACKUP_FILE"
fi

if [ $? -eq 0 ]; then
    echo "✅ База данных восстановлена успешно!"
    echo "🔄 Перезапуск сервера уведомлений..."
    sudo systemctl restart ff-notifications.service
    echo "🎉 Восстановление завершено!"
else
    echo "❌ Ошибка восстановления базы данных"
    exit 1
fi
