// Scanner logic
document.addEventListener('DOMContentLoaded', function() {
    const loggedInTeacher = localStorage.getItem('loggedInTeacher');
    const selectedSubject = localStorage.getItem('selectedSubject');
    if (!loggedInTeacher || !selectedSubject) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('subject-name').textContent = selectedSubject;

    let html5QrCode;
    let attendance = JSON.parse(localStorage.getItem(`attendance_${selectedSubject}`)) || [];

    updateAttendanceTable();

    // Logout
    document.getElementById('logout').addEventListener('click', function() {
        localStorage.removeItem('loggedInTeacher');
        localStorage.removeItem('selectedSubject');
        window.location.href = 'index.html';
    });

    // Start scanning
    document.getElementById('start-scan').addEventListener('click', function() {
        html5QrCode = new Html5Qrcode("qr-reader");
        html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            onScanSuccess,
            onScanFailure
        ).catch(err => {
            console.log(`Unable to start scanning, error: ${err}`);
        });
        this.disabled = true;
        document.getElementById('stop-scan').disabled = false;
    });

    // Stop scanning
    document.getElementById('stop-scan').addEventListener('click', function() {
        if (html5QrCode) {
            html5QrCode.stop().then(ignore => {
                html5QrCode.clear();
            }).catch(err => {
                console.log(`Unable to stop scanning, error: ${err}`);
            });
        }
        document.getElementById('start-scan').disabled = false;
        this.disabled = true;
    });

    // Export attendance
    document.getElementById('export-btn').addEventListener('click', function() {
        exportToCSV(attendance, selectedSubject);
    });

    function onScanSuccess(decodedText, decodedResult) {
        // Assume QR code contains JSON: {"name": "John Doe", "id": "12345"}
        try {
            const studentData = JSON.parse(decodedText);
            const now = new Date();
            const time = now.toLocaleTimeString();
            const record = {
                name: studentData.name,
                id: studentData.id,
                time: time,
                subject: selectedSubject
            };
            attendance.push(record);
            localStorage.setItem(`attendance_${selectedSubject}`, JSON.stringify(attendance));
            updateAttendanceTable();
        } catch (e) {
            console.log('Invalid QR code format');
        }
    }

    function onScanFailure(error) {
        // console.warn(`Code scan error = ${error}`);
    }

    function updateAttendanceTable() {
        const tbody = document.getElementById('attendance-body');
        tbody.innerHTML = '';
        attendance.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.name}</td>
                <td>${record.id}</td>
                <td>${record.time}</td>
            `;
            tbody.appendChild(row);
        });
    }

    function exportToCSV(data, subject) {
        if (data.length === 0) {
            alert('No attendance data to export');
            return;
        }
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Name,Student ID,Time,Subject\n"
            + data.map(row => `${row.name},${row.id},${row.time},${row.subject}`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `attendance_${subject}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
