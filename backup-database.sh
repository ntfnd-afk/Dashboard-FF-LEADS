#!/bin/bash
# backup-database.sh
# Скрипт автоматического резервного копирования базы данных

# Настройки
DB_NAME="ff_dashboard"
DB_USER="postgres"
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/ff_dashboard_backup_$DATE.sql"

# Создаем директорию для бэкапов если её нет
mkdir -p $BACKUP_DIR

# Создаем резервную копию
echo "🔄 Создание резервной копии базы данных..."
sudo -u postgres pg_dump $DB_NAME > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✅ Резервная копия создана: $BACKUP_FILE"
    
    # Сжимаем файл
    gzip $BACKUP_FILE
    echo "📦 Файл сжат: $BACKUP_FILE.gz"
    
    # Удаляем старые бэкапы (старше 7 дней)
    find $BACKUP_DIR -name "ff_dashboard_backup_*.sql.gz" -mtime +7 -delete
    echo "🗑️ Старые бэкапы удалены"
    
    # Показываем размер файла
    echo "📊 Размер файла: $(du -h $BACKUP_FILE.gz | cut -f1)"
else
    echo "❌ Ошибка создания резервной копии"
    exit 1
fi

echo "🎉 Резервное копирование завершено успешно!"
