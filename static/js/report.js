document.getElementById('fraudReportForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch('/api/report-fraud', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            alert('Fraud report submitted successfully. Our team will investigate.');
            e.target.reset();
        } else {
            throw new Error('Failed to submit report');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error submitting report. Please try again.');
    }
}); 