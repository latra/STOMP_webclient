// STOMP Web Client Application
class StompWebClient {
    constructor() {
        this.client = null;
        this.subscription = null;
        this.messageCount = 0;
        this.fieldCounter = 0;
        this.authFieldCounter = 0;
        this.CACHE_KEY = 'stomp_debugger_cache';
        this.CONFIGS_KEY = 'stomp_debugger_configs';
        this.ACTIVE_CONFIG_KEY = 'stomp_debugger_active_config';
        this.activeConfigId = null;
        this.configs = {};
        this.initializeElements();
        this.attachEventListeners();
        this.loadConfigurations();
        this.log('Application initialized', 'info');
    }

    initializeElements() {
        // Sidebar elements
        this.configList = document.getElementById('configList');
        this.newConfigBtn = document.getElementById('newConfigBtn');
        this.duplicateConfigBtn = document.getElementById('duplicateConfigBtn');
        this.deleteConfigBtn = document.getElementById('deleteConfigBtn');

        // Connection elements
        this.serverUrlInput = document.getElementById('serverUrl');
        this.connectBtn = document.getElementById('connectBtn');
        this.disconnectBtn = document.getElementById('disconnectBtn');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.addAuthFieldBtn = document.getElementById('addAuthFieldBtn');
        this.authFieldsContainer = document.getElementById('authFieldsContainer');

        // Subscription elements
        this.destinationInput = document.getElementById('destination');
        this.subscribeBtn = document.getElementById('subscribeBtn');
        this.unsubscribeBtn = document.getElementById('unsubscribeBtn');
        this.clearMessagesBtn = document.getElementById('clearMessagesBtn');
        this.addFieldBtn = document.getElementById('addFieldBtn');
        this.clearCacheBtn = document.getElementById('clearCacheBtn');
        this.dynamicFieldsContainer = document.getElementById('dynamicFieldsContainer');

        // Message elements
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageCountSpan = document.getElementById('messageCount');
        this.lastUpdateSpan = document.getElementById('lastUpdate');
        this.logsContainer = document.getElementById('logsContainer');
    }

    attachEventListeners() {
        // Sidebar configuration buttons
        this.newConfigBtn.addEventListener('click', () => this.createNewConfig());
        this.duplicateConfigBtn.addEventListener('click', () => this.duplicateCurrentConfig());
        this.deleteConfigBtn.addEventListener('click', () => this.deleteCurrentConfig());

        // Connection buttons
        this.connectBtn.addEventListener('click', () => this.connect());
        this.disconnectBtn.addEventListener('click', () => this.disconnect());
        this.subscribeBtn.addEventListener('click', () => this.subscribe());
        this.unsubscribeBtn.addEventListener('click', () => this.unsubscribe());
        this.clearMessagesBtn.addEventListener('click', () => this.clearMessages());
        this.addFieldBtn.addEventListener('click', () => this.addField());
        this.addAuthFieldBtn.addEventListener('click', () => this.addAuthField());
        this.clearCacheBtn.addEventListener('click', () => this.handleClearCache());

        // Auto-save connection fields on change
        this.serverUrlInput.addEventListener('input', () => this.saveCurrentConfig());
        this.destinationInput.addEventListener('input', () => this.saveCurrentConfig());
    }

    // ===== Configuration Management Methods =====

