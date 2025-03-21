let rules = [];

document.addEventListener('DOMContentLoaded', function() {
    loadRules();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('saveRule').addEventListener('click', saveRule);
    document.getElementById('exportRules').addEventListener('click', exportRules);
    document.getElementById('importRules').addEventListener('change', importRules);
}

async function loadRules() {
    try {
        const response = await fetch('/api/rules');
        rules = await response.json();
        displayRules();
    } catch (error) {
        console.error('Error loading rules:', error);
        // Load sample rules for demonstration
        rules = [
            {
                field: 'transaction_amount',
                operator: 'greater_than',
                value: '10000',
                reason: 'Large transaction amount detected'
            },
            {
                field: 'transaction_frequency',
                operator: 'greater_than',
                value: '5',
                reason: 'Multiple transactions in short period'
            }
        ];
        displayRules();
    }
}

function displayRules() {
    const tbody = document.getElementById('rulesBody');
    tbody.innerHTML = rules.map((rule, index) => `
        <tr>
            <td>${formatField(rule.field)}</td>
            <td>${formatOperator(rule.operator)}</td>
            <td>${rule.value}</td>
            <td>${rule.reason}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="deleteRule(${index})">
                    Delete
                </button>
            </td>
        </tr>
    `).join('');
}

async function saveRule() {
    const form = document.getElementById('addRuleForm');
    const formData = new FormData(form);
    const ruleData = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/api/rules', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(ruleData)
        });

        if (response.ok) {
            rules.push(ruleData);
            displayRules();
            bootstrap.Modal.getInstance(document.getElementById('addRuleModal')).hide();
            form.reset();
        } else {
            throw new Error('Failed to save rule');
        }
    } catch (error) {
        console.error('Error saving rule:', error);
        alert('Error saving rule. Please try again.');
    }
}

async function deleteRule(index) {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
        const response = await fetch(`/api/rules/${index}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            rules.splice(index, 1);
            displayRules();
        } else {
            throw new Error('Failed to delete rule');
        }
    } catch (error) {
        console.error('Error deleting rule:', error);
        alert('Error deleting rule. Please try again.');
    }
}

function exportRules() {
    const dataStr = JSON.stringify(rules, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'fraud_rules.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function importRules(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const importedRules = JSON.parse(e.target.result);
            
            const response = await fetch('/api/rules/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(importedRules)
            });

            if (response.ok) {
                rules = importedRules;
                displayRules();
                alert('Rules imported successfully!');
            } else {
                throw new Error('Failed to import rules');
            }
        } catch (error) {
            console.error('Error importing rules:', error);
            alert('Error importing rules. Please check the file format.');
        }
    };
    reader.readAsText(file);
}

function formatField(field) {
    return field.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

function formatOperator(operator) {
    return operator.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Add field-specific validation rules
const fieldValidations = {
    transaction_amount: {
        type: 'number',
        min: 0,
        operators: ['greater_than', 'less_than', 'equals', 'not_equals', 'between']
    },
    transaction_frequency: {
        type: 'number',
        min: 0,
        operators: ['greater_than', 'less_than', 'equals', 'between']
    },
    payment_mode: {
        type: 'string',
        operators: ['equals', 'in_list', 'not_equals']
    },
    payer_email: {
        type: 'string',
        operators: ['equals', 'contains', 'regex', 'ends_with']
    },
    ip_address: {
        type: 'string',
        operators: ['equals', 'in_list', 'regex']
    }
};

// Update operator based on selected field
document.getElementById('ruleField').addEventListener('change', function(e) {
    const field = e.target.value;
    const operatorSelect = document.getElementById('ruleOperator');
    const validOperators = fieldValidations[field]?.operators || [];
    
    // Update available operators
    operatorSelect.innerHTML = '<option value="">Select Operator</option>' +
        Object.entries(operatorLabels)
            .filter(([key]) => validOperators.includes(key))
            .map(([key, label]) => `<option value="${key}">${label}</option>`)
            .join('');
});

// Update value input based on selected operator
document.getElementById('ruleOperator').addEventListener('change', function(e) {
    const operator = e.target.value;
    const singleValueInput = document.getElementById('singleValueInput');
    const rangeValueInput = document.getElementById('rangeValueInput');
    
    if (operator === 'between') {
        singleValueInput.classList.add('d-none');
        rangeValueInput.classList.remove('d-none');
    } else {
        singleValueInput.classList.remove('d-none');
        rangeValueInput.classList.add('d-none');
    }
});

// Validate rule before saving
function validateRule(ruleData) {
    const fieldValidation = fieldValidations[ruleData.field];
    if (!fieldValidation) return true; // No specific validation rules

    if (fieldValidation.type === 'number') {
        const value = parseFloat(ruleData.value);
        if (isNaN(value)) return false;
        if ('min' in fieldValidation && value < fieldValidation.min) return false;
    }

    if (ruleData.operator === 'regex') {
        try {
            new RegExp(ruleData.value);
        } catch (e) {
            return false;
        }
    }

    return true;
}

// Test rule functionality
document.getElementById('testRule').addEventListener('click', function() {
    const ruleModal = bootstrap.Modal.getInstance(document.getElementById('addRuleModal'));
    ruleModal.hide();
    
    const testModal = new bootstrap.Modal(document.getElementById('testRuleModal'));
    testModal.show();
});

document.getElementById('runTest').addEventListener('click', function() {
    const testValue = document.getElementById('testValue').value;
    const field = document.getElementById('ruleField').value;
    const operator = document.getElementById('ruleOperator').value;
    const ruleValue = document.getElementById('ruleValue').value;
    
    const result = testRuleLogic(field, operator, ruleValue, testValue);
    
    const resultDiv = document.getElementById('testResult');
    resultDiv.classList.remove('d-none', 'alert-success', 'alert-danger');
    resultDiv.classList.add(result ? 'alert-danger' : 'alert-success');
    resultDiv.textContent = result 
        ? '⚠️ Rule would trigger for this value (Potential Fraud)'
        : '✅ Rule would not trigger for this value (Safe)';
});

function testRuleLogic(field, operator, ruleValue, testValue) {
    const fieldValidation = fieldValidations[field];
    
    if (fieldValidation?.type === 'number') {
        testValue = parseFloat(testValue);
        ruleValue = parseFloat(ruleValue);
    }
    
    switch (operator) {
        case 'greater_than':
            return testValue > ruleValue;
        case 'less_than':
            return testValue < ruleValue;
        case 'equals':
            return testValue === ruleValue;
        case 'not_equals':
            return testValue !== ruleValue;
        case 'contains':
            return testValue.includes(ruleValue);
        case 'in_list':
            const list = ruleValue.split(',').map(v => v.trim());
            return list.includes(testValue);
        case 'regex':
            try {
                const regex = new RegExp(ruleValue);
                return regex.test(testValue);
            } catch (e) {
                return false;
            }
        // Add other operators as needed
    }
    return false;
} 