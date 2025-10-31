// Login logic
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Fetch teachers data
    fetch('teachers.json')
        .then(response => response.json())
        .then(teachers => {
            const teacher = teachers.find(t => t.username === username && t.password === password);
            if (teacher) {
                localStorage.setItem('loggedInTeacher', JSON.stringify(teacher));
                window.location.href = 'dashboard.html';
            } else {
                document.getElementById('error-message').textContent = 'Invalid username or password';
            }
        })
        .catch(error => {
            console.error('Error loading teachers data:', error);
            document.getElementById('error-message').textContent = 'Error loading data';
        });
});
