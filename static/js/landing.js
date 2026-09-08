document.addEventListener('DOMContentLoaded', () => {
    // ---- 1. SEAMLESS TOGGLE LOGIC ----
    const loginSection = document.getElementById('loginSection');
    const signupSection = document.getElementById('signupSection');
    const showSignupLink = document.getElementById('showSignup');
    const showLoginLink = document.getElementById('showLogin');

    // Make sure login is visible by default, signup is hidden
    signupSection.classList.add('hidden');

    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginSection.classList.add('hidden');
        signupSection.classList.remove('hidden');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        signupSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
    });

    // ---- Helper Functions ----
    function showError(inputElement, errorId, message) {
        const errorSpan = document.getElementById(errorId);
        errorSpan.textContent = message;
        errorSpan.style.display = 'block';
        errorSpan.style.color = 'red';
        inputElement.style.borderBottomColor = 'red';
    }

    function clearError(formElement) {
        const errorspans = formElement.querySelectorAll('.error, .submit-error');
        errorspans.forEach(span => span.textContent = '');
        const inputs = formElement.querySelectorAll('input');
        inputs.forEach(input => input.style.borderBottomColor = '');
    }

    // ---- 2. SIGN-UP VALIDATION & REAL-TIME PASSWORD ----
    const signupForm = document.getElementById('signupForm');
    const firstName = document.getElementById('firstName');
    const lastName = document.getElementById('lastName');
    const signupUserName = document.getElementById('signupUserName');
    const email = document.getElementById('email');
    const signupPassword = document.getElementById('signupPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const signUpError = document.getElementById('signUpError');

    // Password criteria elements
    const passwordCriteriaList = document.getElementById('passwordCriteria');
    const reqLength = document.getElementById('reqLength');
    const reqUpper = document.getElementById('reqUpper');
    const reqLower = document.getElementById('reqLower');
    const reqSpecial = document.getElementById('reqSpecial');

    // Real-time password feedback
    signupPassword.addEventListener('input', () => {
        const val = signupPassword.value;

        // Show the list when they start typing
        if (val.length > 0) {
            passwordCriteriaList.classList.remove('hidden');
        } else {
            passwordCriteriaList.classList.add('hidden');
        }

        // Check Length
        val.length >= 8 ? setValid(reqLength) : setInvalid(reqLength);
        // Check Uppercase
        /[A-Z]/.test(val) ? setValid(reqUpper) : setInvalid(reqUpper);
        // Check Lowercase
        /[a-z]/.test(val) ? setValid(reqLower) : setInvalid(reqLower);
        // Check Special Character
        /[!@#$%^&*(),.?":{}|<>]/.test(val) ? setValid(reqSpecial) : setInvalid(reqSpecial);

        const isStrong = val.length >= 8 && /[A-Z]/.test(val) && /[a-z]/.test(val) && /[!@#$%^&*(),.?":{}|<>]/.test(val);
        if (isStrong) {
            passwordCriteriaList.classList.add('hidden');
        }
    });

    function setValid(element) {
        element.classList.remove('invalid');
        element.classList.add('valid');
    }
    function setInvalid(element) {
        element.classList.remove('valid');
        element.classList.add('invalid');
    }

    // Sign Up Submission
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearError(signupForm);
        let isValid = true;

        const firstnameVal = firstName.value.trim();
        if (firstnameVal === '') {
            showError(firstName, 'firstNameError', 'First name is required');
            isValid = false;
        } else if (/\d/.test(firstnameVal)) {
            showError(firstName, 'firstNameError', 'Cannot be a number');
            isValid = false;
        } else if (firstnameVal < 3) {
            showError(firstName, 'firstNameError', 'Must be at least 3 characters');
            isValid = false;
        }

        const lastnameVal = lastName.value.trim();
        if (lastnameVal === '') {
            showError(lastName, 'lastNameError', 'Last name is required');
            isValid = false;
        } else if (/\d/.test(lastnameVal)) {
            showError(lastName, 'lastNameError', 'Cannot be a number')
            isValid = false;
        } else if (lastnameVal.length < 3) {
            showError(lastName, 'lastNameError', 'Must be at least 3 characters');
            isValid = false;
        }

        // Username Regex Validation: Only word characters, min length 3
        const usernameRegex = /^\w{3,}$/;
        const usernameVal = signupUserName.value.trim();
        if (!usernameRegex.test(usernameVal)) {
            showError(signupUserName, 'signupUserNameError', 'Must be at least 3 characters (letters, numbers, underscores only)');
            isValid = false;
        } else {
            // Check username in DB
            try {
                const res = await fetch(`/api/auth/check-user/?username=${encodeURIComponent(usernameVal)}`);
                const data = await res.json();
                if (data.exists) {
                    showError(signupUserName, 'signupUserNameError', 'Username already exists');
                    isValid = false;
                }
            } catch (err) {
                console.error(err);
            }
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const emailVal = email.value.trim();
        if (!emailRegex.test(emailVal)) {
            showError(email, 'emailError', 'Please enter a valid email address');
            isValid = false;
        } else {
            // Check email in DB
            try {
                const res = await fetch(`/api/auth/check-user/?email=${encodeURIComponent(emailVal)}`);
                const data = await res.json();
                if (data.exists) {
                    showError(email, 'emailError', 'Email address already exists');
                    isValid = false;
                }
            } catch (err) {
                console.error(err);
            }
        }

        // Password Strong Validation
        const val = signupPassword.value;
        const isStrong = val.length >= 8 && /[A-Z]/.test(val) && /[a-z]/.test(val) && /[!@#$%^&*(),.?":{}|<>]/.test(val);

        if (!isStrong) {
            showError(signupPassword, 'signupPasswordError', 'Password does not meet all criteria');
            isValid = false;
        }

        if (confirmPassword.value !== signupPassword.value || confirmPassword.value === '') {
            showError(confirmPassword, 'confirmPasswordError', 'Passwords do not match');
            isValid = false;
        }

        if (isValid) {
            signUpError.textContent = 'Processing...';
            signUpError.style.color = 'green';
            
            try {
                const response = await fetch('/api/auth/register/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: usernameVal,
                        email: emailVal,
                        password: val,
                        first_name: firstnameVal,
                        last_name: lastnameVal,
                        password_confirm: confirmPassword.value
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    if (typeof Auth !== 'undefined' && data.access && data.refresh) {
                        Auth.setTokens(data.access, data.refresh);
                        Auth.setUserInfo({
                            username: usernameVal,
                            first_name: firstnameVal,
                            last_name: lastnameVal
                        });
                        window.location.href = '/dashboard/';
                    } else {
                        signUpError.textContent = 'Account created! Please log in.';
                        signUpError.style.color = 'green';
                        setTimeout(() => {
                            signupSection.classList.add('hidden');
                            loginSection.classList.remove('hidden');
                            loginUserName.value = usernameVal;
                        }, 1500);
                    }
                } else {
                    signUpError.textContent = data.detail || 'An error occurred during registration.';
                    signUpError.style.color = 'red';
                    // Field specific errors
                    if (data.username) showError(signupUserName, 'signupUserNameError', data.username[0]);
                    if (data.email) showError(email, 'emailError', data.email[0]);
                    if (data.password) showError(signupPassword, 'signupPasswordError', data.password[0]);
                }
            } catch (err) {
                console.error(err);
                signUpError.textContent = 'Network error. Please try again.';
                signUpError.style.color = 'red';
            }
        } else {
            signUpError.textContent = 'Please fix the errors above to continue.';
            signUpError.style.color = 'red';
        }
    });

    // ---- 3. LOGIN VALIDATION ----
    const loginForm = document.getElementById('loginForm');
    const loginUserName = document.getElementById('loginUserName');
    const loginPassword = document.getElementById('loginPassword');
    const loginError = document.getElementById('loginError');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearError(loginForm);

        let isValid = true;

        // Basic frontend empty checks
        loginUsernameVal = loginUserName.value.trim();
        if (loginUsernameVal === '') {
            showError(loginUserName, 'loginUserNameError', 'Username is required');
            isValid = false;
        }
        if (loginPassword.value.trim() === '') {
            showError(loginPassword, 'loginPasswordError', 'Password is required');
            isValid = false;
        }

        if(isValid) {
            loginError.textContent = 'Logging in...';
            loginError.style.color = 'green';
            
            try {
                const response = await fetch('/api/auth/login/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: loginUsernameVal,
                        password: loginPassword.value
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    if (typeof Auth !== 'undefined') {
                        Auth.setTokens(data.access, data.refresh);
                        // Fetch profile info for name
                        const profileRes = await fetch('/api/auth/profile/', {
                            headers: { 'Authorization': `Bearer ${data.access}` }
                        });
                        if (profileRes.ok) {
                            const profileData = await profileRes.json();
                            Auth.setUserInfo({
                                username: loginUsernameVal,
                                first_name: profileData.first_name || '',
                                last_name: profileData.last_name || ''
                            });
                        }
                    }
                    window.location.href = '/dashboard/';
                } else {
                    loginError.textContent = data.detail || 'Username or password is not correct.';
                    loginError.style.color = 'red';
                    loginUserName.style.borderBottomColor = 'red';
                    loginPassword.style.borderBottomColor = 'red';
                }
            } catch (err) {
                console.error(err);
                loginError.textContent = 'Network error. Please try again.';
                loginError.style.color = 'red';
            }
        }
    });
});