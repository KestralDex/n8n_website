import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { FaPlay, FaStop, FaDownload, FaSignOutAlt, FaQrcode, FaCheckCircle, FaArrowLeft, FaTrash } from 'react-icons/fa';

const Scanner = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState([]); // All students with their attendance status
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);
  const [scannedIds, setScannedIds] = useState(new Set()); // O(1) lookup for duplicates
  const scannerRef = useRef(null);

  useEffect(() => {
    const subjectData = localStorage.getItem('selectedSubject');
    if (!subjectData) {
      navigate('/dashboard');
      return;
    }
    const subject = JSON.parse(subjectData);
    setSelectedSubject(subject);
    fetchStudentsWithAttendance(subject.id);
  }, [navigate]);

  const fetchStudentsWithAttendance = async (subjectId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/attendance/subject/${subjectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        // Format students with attendance status
        const formattedStudents = data.students.map(student => ({
          _id: student._id,
          name: student.name,
          student_id: student.student_id,
          status: student.status || 'Absent', // Present or Absent
          timestamp: student.timestamp ? new Date(student.timestamp).toLocaleTimeString() : null,
          attendance_id: student.attendance_id,
        }));
        setStudents(formattedStudents);
        // Create set of present student IDs for quick lookup
        const presentIds = formattedStudents
          .filter(s => s.status === 'Present')
          .map(s => s.student_id);
        setScannedIds(new Set(presentIds));
      } else {
        console.error('Failed to fetch students:', data.error);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const startScanning = () => {
    if (scannerRef.current) return;

    scannerRef.current = new Html5Qrcode("qr-reader");
    scannerRef.current.start(
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
    setIsScanning(true);
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current.clear();
      }).catch(err => {
        console.log(`Unable to stop scanning, error: ${err}`);
      });
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const onScanSuccess = async (decodedText) => {
    console.log('QR Code detected:', decodedText);

    try {
      const studentData = JSON.parse(decodedText);
      console.log('Parsed student data:', studentData);

      // Validate required fields
      if (!studentData.name || !studentData.id) {
        console.error('Invalid QR code format: missing name or id');
        setLastScanned('Invalid QR format - needs name and id');
        setTimeout(() => setLastScanned(null), 3000);
        return;
      }

      // Prevent duplicate scans using Set for O(1) lookup
      if (scannedIds.has(studentData.id)) {
        console.log('Student already scanned:', studentData.name);
        setLastScanned(`${studentData.name} already scanned`);
        setTimeout(() => setLastScanned(null), 3000);
        return;
      }

      // Record attendance in database using correct API endpoint
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/attendance/record', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            subject_id: selectedSubject.id,
            student_id: studentData.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Failed to record attendance:', errorData.error);
          setLastScanned('Failed to record attendance');
          setTimeout(() => setLastScanned(null), 3000);
          return;
        }

        const data = await response.json();
        console.log('Attendance recorded:', data);

        const now = new Date();
        const time = now.toLocaleTimeString();
        
        // Update local state - mark student as Present
        setStudents(prevStudents => prevStudents.map(s => 
          s.student_id === studentData.id 
            ? { ...s, status: 'Present', timestamp: time }
            : s
        ));
        setScannedIds(prev => new Set([...prev, studentData.id])); // Update Set
        setLastScanned(`Scanned: ${studentData.name}`);
        setTimeout(() => setLastScanned(null), 3000);
      } catch (error) {
        console.error('Error recording attendance:', error);
        setLastScanned('Error recording attendance');
        setTimeout(() => setLastScanned(null), 3000);
      }
    } catch (parseError) {
      console.error('Invalid QR code format - not valid JSON:', decodedText);
      setLastScanned('Invalid QR format - use JSON: {"name":"Student","id":"123"}');
      setTimeout(() => setLastScanned(null), 5000);
    }
  };

  const onScanFailure = (errorMessage) => {
    // console.warn(`Code scan error: ${errorMessage}`);
  };

  const clearAttendance = async () => {
    if (students.length === 0) {
      alert('No attendance data to clear');
      return;
    }

    const confirmClear = window.confirm(`Are you sure you want to clear all attendance records for ${selectedSubject?.name}? This action cannot be undone.`);

    if (!confirmClear) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/attendance/subject/${selectedSubject.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Reset all students to Absent status
        setStudents(prevStudents => prevStudents.map(s => ({
          ...s,
          status: 'Absent',
          timestamp: null
        })));
        setScannedIds(new Set());
        setLastScanned('Attendance list cleared');
        setTimeout(() => setLastScanned(null), 3000);
        alert('Attendance list cleared successfully!');
      } else {
        const errorData = await response.json();
        console.error('Failed to clear attendance:', errorData.error);
        alert('Failed to clear attendance list. Please try again.');
      }
    } catch (error) {
      console.error('Error clearing attendance:', error);
      alert('An error occurred while clearing attendance.');
    }
  };

  const exportToCSV = async () => {
    if (students.length === 0) {
      alert('No students to export');
      return;
    }

    try {
      const presentCount = students.filter(s => s.status === 'Present').length;
      const absentCount = students.filter(s => s.status === 'Absent').length;

      // Prepare data for n8n webhook with ALL students (present and absent)
      const exportData = {
        // Subject Information Section
        subject_info: {
          name: selectedSubject?.name || 'Unknown Subject',
          id: selectedSubject?.id,
          teacher_username: localStorage.getItem('username'),
          export_timestamp: new Date().toISOString()
        },

        // Attendance Summary
        attendance_summary: {
          total_students: students.length,
          present_count: presentCount,
          absent_count: absentCount,
          subject_name: selectedSubject?.name || 'Unknown Subject'
        },

        // ALL Student Records (Present and Absent)
        all_students: students.map(student => ({
          student_name: student.name,
          student_id: student.student_id,
          status: student.status,
          timestamp: student.timestamp || null,
          subject: selectedSubject?.name || 'Unknown Subject',
          scan_time: student.timestamp || null,
          subject_id: selectedSubject?.id
        })),

        // Present Students Only
        present_students: students
          .filter(s => s.status === 'Present')
          .map(student => ({
            student_name: student.name,
            student_id: student.student_id,
            status: student.status,
            timestamp: student.timestamp || null,
            subject: selectedSubject?.name || 'Unknown Subject',
            scan_time: student.timestamp || null,
            subject_id: selectedSubject?.id
          })),

        // Absent Students Only
        absent_students: students
          .filter(s => s.status === 'Absent')
          .map(student => ({
            student_name: student.name,
            student_id: student.student_id,
            status: student.status,
            subject: selectedSubject?.name || 'Unknown Subject',
            subject_id: selectedSubject?.id
          })),

        // Legacy fields for backward compatibility
        subject: selectedSubject?.name || 'Unknown Subject',
        subject_id: selectedSubject?.id,
        teacher_username: localStorage.getItem('username'),
        attendance_count: presentCount,
        attendance: students
          .filter(s => s.status === 'Present')
          .map(student => ({
            student_name: student.name,
            student_id: student.student_id,
            timestamp: new Date().toISOString(),
            subject: selectedSubject?.name || 'Unknown Subject',
            scan_time: student.timestamp || null
          })),
        export_timestamp: new Date().toISOString(),
        total_students: students.length
      };

      console.log('Exporting data to n8n:', exportData);

      // Use the specific n8n webhook URL provided - n8n is the priority
      const n8nUrl = 'https://haahah.app.n8n.cloud/webhook-test/7ac861e5-a687-48e9-b76b-e18a47e51bae';

      try {
        console.log('Exporting to n8n:', n8nUrl);
        const response = await fetch(n8nUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(exportData),
        });

        console.log('n8n response status:', response.status);

        if (response.ok) {
          const responseData = await response.json();
          console.log('n8n response data:', responseData);
          alert(`Attendance data exported successfully to n8n!\nPresent: ${presentCount}\nAbsent: ${absentCount}`);
        } else {
          const errorText = await response.text();
          console.error('n8n error response:', errorText);
          alert(`Failed to export attendance data to n8n. Status: ${response.status}. Please check your n8n workflow and try again.`);
        }
      } catch (error) {
        console.error('Error exporting to n8n:', error);
        alert('Failed to connect to n8n. Please check your internet connection and n8n workflow configuration.');
      }

    } catch (error) {
      console.error('Error exporting data:', error);
      alert('An error occurred while exporting. Please check your connection.');
    }
  };

  return (
    <div className="min-h-screen from-blue-50 to-indigo-100">
      <header className="bg-chalkboard text-accent p-6 shadow-lg">
        <nav className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-accent hover:text-light transition-colors"
            >
              <FaArrowLeft className="text-xl" />
            </button>
            <div className="text-xl font-bold">EduApp</div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-error hover:bg-error/80 text-accent px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl"
          >
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </nav>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="bg-accent p-8 rounded-2xl shadow-2xl max-w-6xl mx-auto animate-slide-up backdrop-blur-sm bg-opacity-95">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
              <FaQrcode className="text-accent text-2xl" />
            </div>
            <h1 className="text-3xl font-bold text-primary mb-2">Attendance Scanner</h1>
            <p className="text-dark/70 text-lg">Subject: <span className="font-semibold text-secondary">{selectedSubject?.name}</span></p>
          </div>

          <div className="mb-8">
            <div id="qr-reader" className="max-w-md mx-auto mb-6 border-4 border-light rounded-2xl overflow-hidden shadow-lg bg-white"></div>
            <div className="flex justify-center space-x-4">
              <button
                onClick={startScanning}
                disabled={isScanning}
                className="bg-secondary text-accent px-6 py-3 rounded-xl hover:bg-secondary/90 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg flex items-center space-x-2"
              >
                <FaPlay />
                <span>Start Scanning</span>
              </button>
              <button
                onClick={stopScanning}
                disabled={!isScanning}
                className="bg-error text-accent px-6 py-3 rounded-xl hover:bg-error/90 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg flex items-center space-x-2"
              >
                <FaStop />
                <span>Stop Scanning</span>
              </button>
            </div>
            {lastScanned && (
              <div className="mt-4 text-center animate-slide-up">
                <div className="inline-flex items-center space-x-2 bg-success/10 text-success px-4 py-2 rounded-lg border border-success/20">
                  <FaCheckCircle />
                  <span className="font-medium">Scanned: {lastScanned}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-primary flex items-center">
                <FaCheckCircle className="mr-2 text-success" />
                Student List ({students.length})
              </h2>
              <div className="flex space-x-3">
                <button
                  onClick={clearAttendance}
                  disabled={students.length === 0}
                  className="bg-error text-accent px-6 py-3 rounded-xl hover:bg-error/90 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg flex items-center space-x-2"
                >
                  <FaTrash />
                  <span>Clear Attendance</span>
                </button>
                <button
                  onClick={exportToCSV}
                  disabled={students.length === 0}
                  className="bg-primary text-accent px-6 py-3 rounded-xl hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg flex items-center space-x-2"
                >
                  <FaDownload />
                  <span>Export Attendance</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto bg-light rounded-xl shadow-inner">
              <table className="w-full">
                <thead className="bg-dark text-accent">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold">Name</th>
                    <th className="px-6 py-4 text-left font-semibold">Student ID</th>
                    <th className="px-6 py-4 text-left font-semibold">Status</th>
                    <th className="px-6 py-4 text-left font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-dark/50">
                        No students found. Please add students to this subject's year.
                      </td>
                    </tr>
                  ) : (
                    students.map((student, index) => (
                      <tr key={index} className="border-b border-light/50 hover:bg-light/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-dark">{student.name}</td>
                        <td className="px-6 py-4 text-dark/70">{student.student_id}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            student.status === 'Present' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {student.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-dark/70">{student.timestamp || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Scanner;
