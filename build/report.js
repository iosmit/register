// Customers CSV URL - using proxy endpoint to keep URL hidden
const CUSTOMERS_URL = '/api/customers';

// Cache keys - must match customers.js
const CUSTOMERS_CACHE_KEY = 'customersCache';
const CUSTOMERS_CACHE_TIMESTAMP_KEY = 'customersCacheTimestamp';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

class ReportManager {
    constructor() {
        this.allReceipts = [];
        this.filteredReceipts = [];
        this.currentFilter = {
            type: 'all',
            value: null
        };
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadReceipts();
        // calculateAndDisplayStats() is called in loadReceipts() after data is loaded
    }

    setupEventListeners() {
        const filterType = document.getElementById('filterType');
        const applyFilterBtn = document.getElementById('applyFilterBtn');
        const clearFilterBtn = document.getElementById('clearFilterBtn');
        const dayFilter = document.getElementById('dayFilter');
        const monthFilter = document.getElementById('monthFilter');
        const yearFilter = document.getElementById('yearFilter');

        filterType.addEventListener('change', () => {
            this.handleFilterTypeChange(filterType.value);
        });

        applyFilterBtn.addEventListener('click', () => {
            this.applyFilter();
        });

        clearFilterBtn.addEventListener('click', () => {
            this.clearFilter();
        });
    }

    handleFilterTypeChange(filterType) {
        const dayFilter = document.getElementById('dayFilter');
        const monthFilter = document.getElementById('monthFilter');
        const yearFilter = document.getElementById('yearFilter');

        // Hide all filters
        dayFilter.style.display = 'none';
        monthFilter.style.display = 'none';
        yearFilter.style.display = 'none';

        // Show relevant filter
        if (filterType === 'day') {
            dayFilter.style.display = 'block';
        } else if (filterType === 'month') {
            monthFilter.style.display = 'block';
        } else if (filterType === 'year') {
            yearFilter.style.display = 'block';
        }
    }

    applyFilter() {
        const filterType = document.getElementById('filterType').value;
        let filterValue = null;

        if (filterType === 'day') {
            const dayInput = document.getElementById('filterDay').value;
            if (!dayInput) {
                alert('Please select a day');
                return;
            }
            filterValue = dayInput;
        } else if (filterType === 'month') {
            const monthInput = document.getElementById('filterMonth').value;
            if (!monthInput) {
                alert('Please select a month');
                return;
            }
            filterValue = monthInput;
        } else if (filterType === 'year') {
            const yearInput = document.getElementById('filterYear').value;
            if (!yearInput) {
                alert('Please enter a year');
                return;
            }
            filterValue = yearInput;
        }

        this.currentFilter = {
            type: filterType,
            value: filterValue
        };

        this.filterReceipts();
        this.calculateAndDisplayStats();
    }

    clearFilter() {
        document.getElementById('filterType').value = 'all';
        document.getElementById('filterDay').value = '';
        document.getElementById('filterMonth').value = '';
        document.getElementById('filterYear').value = '';
        this.handleFilterTypeChange('all');
        
        this.currentFilter = {
            type: 'all',
            value: null
        };

        this.filterReceipts();
        this.calculateAndDisplayStats();
    }

    filterReceipts() {
        if (this.currentFilter.type === 'all') {
            this.filteredReceipts = [...this.allReceipts];
            return;
        }

        this.filteredReceipts = this.allReceipts.filter(receipt => {
            if (!receipt.date) return false;

            const receiptDate = this.parseDateString(receipt.date);
            if (!receiptDate) return false;

            if (this.currentFilter.type === 'day') {
                // Filter by specific day (YYYY-MM-DD format)
                const filterDate = new Date(this.currentFilter.value);
                return this.isSameDay(receiptDate, filterDate);
            } else if (this.currentFilter.type === 'month') {
                // Filter by month (YYYY-MM format)
                const filterYear = parseInt(this.currentFilter.value.split('-')[0]);
                const filterMonth = parseInt(this.currentFilter.value.split('-')[1]) - 1;
                return receiptDate.getFullYear() === filterYear && 
                       receiptDate.getMonth() === filterMonth;
            } else if (this.currentFilter.type === 'year') {
                // Filter by year
                const filterYear = parseInt(this.currentFilter.value);
                return receiptDate.getFullYear() === filterYear;
            }

            return false;
        });
    }

    parseDateString(dateStr) {
        if (!dateStr) return null;
        
        // Try to parse DD/MM/YYYY format
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
            const year = parseInt(parts[2], 10);
            return new Date(year, month, day);
        }
        
