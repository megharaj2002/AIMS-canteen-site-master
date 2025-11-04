// reset-password.js - Handle password reset functionality
(function(){

const API_BASE = 'http://localhost:5000/api';

// Utility functions
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

function validatePassword(password) {
    // At least 6 characters, contains at least one letter and one number
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/;
    return passwordRegex.test(password);
}

function getPasswordStrength(password) {
    if (password.length === 0) return null;
    
    let score = 0;
    let feedback = [];
    
    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('At least 8 characters');
    
    // Uppercase check
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('One uppercase letter');
    
    // Lowercase check
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('One lowercase letter');
    
    // Number check
    if (/\d/.test(password)) score += 1;
    else feedback.push('One number');
    
    // Special character check
    if (/[@$!%*#?&]/.test(password)) score += 1;
    else feedback.push('One special character');
    
    if (score < 2) {
        return { level: 'weak', message: 'Weak password. Missing: ' + feedback.slice(0, 3).join(', ') };
    } else if (score < 4) {
        return { level: 'medium', message: 'Medium strength. Missing: ' + feedback.slice(0, 2).join(', ') };
    } else {
        return { level: 'strong', message: 'Strong password!' };
    }
}

function showLoading(button) {
    const originalText = button.innerHTML;
    button.innerHTML = '<div class="spinner"></div> Resetting...';
    button.disabled = true;
    return originalText;
}

function hideLoading(button, originalText) {
    button.innerHTML = originalText;
    button.disabled = false;
}

// Main functionality
document.addEventListener('DOMContentLoaded', async () => {
    const tokenStatus = document.getElementById('token-status');
    const form = document.getElementById('reset-password-form');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const passwordStrengthDiv = document.getElementById('password-strength');
    const passwordMatchDiv = document.getElementById('password-match');
    const submitBtn = document.getElementById('submit-btn');
    
    // Get token from URL
    const token = getUrlParameter('token');
    
    if (!token) {
        tokenStatus.className = 'token-status invalid';
        tokenStatus.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Invalid Reset Link</strong><br>
            The reset link is missing or invalid. Please request a new password reset.
        `;
        tokenStatus.style.display = 'block';
        return;
    }
    
    // Verify token
    try {
        const response = await fetch(API_BASE + '/auth/verify-reset-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });
        
        const data = await response.json();
        
        if (response.ok && data.valid) {
            // Token is valid, show form
            form.style.display = 'block';
        } else {
            // Token is invalid or expired
            tokenStatus.className = 'token-status ' + (data.expired ? 'expired' : 'invalid');
            tokenStatus.innerHTML = `
                <i class="fas fa-${data.expired ? 'clock' : 'exclamation-triangle'}"></i>
                <strong>${data.expired ? 'Reset Link Expired' : 'Invalid Reset Link'}</strong><br>
                ${data.message || 'The reset link is invalid or has expired. Please request a new password reset.'}
            `;
            tokenStatus.style.display = 'block';
            return;
        }
    } catch (error) {
        console.error('Token verification error:', error);
        tokenStatus.className = 'token-status invalid';
        tokenStatus.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Verification Failed</strong><br>
            Unable to verify the reset link. Please try again or request a new reset.
        `;
        tokenStatus.style.display = 'block';
        return;
    }
    
    // Password strength indicator
    newPasswordInput.addEventListener('input', () => {
        const password = newPasswordInput.value;
        const strength = getPasswordStrength(password);
        
        if (strength) {
            passwordStrengthDiv.className = `password-strength ${strength.level}`;
            passwordStrengthDiv.textContent = strength.message;
            passwordStrengthDiv.style.display = 'block';
        } else {
            passwordStrengthDiv.style.display = 'none';
        }
        
        // Check password match if confirm password has value
        if (confirmPasswordInput.value) {
            checkPasswordMatch();
        }
    });
    
    // Password match indicator
    function checkPasswordMatch() {
        const password = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (confirmPassword) {
            if (password === confirmPassword) {
                passwordMatchDiv.className = 'password-match success';
                passwordMatchDiv.innerHTML = '<i class="fas fa-check"></i> Passwords match';
                passwordMatchDiv.style.display = 'block';
            } else {
                passwordMatchDiv.className = 'password-match error';
                passwordMatchDiv.innerHTML = '<i class="fas fa-times"></i> Passwords do not match';
                passwordMatchDiv.style.display = 'block';
            }
        } else {
            passwordMatchDiv.style.display = 'none';
        }
    }
    
    confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    
    // Password toggle functionality
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const targetId = toggle.getAttribute('data-target');
            const targetInput = document.getElementById(targetId);
            
            if (targetInput.type === 'password') {
                targetInput.type = 'text';
                toggle.classList.remove('fa-eye');
                toggle.classList.add('fa-eye-slash');
            } else {
                targetInput.type = 'password';
                toggle.classList.remove('fa-eye-slash');
                toggle.classList.add('fa-eye');
            }
        });
    });
    
    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        // Validation
        if (!newPassword || !confirmPassword) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Information',
                text: 'Please fill in both password fields'
            });
            return;
        }
        
        if (newPassword !== confirmPassword) {
            Swal.fire({
                icon: 'warning',
                title: 'Passwords Don\'t Match',
                text: 'Please make sure both passwords are identical'
            });
            confirmPasswordInput.focus();
            return;
        }
        
        if (!validatePassword(newPassword)) {
            Swal.fire({
                icon: 'warning',
                title: 'Invalid Password',
                text: 'Password must be at least 6 characters and contain at least one letter and one number'
            });
            newPasswordInput.focus();
            return;
        }
        
        // Show loading state
        const originalText = showLoading(submitBtn);
        
        try {
            const response = await fetch(API_BASE + '/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token,
                    newPassword
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Success
                Swal.fire({
                    icon: 'success',
                    title: 'Password Reset Successful!',
                    html: `
                        <p>Your password has been successfully reset.</p>
                        <p>You can now log in with your new password.</p>
                    `,
                    confirmButtonColor: '#28a745',
                    confirmButtonText: 'Go to Login'
                }).then(() => {
                    window.location.href = 'index.html';
                });
                
            } else {
                // Error from server
                throw new Error(data.error || 'Failed to reset password');
            }
            
        } catch (error) {
            console.error('Reset password error:', error);
            
            Swal.fire({
                icon: 'error',
                title: 'Reset Failed',
                text: error.message || 'An error occurred while resetting your password. Please try again.',
                confirmButtonColor: '#dc3545'
            });
        } finally {
            // Hide loading state
            hideLoading(submitBtn, originalText);
        }
    });
});

})();