// Dashboard logic
document.addEventListener('DOMContentLoaded', function() {
    const loggedInTeacher = localStorage.getItem('loggedInTeacher');
    if (!loggedInTeacher) {
        window.location.href = 'index.html';
        return;
    }

    const teacher = JSON.parse(loggedInTeacher);
    document.querySelector('h1').textContent = `Welcome, ${teacher.name}!`;

    // Subject selection
    document.querySelectorAll('.subject-card').forEach(card => {
        card.addEventListener('click', function() {
            const subject = this.dataset.subject;
            localStorage.setItem('selectedSubject', subject);
            window.location.href = 'scanner.html';
        });
    });

    // Logout
    document.getElementById('logout').addEventListener('click', function() {
        localStorage.removeItem('loggedInTeacher');
        window.location.href = 'index.html';
    });
});
