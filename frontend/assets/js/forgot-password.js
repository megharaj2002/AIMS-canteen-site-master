// forgot-password.js - Handle forgot password functionality
(function(){

const API_BASE = 'http://localhost:5000/api';

// Utility functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showLoading(button) {
    const originalText = button.innerHTML;
    button.innerHTML = '<div class="spinner"></div> Sending...';
    button.disabled = true;
    return originalText;
}

function hideLoading(button, originalText) {
    button.innerHTML = originalText;
    button.disabled = false;
}

// Main functionality
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgot-password-form');
    const emailInput = document.getElementById('forgot-email');
    const submitBtn = document.getElementById('submit-btn');

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        
        // Validation
        if (!email) {
            Swal.fire({
                icon: 'warning',
                title: 'Email Required',
                text: 'Please enter your email address'
            });
            emailInput.focus();
            return;
        }
        
        if (!validateEmail(email)) {
            Swal.fire({
                icon: 'warning',
                title: 'Invalid Email',
                text: 'Please enter a valid email address'
            });
            emailInput.focus();
            return;
        }
        
        // Show loading state
        const originalText = showLoading(submitBtn);
        
        try {
            const response = await fetch(API_BASE + '/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Success
                Swal.fire({
                    icon: 'success',
                    title: 'Reset Link Sent!',
                    html: `
                        <p>A password reset link has been sent to:</p>
                        <strong>${email}</strong>
                        <p>Please check your email and follow the instructions to reset your password.</p>
                        <small style="color: #666;">The link will expire in 30 minutes.</small>
                    `,
                    confirmButtonColor: '#28a745',
                    confirmButtonText: 'Back to Login'
                }).then(() => {
                    window.location.href = 'index.html';
                });
                
                // Clear form
                form.reset();
            } else {
                // Error from server
                throw new Error(data.error || 'Failed to send reset link');
            }
            
        } catch (error) {
            console.error('Forgot password error:', error);
            
            Swal.fire({
                icon: 'error',
                title: 'Failed to Send Reset Link',
                text: error.message || 'An error occurred while sending the reset link. Please try again.',
                confirmButtonColor: '#dc3545'
            });
        } finally {
            // Hide loading state
            hideLoading(submitBtn, originalText);
        }
    });
    
    // Handle email input validation on blur
    emailInput.addEventListener('blur', () => {
        const email = emailInput.value.trim();
        if (email && !validateEmail(email)) {
            emailInput.style.borderColor = '#dc3545';
        } else {
            emailInput.style.borderColor = '#e1e5e9';
        }
    });
    
    // Reset border color on focus
    emailInput.addEventListener('focus', () => {
        emailInput.style.borderColor = '#28a745';
    });
});

})();