    loadConfigurations() {
        try {
            // Try to load from new multi-config system
            const configsJson = localStorage.getItem(this.CONFIGS_KEY);
            const activeConfigId = localStorage.getItem(this.ACTIVE_CONFIG_KEY);

            if (configsJson) {
                this.configs = JSON.parse(configsJson);
                
                if (activeConfigId && this.configs[activeConfigId]) {
                    this.activeConfigId = activeConfigId;
                } else {
                    // If no active config or it doesn't exist, use the first one
                    const configIds = Object.keys(this.configs);
                    this.activeConfigId = configIds.length > 0 ? configIds[0] : null;
                }
            } else {
                // Try to migrate from old single-config system
                const oldCache = localStorage.getItem(this.CACHE_KEY);
                if (oldCache) {
                    const cacheData = JSON.parse(oldCache);
                    const newConfigId = this.generateConfigId();
                    this.configs[newConfigId] = {
                        id: newConfigId,
                        name: 'Configuración Migrada',
                        ...cacheData,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    this.activeConfigId = newConfigId;
                    this.saveAllConfigs();
                    localStorage.removeItem(this.CACHE_KEY);
                    this.log('Migrated from old configuration format', 'info');
                } else {
                    // Create default configuration
                    this.createDefaultConfig();
                }
            }

            this.renderConfigList();
            this.loadConfigToUI(this.activeConfigId);

        } catch (error) {
            console.error('Error loading configurations:', error);
            this.log('Error loading configurations, creating default', 'error');
            this.createDefaultConfig();
        }
    }

    createDefaultConfig() {
        const configId = this.generateConfigId();
        this.configs[configId] = {
            id: configId,
            name: 'Configuración 1',
            serverUrl: 'ws://localhost:4200/realtime',
            destination: '/topic/documents/<SUB_ID> (e.g. /topic/documents/123)',
            authFields: [
                { name: 'token', value: '' },
                { name: 'session-token', value: '' }
            ],
            fields: [
                { name: 'thingsExternalIds', type: 'string', value: '' },
                { name: 'documents', type: 'json', value: '{}' }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.activeConfigId = configId;
        this.saveAllConfigs();
    }

    generateConfigId() {
        return 'config_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    saveAllConfigs() {
        try {
            localStorage.setItem(this.CONFIGS_KEY, JSON.stringify(this.configs));
            localStorage.setItem(this.ACTIVE_CONFIG_KEY, this.activeConfigId);
            console.log('Configurations saved successfully');
        } catch (error) {
            console.error('Error saving configurations:', error);
            this.log('Error saving configurations', 'error');
        }
    }

    saveCurrentConfig() {
        if (!this.activeConfigId || !this.configs[this.activeConfigId]) {
            return;
        }

        const configData = {
            id: this.activeConfigId,
            name: this.configs[this.activeConfigId].name,
            serverUrl: this.serverUrlInput.value,
            destination: this.destinationInput.value,
            authFields: [],
            fields: [],
            createdAt: this.configs[this.activeConfigId].createdAt,
            updatedAt: new Date().toISOString()
        };

        // Save all auth fields
        const authFieldItems = this.authFieldsContainer.querySelectorAll('.field-item');
        authFieldItems.forEach(fieldItem => {
            const fieldName = fieldItem.querySelector('.field-name').value;
            const fieldValue = fieldItem.querySelector('.field-value').value;
            
            configData.authFields.push({
                name: fieldName,
                value: fieldValue
            });
        });

        // Save all subscription fields
        const fieldItems = this.dynamicFieldsContainer.querySelectorAll('.field-item');
        fieldItems.forEach(fieldItem => {
            const fieldName = fieldItem.querySelector('.field-name').value;
            const fieldType = fieldItem.querySelector('.field-type').value;
            const fieldValue = fieldItem.querySelector('.field-value').value;
            
            configData.fields.push({
                name: fieldName,
                type: fieldType,
                value: fieldValue
            });
        });

        this.configs[this.activeConfigId] = configData;
        this.saveAllConfigs();
        this.renderConfigList();
    }

    loadConfigToUI(configId) {
        if (!configId || !this.configs[configId]) {
            this.log('Configuration not found', 'error');
            return;
        }

        const config = this.configs[configId];
        
        // Clear existing fields
        this.authFieldsContainer.innerHTML = '';
        this.dynamicFieldsContainer.innerHTML = '';
        
        // Load connection fields
        this.serverUrlInput.value = config.serverUrl || '';
        this.destinationInput.value = config.destination || '';
        
        // Load auth fields
        if (config.authFields && config.authFields.length > 0) {
            config.authFields.forEach(field => {
                this.addAuthField(field.name, field.value);
            });
        } else {
            this.addDefaultAuthFields();
        }
        
        // Load subscription fields
        if (config.fields && config.fields.length > 0) {
            config.fields.forEach(field => {
                this.addField(field.name, field.type, field.value);
            });
        } else {
            this.addDefaultFields();
        }

        this.log(`Loaded configuration: ${config.name}`, 'info');
    }

    switchToConfig(configId) {
        if (!configId || !this.configs[configId]) {
            return;
        }

        // Save current config before switching
        if (this.activeConfigId) {
            this.saveCurrentConfig();
        }

        this.activeConfigId = configId;
        localStorage.setItem(this.ACTIVE_CONFIG_KEY, this.activeConfigId);
        this.loadConfigToUI(configId);
        this.renderConfigList();
    }

    createNewConfig() {
        const configCount = Object.keys(this.configs).length;
        const configId = this.generateConfigId();
        
        let configName = prompt('Nombre de la nueva configuración:', `Configuración ${configCount + 1}`);
        
        if (!configName) {
            return; // User cancelled
        }

        configName = configName.trim() || `Configuración ${configCount + 1}`;

        this.configs[configId] = {
            id: configId,
            name: configName,
            serverUrl: 'ws://localhost:4200/realtime',
            destination: '/topic/documents/<SUB_ID>',
            authFields: [
                { name: 'token', value: '' },
                { name: 'session-token', value: '' }
            ],
            fields: [
                { name: 'thingsExternalIds', type: 'string', value: '' },
                { name: 'documents', type: 'json', value: '{}' }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.switchToConfig(configId);
        this.saveAllConfigs();
        this.log(`Created new configuration: ${configName}`, 'success');
    }

    duplicateCurrentConfig() {
        if (!this.activeConfigId || !this.configs[this.activeConfigId]) {
            alert('No hay configuración activa para duplicar');
            return;
        }

        const currentConfig = this.configs[this.activeConfigId];
        const newConfigId = this.generateConfigId();
        
        let newName = prompt('Nombre de la configuración duplicada:', `${currentConfig.name} (Copia)`);
        
        if (!newName) {
            return; // User cancelled
        }

        newName = newName.trim() || `${currentConfig.name} (Copia)`;

        // Deep copy the current config
        this.configs[newConfigId] = {
            ...JSON.parse(JSON.stringify(currentConfig)),
            id: newConfigId,
            name: newName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.switchToConfig(newConfigId);
        this.saveAllConfigs();
        this.log(`Duplicated configuration: ${newName}`, 'success');
    }

    deleteCurrentConfig() {
        if (!this.activeConfigId || !this.configs[this.activeConfigId]) {
            alert('No hay configuración activa para borrar');
            return;
        }

        const configCount = Object.keys(this.configs).length;
        
        if (configCount === 1) {
            alert('No puedes borrar la única configuración. Crea otra primero.');
            return;
        }

        const currentConfig = this.configs[this.activeConfigId];
        
        if (!confirm(`¿Estás seguro de que quieres borrar la configuración "${currentConfig.name}"?`)) {
            return;
        }

        const configIdToDelete = this.activeConfigId;
        
        // Find another config to switch to
        const otherConfigId = Object.keys(this.configs).find(id => id !== configIdToDelete);
        
        if (otherConfigId) {
            delete this.configs[configIdToDelete];
            this.switchToConfig(otherConfigId);
            this.saveAllConfigs();
            this.log(`Deleted configuration: ${currentConfig.name}`, 'warning');
        }
    }

    renderConfigList() {
        this.configList.innerHTML = '';

        const configIds = Object.keys(this.configs).sort((a, b) => {
            return new Date(this.configs[b].updatedAt) - new Date(this.configs[a].updatedAt);
        });

        configIds.forEach(configId => {
            const config = this.configs[configId];
            const configItem = document.createElement('div');
            configItem.className = 'config-item';
            
            if (configId === this.activeConfigId) {
                configItem.classList.add('active');
            }

            const updatedDate = new Date(config.updatedAt);
            const formattedDate = updatedDate.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const formattedTime = updatedDate.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });

            configItem.innerHTML = `
                <div class="config-item-name">${config.name}</div>
                <div class="config-item-details">
                    <span>📅 ${formattedDate} ${formattedTime}</span>
                    <span>🔗 ${config.serverUrl ? new URL(config.serverUrl).host : 'Sin servidor'}</span>
                </div>
            `;

            configItem.addEventListener('click', () => {
                this.switchToConfig(configId);
            });

            this.configList.appendChild(configItem);
        });

        if (configIds.length === 0) {
            this.configList.innerHTML = '<div class="empty-state">No hay configuraciones guardadas</div>';
        }
    }

    addDefaultAuthFields() {
        // Add token field by default
        this.addAuthField('token', '');
        // Add session-token field by default
        this.addAuthField('session-token', '');
    }

    addDefaultFields() {
        // Add thingsExternalIds field by default
        this.addField('thingsExternalIds', 'string', '');
        // Add documents field by default
        this.addField('documents', 'json', '{}');
    }

    addAuthField(name = '', value = '') {
        this.authFieldCounter++;
        const fieldId = `auth-field-${this.authFieldCounter}`;

        const fieldElement = document.createElement('div');
        fieldElement.className = 'field-item';
        fieldElement.id = fieldId;

        fieldElement.innerHTML = `
            <div class="field-input-group">
                <label>Header Name</label>
                <input 
                    type="text" 
                    class="field-name" 
                    placeholder="e.g. token" 
                    value="${name}"
                >
            </div>
            <div class="field-input-group" style="flex: 2;">
                <label>Value</label>
                <input 
                    type="text" 
                    class="field-value" 
                    placeholder="Enter header value" 
                    value="${value}"
                >
            </div>
            <button class="btn-remove" onclick="stompClient.removeAuthField('${fieldId}')">🗑️</button>
        `;

        this.authFieldsContainer.appendChild(fieldElement);

        // Add event listeners for caching
        const nameInput = fieldElement.querySelector('.field-name');
        const valueInput = fieldElement.querySelector('.field-value');
        
        nameInput.addEventListener('input', () => {
            this.saveCurrentConfig();
        });

        valueInput.addEventListener('input', () => {
            this.saveCurrentConfig();
        });
    }

    removeAuthField(fieldId) {
        const fieldElement = document.getElementById(fieldId);
        if (fieldElement) {
            fieldElement.remove();
            this.log(`Auth field removed`, 'info');
            this.saveCurrentConfig();
        }
    }

    handleClearCache() {
        if (confirm('¿Estás seguro de que quieres borrar TODAS las configuraciones? Esta acción no se puede deshacer.')) {
            try {
                localStorage.removeItem(this.CONFIGS_KEY);
                localStorage.removeItem(this.ACTIVE_CONFIG_KEY);
                localStorage.removeItem(this.CACHE_KEY);
                this.log('All configurations cleared', 'warning');
                location.reload();
            } catch (error) {
                console.error('Error clearing configurations:', error);
            }
        }
    }

    addField(name = '', type = 'string', value = '') {
        this.fieldCounter++;
        const fieldId = `field-${this.fieldCounter}`;

        const fieldElement = document.createElement('div');
        fieldElement.className = 'field-item';
        fieldElement.id = fieldId;

        fieldElement.innerHTML = `
            <div class="field-input-group">
                <label>Field Name</label>
                <input 
                    type="text" 
                    class="field-name" 
                    placeholder="e.g. thingsExternalIds" 
                    value="${name}"
                >
            </div>
            <div class="field-input-group">
                <label>Type</label>
                <select class="field-type">
                    <option value="string" ${type === 'string' ? 'selected' : ''}>String</option>
                    <option value="number" ${type === 'number' ? 'selected' : ''}>Number</option>
                    <option value="boolean" ${type === 'boolean' ? 'selected' : ''}>Boolean</option>
                    <option value="json" ${type === 'json' ? 'selected' : ''}>JSON</option>
                    <option value="array" ${type === 'array' ? 'selected' : ''}>Array (CSV)</option>
                </select>
            </div>
            <div class="field-input-group">
                <label>Value</label>
                ${type === 'json' ? 
                    `<textarea class="field-value" rows="3" placeholder='{"key": "value"}'>${value}</textarea>` :
                    `<input type="text" class="field-value" placeholder="Enter value" value="${value}">`
                }
                <span class="field-error" style="display: none;"></span>
            </div>
            <button class="btn-remove" onclick="stompClient.removeField('${fieldId}')">🗑️</button>
        `;

        this.dynamicFieldsContainer.appendChild(fieldElement);

        // Add event listeners for validation and caching
        const nameInput = fieldElement.querySelector('.field-name');
        const typeSelect = fieldElement.querySelector('.field-type');
        const valueInput = fieldElement.querySelector('.field-value');
        
        nameInput.addEventListener('input', () => {
            this.saveCurrentConfig();
        });

        typeSelect.addEventListener('change', (e) => {
            this.handleTypeChange(fieldId, e.target.value);
            this.saveCurrentConfig();
        });

        valueInput.addEventListener('input', () => {
            this.validateField(fieldId);
            this.saveCurrentConfig();
        });

        valueInput.addEventListener('blur', () => {
            this.validateField(fieldId);
        });
    }

    handleTypeChange(fieldId, newType) {
        const fieldElement = document.getElementById(fieldId);
        const valueContainer = fieldElement.querySelector('.field-input-group:nth-child(3)');
        const currentValue = fieldElement.querySelector('.field-value').value;

        // Create new input based on type
        let newInput;
        if (newType === 'json') {
            newInput = `<textarea class="field-value" rows="3" placeholder='{"key": "value"}'>${currentValue}</textarea>`;
        } else {
            let placeholder = 'Enter value';
            if (newType === 'number') placeholder = 'e.g. 123';
            else if (newType === 'boolean') placeholder = 'true or false';
            else if (newType === 'array') placeholder = 'e.g. value1,value2,value3';
            
            newInput = `<input type="text" class="field-value" placeholder="${placeholder}" value="${currentValue}">`;
        }

        valueContainer.innerHTML = `
            <label>Value</label>
            ${newInput}
            <span class="field-error" style="display: none;"></span>
        `;

        // Reattach event listeners
        const valueInput = fieldElement.querySelector('.field-value');
        valueInput.addEventListener('input', () => {
            this.validateField(fieldId);
            this.saveCurrentConfig();
        });
        valueInput.addEventListener('blur', () => {
            this.validateField(fieldId);
        });

        this.validateField(fieldId);
    }

    validateField(fieldId) {
        const fieldElement = document.getElementById(fieldId);
        const type = fieldElement.querySelector('.field-type').value;
        const valueInput = fieldElement.querySelector('.field-value');
        const errorSpan = fieldElement.querySelector('.field-error');
        const value = valueInput.value.trim();

        // Reset error state
        fieldElement.classList.remove('error');
        errorSpan.style.display = 'none';
        errorSpan.textContent = '';

        // Skip validation if empty
        if (!value) return true;

        let isValid = true;
        let errorMessage = '';

        switch (type) {
            case 'number':
                if (isNaN(value)) {
                    isValid = false;
                    errorMessage = 'Must be a valid number';
                }
                break;

            case 'boolean':
                const lowerValue = value.toLowerCase();
                if (lowerValue !== 'true' && lowerValue !== 'false') {
                    isValid = false;
                    errorMessage = 'Must be "true" or "false"';
                }
                break;

            case 'json':
                try {
                    JSON.parse(value);
                } catch (e) {
                    isValid = false;
                    errorMessage = 'Invalid JSON: ' + e.message;
                }
                break;

            case 'array':
                // Arrays are comma-separated, always valid format
                break;

            case 'string':
                // Strings are always valid
                break;
        }

        if (!isValid) {
            fieldElement.classList.add('error');
            errorSpan.style.display = 'block';
            errorSpan.textContent = errorMessage;
        }

        return isValid;
    }

    removeField(fieldId) {
        const fieldElement = document.getElementById(fieldId);
        if (fieldElement) {
            fieldElement.remove();
            this.log(`Field removed`, 'info');
            this.saveCurrentConfig();
        }
    }

    updateStatus(status, text) {
        this.statusIndicator.className = `status-indicator ${status}`;
        this.statusText.textContent = text;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `
            <span class="log-time">[${timestamp}]</span>
            <span class="log-${type}">${message}</span>
        `;
        this.logsContainer.insertBefore(logEntry, this.logsContainer.firstChild);
        
        // Keep only last 100 logs
        while (this.logsContainer.children.length > 100) {
            this.logsContainer.removeChild(this.logsContainer.lastChild);
        }
    }

    connect() {
        const serverUrl = this.serverUrlInput.value.trim();

        if (!serverUrl) {
            alert('Please enter the server URL');
            this.log('Error: Server URL is empty', 'error');
            return;
        }

        // Build auth headers from dynamic fields
        const connectHeaders = this.buildAuthHeaders();
        if (!connectHeaders) {
            return; // Error already shown in buildAuthHeaders
        }

        this.log(`Connecting to ${serverUrl}...`, 'info');
        this.log(`Auth headers: ${JSON.stringify(connectHeaders, null, 2)}`, 'info');
        this.updateStatus('connecting', 'Connecting...');
        this.connectBtn.disabled = true;

        // Create STOMP client
        this.client = new StompJs.Client({
            brokerURL: serverUrl,
            connectHeaders: connectHeaders,
            debug: (str) => {
                console.log(str);
                this.log(`Debug: ${str}`, 'info');
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: (frame) => {
                this.onConnected(frame);
            },
            onStompError: (frame) => {
                this.onError(frame);
            },
            onWebSocketClose: (event) => {
                this.onDisconnected(event);
            },
            onWebSocketError: (event) => {
                this.log('WebSocket error: ' + JSON.stringify(event), 'error');
            }
        });

        try {
            this.client.activate();
        } catch (error) {
            this.log(`Error activating client: ${error.message}`, 'error');
            this.updateStatus('error', 'Connection error');
            this.connectBtn.disabled = false;
        }
    }

    buildAuthHeaders() {
        const headers = {};
        
        // Get all auth fields
        const authFieldItems = this.authFieldsContainer.querySelectorAll('.field-item');
        
        if (authFieldItems.length === 0) {
            alert('Please add at least one authentication header');
            this.log('Error: No authentication headers defined', 'error');
            return null;
        }

        for (const fieldItem of authFieldItems) {
            const fieldName = fieldItem.querySelector('.field-name').value.trim();
            const fieldValue = fieldItem.querySelector('.field-value').value.trim();

            // Skip empty field names
            if (!fieldName) {
                continue;
            }

            // Warn if value is empty but still add it
            if (!fieldValue) {
                this.log(`Warning: Auth header "${fieldName}" has empty value`, 'warning');
            }

            headers[fieldName] = fieldValue;
            this.log(`Auth header added: ${fieldName} = ${fieldValue ? '***' : '(empty)'}`, 'info');
        }

        if (Object.keys(headers).length === 0) {
            alert('Please fill in at least one authentication header with a valid name');
            this.log('Error: No valid authentication headers', 'error');
            return null;
        }

        return headers;
    }

    onConnected(frame) {
        this.log('Successfully connected to STOMP server', 'success');
        this.updateStatus('connected', 'Connected');
        this.connectBtn.disabled = true;
        this.disconnectBtn.disabled = false;
        this.subscribeBtn.disabled = false;
        console.log('Connected: ' + frame);
    }

    onError(frame) {
        this.log('STOMP error: ' + frame.headers['message'], 'error');
        this.log('Details: ' + frame.body, 'error');
        this.updateStatus('error', 'Connection error');
        this.connectBtn.disabled = false;
        this.disconnectBtn.disabled = true;
        this.subscribeBtn.disabled = true;
    }

    onDisconnected(event) {
        this.log('Disconnected from server', 'warning');
        this.updateStatus('', 'Disconnected');
        this.connectBtn.disabled = false;
        this.disconnectBtn.disabled = true;
        this.subscribeBtn.disabled = true;
        this.unsubscribeBtn.disabled = true;
        this.subscription = null;
    }

    disconnect() {
        if (this.client) {
            this.log('Disconnecting...', 'info');
            this.client.deactivate();
            this.client = null;
        }
    }

    subscribe() {
        if (!this.client || !this.client.connected) {
            alert('You must connect to the server first');
            this.log('Error: No active connection', 'error');
            return;
        }
        // Parse subscription headers
        const headers = this.buildSubscriptionHeaders();
        if (!headers) {
            return;
        }

        // Fix: destination should be the string value, not an element/object reference
        const destination = this.destinationInput.value.trim();

        if (!destination) {
            alert('Please enter the subscription destination');
            this.log('Error: Subscription destination is empty', 'error');
            return;
        }

        this.log(`Subscribing to: ${destination}`, 'info');
        this.log(`Headers: ${JSON.stringify(headers, null, 2)}`, 'info');

        try {
            this.subscription = this.client.subscribe(
                destination,
                (message) => {
                    this.onMessageReceived(message);
                },
                headers
            );

            this.log('Subscription successful', 'success');
            this.subscribeBtn.disabled = true;
            this.unsubscribeBtn.disabled = false;
        } catch (error) {
            this.log(`Error subscribing: ${error.message}`, 'error');
        }
    }

    buildSubscriptionHeaders() {
        const headers = {};
        const idSubscription = this.destinationInput.value.trim().split('/').pop();
        if (idSubscription) {
            headers['id'] = idSubscription;
        }

        // Get all dynamic fields
        const fieldItems = this.dynamicFieldsContainer.querySelectorAll('.field-item');
        
        for (const fieldItem of fieldItems) {
            const fieldName = fieldItem.querySelector('.field-name').value.trim();
            const fieldType = fieldItem.querySelector('.field-type').value;
            const fieldValue = fieldItem.querySelector('.field-value').value.trim();

            // Skip empty field names or empty values
            if (!fieldName || !fieldValue) {
                continue;
            }

            // Validate field before adding
            if (!this.validateField(fieldItem.id)) {
                alert(`Error: Field "${fieldName}" has an invalid value for type ${fieldType}`);
                this.log(`Validation failed for field: ${fieldName}`, 'error');
                return null;
            }

            // Process value based on type
            try {
                let processedValue;
                
                switch (fieldType) {
                    case 'string':
                        processedValue = fieldValue;
                        break;

                    case 'number':
                        processedValue = parseFloat(fieldValue);
                        if (isNaN(processedValue)) {
                            throw new Error(`Número inválido: ${fieldValue}`);
                        }
                        processedValue = processedValue.toString();
                        break;

                    case 'boolean':
                        const lowerValue = fieldValue.toLowerCase();
                        if (lowerValue !== 'true' && lowerValue !== 'false') {
                            throw new Error(`Boolean inválido: ${fieldValue}`);
                        }
                        processedValue = lowerValue;
                        break;

                    case 'json':
                        // Validate JSON and stringify it
                        const jsonObj = JSON.parse(fieldValue);
                        processedValue = JSON.stringify(jsonObj);
                        break;

                    case 'array':
                        // Convert CSV to array and stringify
                        const arrayValues = fieldValue.split(',').map(v => v.trim()).filter(v => v);
                        processedValue = JSON.stringify(arrayValues);
                        break;

                    default:
                        processedValue = fieldValue;
                }

                headers[fieldName] = processedValue;
                this.log(`Field added: ${fieldName} = ${processedValue}`, 'info');

            } catch (error) {
                alert(`Error processing field "${fieldName}": ${error.message}`);
                this.log(`Error processing field ${fieldName}: ${error.message}`, 'error');
                return null;
            }
        }

        return headers;
    }

    unsubscribe() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
            this.log('Unsubscription successful', 'success');
            this.subscribeBtn.disabled = false;
            this.unsubscribeBtn.disabled = true;
        }
    }

    onMessageReceived(message) {
        this.messageCount++;
        this.messageCountSpan.textContent = this.messageCount;
        this.lastUpdateSpan.textContent = new Date().toLocaleTimeString();

        this.log(`Message received at ${message.headers.destination || 'unknown'}`, 'success');

        // Remove empty state message if present
        const emptyState = this.messagesContainer.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = 'message-item';

        // Format message body
        let formattedBody;
        try {
            const bodyObj = JSON.parse(message.body);
            formattedBody = JSON.stringify(bodyObj, null, 2);
        } catch (e) {
            formattedBody = message.body;
        }

        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
                <span>Mensaje #${this.messageCount}</span>
            </div>
            <div class="message-body">${formattedBody}</div>
        `;

        this.messagesContainer.insertBefore(messageElement, this.messagesContainer.firstChild);

        // Keep only last 50 messages
        while (this.messagesContainer.children.length > 50) {
            this.messagesContainer.removeChild(this.messagesContainer.lastChild);
        }
    }

    clearMessages() {
        this.messagesContainer.innerHTML = '<p class="empty-state">No messages yet. Connect and subscribe to receive messages.</p>';
        this.messageCount = 0;
        this.messageCountSpan.textContent = '0';
        this.lastUpdateSpan.textContent = '-';
        this.log('Messages cleared', 'info');
    }
}

// Initialize application when DOM is ready
let stompClient;
document.addEventListener('DOMContentLoaded', () => {
    stompClient = new StompWebClient();
    console.log('STOMP Web Client ready');
});
