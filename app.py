from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import json
from datetime import datetime
from rule_engine import RuleEngine

app = Flask(__name__, 
    static_url_path='', 
    static_folder='static',
    template_folder='templates')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///fraud_detection.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
CORS(app)

db = SQLAlchemy(app)

# Database Models
class Transaction(db.Model):
    id = db.Column(db.String(50), primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    amount = db.Column(db.Float, nullable=False)
    payment_mode = db.Column(db.String(50))
    payer_email = db.Column(db.String(120))
    payer_mobile = db.Column(db.String(20))
    transaction_location = db.Column(db.String(50))
    risk_score = db.Column(db.Float)
    is_fraud = db.Column(db.Boolean)
    rule_triggered = db.Column(db.Boolean)
    rule_reason = db.Column(db.String(200))

class FraudReport(db.Model):
    id = db.Column(db.String(50), primary_key=True)
    transaction_id = db.Column(db.String(50))
    reported_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    amount = db.Column(db.Float)
    fraud_type = db.Column(db.String(50))
    description = db.Column(db.Text)
    contact_email = db.Column(db.String(120))
    contact_phone = db.Column(db.String(20))
    status = db.Column(db.String(20), default='pending')

# Create database tables
with app.app_context():
    db.create_all()

# Initialize rule engine
rule_engine = RuleEngine()

# Serve frontend routes
@app.route('/')
@app.route('/index.html')
def serve_dashboard():
    return render_template('index.html')

@app.route('/detect.html')
def serve_detect():
    return render_template('detect.html')

@app.route('/report.html')
def serve_report():
    return render_template('report.html')

@app.route('/rules.html')
def serve_rules():
    return render_template('rules.html')

@app.route('/api/detect-fraud', methods=['POST'])
def detect_fraud():
    try:
        data = request.json
        
        # Rule engine check
        rule_result, rule_reason = rule_engine.evaluate_transaction(data)
        
        # Risk score calculation
        risk_score = calculate_risk_score(data)
        
        # Determine fraud status
        is_fraud = rule_result or risk_score > 0.7
        
        # Save transaction to database
        transaction = Transaction(
            id=generate_transaction_id(),
            amount=float(data.get('transaction_amount')),
            payment_mode=data.get('payment_mode'),
            payer_email=data.get('payer_email'),
            payer_mobile=data.get('payer_mobile'),
            transaction_location=data.get('transaction_location'),
            risk_score=risk_score,
            is_fraud=is_fraud,
            rule_triggered=rule_result,
            rule_reason=rule_reason
        )
        db.session.add(transaction)
        db.session.commit()
        
        return jsonify({
            'is_fraud': is_fraud,
            'ml_probability': risk_score,
            'rule_triggered': rule_result,
            'rule_reason': rule_reason,
            'transaction_id': transaction.id,
            'timestamp': transaction.timestamp.isoformat()
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

def calculate_risk_score(data):
    """Enhanced risk score calculation using multiple factors"""
    risk_score = 0.0
    
    try:
        # Amount-based risk
        amount = float(data.get('transaction_amount', 0))
        if amount > 10000:
            risk_score += 0.3
        elif amount > 5000:
            risk_score += 0.15
        
        # Payment mode risk
        payment_mode = data.get('payment_mode', '').lower()
        high_risk_modes = ['crypto']
        medium_risk_modes = ['wallet', 'international']
        
        if payment_mode in high_risk_modes:
            risk_score += 0.4
        elif payment_mode in medium_risk_modes:
            risk_score += 0.2
            
        # Location risk
        location = data.get('transaction_location', '').lower()
        if location == 'high_risk_country':
            risk_score += 0.4
        elif location == 'unknown':
            risk_score += 0.3
        elif location == 'international':
            risk_score += 0.1
        
        # Time-based risk (if transaction is during unusual hours)
        hour = datetime.now().hour
        if hour < 6 or hour > 23:  # Between 11 PM and 6 AM
            risk_score += 0.2
            
    except Exception as e:
        print(f"Error in risk calculation: {str(e)}")
        return 0.5  # Default medium risk on error
        
    return min(risk_score, 1.0)

@app.route('/api/rules', methods=['GET', 'POST', 'DELETE'])
def manage_rules():
    if request.method == 'GET':
        return jsonify(rule_engine.get_rules())
    
    elif request.method == 'POST':
        try:
            rule_data = request.json
            rule_engine.add_rule(rule_data)
            rule_engine.save_rules()
            return jsonify({'message': 'Rule added successfully'})
        except Exception as e:
            return jsonify({'error': str(e)}), 400
    
    elif request.method == 'DELETE':
        try:
            rule_index = request.args.get('index', type=int)
            rule_engine.delete_rule(rule_index)
            rule_engine.save_rules()
            return jsonify({'message': 'Rule deleted successfully'})
        except Exception as e:
            return jsonify({'error': str(e)}), 400

@app.route('/api/rules/test', methods=['POST'])
def test_rule():
    try:
        data = request.json
        result = rule_engine.test_rule(data['rule'], data['test_value'])
        return jsonify({
            'triggered': result,
            'test_value': data['test_value']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    try:
        # Get query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        status = request.args.get('status')
        
        # Build query
        query = Transaction.query
        
        if start_date:
            query = query.filter(Transaction.timestamp >= start_date)
        if end_date:
            query = query.filter(Transaction.timestamp <= end_date)
        if status:
            query = query.filter(Transaction.is_fraud == (status.lower() == 'fraud'))
            
        transactions = query.order_by(Transaction.timestamp.desc()).limit(100).all()
        
        return jsonify([{
            'id': tx.id,
            'amount': tx.amount,
            'date': tx.timestamp.isoformat(),
            'status': 'Fraud' if tx.is_fraud else 'Safe',
            'riskScore': tx.risk_score,
            'payment_mode': tx.payment_mode
        } for tx in transactions])
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/report-fraud', methods=['POST'])
def report_fraud():
    try:
        data = request.json
        
        report = FraudReport(
            id=f"FR{datetime.now().strftime('%Y%m%d%H%M%S')}",
            transaction_id=data.get('transaction_id'),
            amount=float(data.get('amount')),
            fraud_type=data.get('fraud_type'),
            description=data.get('description'),
            contact_email=data.get('contact_email'),
            contact_phone=data.get('contact_phone')
        )
        
        db.session.add(report)
        db.session.commit()
        
        return jsonify({
            'message': 'Fraud report submitted successfully',
            'report_id': report.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

def generate_transaction_id():
    """Generate unique transaction ID"""
    return f"TX{datetime.now().strftime('%Y%m%d%H%M%S')}"

if __name__ == '__main__':
    app.run(debug=True, port=2000) 