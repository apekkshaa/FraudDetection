document.getElementById('fraudDetectionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch('/api/detect-fraud', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        const resultCard = document.getElementById('resultCard');
        const detectionResult = document.getElementById('detectionResult');
        
        resultCard.classList.remove('d-none');
        
        detectionResult.innerHTML = `
            <div class="alert ${result.is_fraud ? 'alert-danger' : 'alert-success'} mb-3">
                <h4 class="alert-heading">${result.is_fraud ? '⚠️ Fraud Detected!' : '✅ Transaction Safe'}</h4>
                <p>Risk Score: ${(result.ml_probability * 100).toFixed(2)}%</p>
                ${result.rule_reason ? `<p>Rule Triggered: ${result.rule_reason}</p>` : ''}
            </div>
        `;
    } catch (error) {
        console.error('Error:', error);
        alert('Error processing request. Please try again.');
    }
}); 