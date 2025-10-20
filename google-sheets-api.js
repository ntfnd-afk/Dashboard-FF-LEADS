// Google Sheets Integration
class GoogleSheetsAPI {
    constructor() {
        this.apiKey = '';
        this.spreadsheetId = '';
        this.sheetName = 'Себестоимость';
        this.isConfigured = false;
    }

    // Настройка API ключа и ID таблицы
    configure(apiKey, spreadsheetId, sheetName = 'Себестоимость') {
        this.apiKey = apiKey;
        this.spreadsheetId = spreadsheetId;
        this.sheetName = sheetName;
        this.isConfigured = apiKey && spreadsheetId;
        
        // Сохраняем настройки в localStorage
        localStorage.setItem('gs-api-key', apiKey);
        localStorage.setItem('gs-spreadsheet-id', spreadsheetId);
        localStorage.setItem('gs-sheet-name', sheetName);
    }

    // Загрузка настроек из localStorage
    loadSettings() {
        this.apiKey = localStorage.getItem('gs-api-key') || '';
        this.spreadsheetId = localStorage.getItem('gs-spreadsheet-id') || '';
        this.sheetName = localStorage.getItem('gs-sheet-name') || 'Себестоимость';
        this.isConfigured = this.apiKey && this.spreadsheetId;
    }

    // Получение данных из Google Sheets
    async fetchData() {
        if (!this.isConfigured) {
            throw new Error('Google Sheets не настроен. Укажите API ключ и ID таблицы.');
        }

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${this.sheetName}!A:C?key=${this.apiKey}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Ошибка загрузки данных: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            return this.parseSheetData(data.values);
        } catch (error) {
            console.error('Ошибка при загрузке данных из Google Sheets:', error);
            throw error;
        }
    }

    // Парсинг данных из Google Sheets
    parseSheetData(values) {
        if (!values || values.length < 2) {
            return [];
        }

        // Пропускаем заголовок (первая строка)
        const dataRows = values.slice(1);
        
        return dataRows
            .filter(row => row.length >= 2 && row[0] && row[1]) // Фильтруем пустые строки
            .map(row => ({
                service: row[0].trim(),
                price: parseFloat(row[1]) || 0,
                unit: row[2] ? row[2].trim() : 'шт'
            }));
    }

    // Проверка доступности API
    async testConnection() {
        if (!this.isConfigured) {
            return { success: false, message: 'Google Sheets не настроен' };
        }

        try {
            await this.fetchData();
            return { success: true, message: 'Подключение успешно' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

// Глобальный экземпляр API
const gsAPI = new GoogleSheetsAPI();
