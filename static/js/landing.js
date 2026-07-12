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
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        clearError(signupForm);
        let isValid = true;

        if (firstName.value.trim() === '') {
            showError(firstName, 'firstNameError', 'First name is required');
            isValid = false;
        }

        if (lastName.value.trim() === '') {
            showError(lastName, 'lastNameError', 'Last name is required');
            isValid = false;
        }

        // Username Regex Validation: Only word characters, min length 3
        const usernameRegex = /^\w{3,}$/;
        if (!usernameRegex.test(signupUserName.value.trim())) {
            showError(signupUserName, 'signupUserNameError', 'Must be at least 3 characters (letters, numbers, underscores only)');
            isValid = false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.value.trim())) {
            showError(email, 'emailError', 'Please enter a valid email address');
            isValid = false;
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
            form.submit();
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

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        clearError(loginForm);

        let isValid = true;

        // Basic frontend empty checks
        if (loginUserName.value.trim() === '') {
            showError(loginUserName, 'loginUserNameError', 'Username is required');
            isValid = false;
        }
        if (loginPassword.value.trim() === '') {
            showError(loginPassword, 'loginPasswordError', 'Password is required');
            isValid = false;
        }

        if(isValid) {
            // Simulated Backend Error: "User not found or incorrect password"
            loginError.textContent = 'Username or password is not correct.';
            loginError.style.color = 'red';
            loginUserName.style.borderBottomColor = 'red';
            loginPassword.style.borderBottomColor = 'red';
        }
    });
});