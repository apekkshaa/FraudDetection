import json
from datetime import datetime

class RuleEngine:
    def __init__(self, rules_file='rules.json'):
        self.rules_file = rules_file
        self.rules = self.load_rules()

    def load_rules(self):
        """Load rules from JSON file"""
        try:
            with open(self.rules_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return []

    def save_rules(self):
        """Save rules to JSON file"""
        with open(self.rules_file, 'w') as f:
            json.dump(self.rules, f, indent=2)

    def add_rule(self, rule):
        """Add new rule with validation"""
        if not self._validate_rule(rule):
            raise ValueError("Invalid rule format")
        
        rule['created_at'] = datetime.now().isoformat()
        self.rules.append(rule)

    def delete_rule(self, index):
        """Delete rule by index"""
        if 0 <= index < len(self.rules):
            self.rules.pop(index)
        else:
            raise IndexError("Rule index out of range")

    def get_rules(self):
        """Get all rules"""
        return self.rules

    def evaluate_transaction(self, transaction):
        """Evaluate transaction against all rules"""
        for rule in self.rules:
            if self._check_rule(rule, transaction):
                return True, rule['reason']
        return False, None

    def test_rule(self, rule, test_value):
        """Test a single rule against a test value"""
        mock_transaction = {rule['field']: test_value}
        return self._check_rule(rule, mock_transaction)

    def _validate_rule(self, rule):
        """Validate rule format"""
        required_fields = ['field', 'operator', 'value', 'reason']
        return all(field in rule for field in required_fields)

    def _check_rule(self, rule, transaction):
        """Check if a transaction triggers a rule"""
        if rule['field'] not in transaction:
            return False

        value = transaction[rule['field']]
        rule_value = rule['value']

        try:
            if rule['operator'] == 'greater_than':
                return float(value) > float(rule_value)
            elif rule['operator'] == 'less_than':
                return float(value) < float(rule_value)
            elif rule['operator'] == 'equals':
                return str(value) == str(rule_value)
            elif rule['operator'] == 'not_equals':
                return str(value) != str(rule_value)
            elif rule['operator'] == 'in_list':
                rule_list = [x.strip() for x in rule_value.split(',')]
                return str(value) in rule_list
            elif rule['operator'] == 'contains':
                return str(rule_value).lower() in str(value).lower()
            elif rule['operator'] == 'regex':
                import re
                return bool(re.match(rule_value, str(value)))
        except Exception:
            return False

        return False 