        // Try to parse other formats
        const parsed = new Date(dateStr);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    async loadReceipts() {
        this.showLoading();
        try {
            // Always try to load from cache first
            let csvText = localStorage.getItem(CUSTOMERS_CACHE_KEY);
            
            if (!csvText || csvText.trim() === '') {
                // No cache available - fetch from server
                console.log('No customers cache found, fetching from server...');
                try {
                    const response = await fetch(`${CUSTOMERS_URL}?t=${Date.now()}`);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch receipts: ${response.status} ${response.statusText}`);
                    }
                    csvText = await response.text();
                    
                    // Validate that we got actual data
                    if (!csvText || csvText.trim() === '') {
                        throw new Error('Received empty response from server');
                    }
                    
                    // Save to cache
                    localStorage.setItem(CUSTOMERS_CACHE_KEY, csvText);
                    localStorage.setItem(CUSTOMERS_CACHE_TIMESTAMP_KEY, Date.now().toString());
                    console.log('Fetched and cached customers data from server');
                } catch (fetchError) {
                    console.error('Error fetching from server:', fetchError);
                    this.hideLoading();
                    this.showError(`Failed to load receipts from server: ${fetchError.message}. Please check your connection and try again.`);
                    return;
                }
            } else {
                console.log('Loading receipts from cache');
            }
            
            // Validate csvText before parsing
            if (!csvText || csvText.trim() === '') {
                throw new Error('No data available to parse');
            }
            
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                quotes: true,
                escapeChar: '"',
                delimiter: ',',
                newline: '\n',
                complete: (results) => {
                    try {
                        const receipts = [];
                        
                        // Check if we have valid data
                        if (!results.data || results.data.length === 0) {
                            console.log('No customer data found in CSV');
                            this.allReceipts = [];
                            this.filteredReceipts = [];
                            this.hideLoading();
                            this.calculateAndDisplayStats();
                            return;
                        }
                        
                        // Extract all receipts from all customers
                        results.data.forEach((row) => {
                            const rowKeys = Object.keys(row);
                            
                            // Sort keys to maintain column order
                            const sortedKeys = rowKeys.sort((a, b) => {
                                if (a.toUpperCase() === 'CUSTOMER') return -1;
                                if (b.toUpperCase() === 'CUSTOMER') return 1;
                                return a.localeCompare(b);
                            });
                            
                            for (const key of sortedKeys) {
                                if (key.toUpperCase() !== 'CUSTOMER') {
                                    const receiptValue = row[key];
                                    if (receiptValue && receiptValue.trim() !== '') {
                                        try {
                                            let receiptJson = receiptValue;
                                            
                                            // Try to parse it
                                            if (typeof receiptJson === 'string') {
                                                receiptJson = receiptJson.trim();
                                                if (receiptJson.startsWith('"') && receiptJson.endsWith('"')) {
                                                    receiptJson = receiptJson.slice(1, -1);
                                                }
                                                receiptJson = receiptJson.replace(/""/g, '"');
                                                
                                                const receipt = JSON.parse(receiptJson);
                                                receipts.push(receipt);
                                            } else {
                                                receipts.push(receiptJson);
                                            }
                                        } catch (e) {
                                            console.error('Error parsing receipt JSON:', e);
                                            // Continue processing other receipts
                                        }
                                    }
                                }
                            }
                        });

                        console.log(`Loaded ${receipts.length} receipts`);
                        this.allReceipts = receipts;
                        this.filteredReceipts = [...receipts];
                        this.hideLoading();
                        this.calculateAndDisplayStats();
                    } catch (parseError) {
                        console.error('Error processing parsed data:', parseError);
                        this.hideLoading();
                        this.showError('Failed to process receipt data. Please try again.');
                    }
                },
                error: (error) => {
                    console.error('Error parsing receipts CSV:', error);
                    this.hideLoading();
                    this.showError(`Failed to parse receipt data: ${error.message || 'Unknown error'}. Please try again.`);
                }
            });
        } catch (error) {
            console.error('Error loading receipts:', error);
            this.hideLoading();
            this.showError(`Failed to load receipts: ${error.message || 'Unknown error'}. Please try again.`);
        }
    }

    calculateAndDisplayStats() {
        let totalSales = 0;
        let totalOutstanding = 0;
        let totalPaid = 0;

        this.filteredReceipts.forEach(receipt => {
            const grandTotal = receipt.grandTotal || 0;
            const cashPayment = receipt.payments?.cash || 0;
            const onlinePayment = receipt.payments?.online || 0;
            const totalPayment = cashPayment + onlinePayment;
            const remainingBalance = receipt.remainingBalance !== undefined 
                ? receipt.remainingBalance 
                : (grandTotal - totalPayment);

            totalSales += grandTotal;
            totalPaid += totalPayment;
            totalOutstanding += Math.max(0, remainingBalance);
        });

        document.getElementById('totalSales').textContent = `₹${this.formatCurrency(totalSales)}`;
        document.getElementById('totalOutstanding').textContent = `₹${this.formatCurrency(totalOutstanding)}`;
        document.getElementById('totalPaid').textContent = `₹${this.formatCurrency(totalPaid)}`;
    }

    formatCurrency(amount) {
        return parseFloat(amount).toFixed(2);
    }

    showLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.classList.add('active');
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.classList.remove('active');
    }

    showError(message) {
        const mainContent = document.querySelector('.main-content');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        mainContent.insertBefore(errorDiv, mainContent.firstChild);
    }
}

// Initialize the report manager
const reportManager = new ReportManager();

