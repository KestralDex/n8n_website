import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { FaPlay, FaStop, FaDownload, FaSignOutAlt, FaQrcode, FaCheckCircle, FaArrowLeft } from 'react-icons/fa';

const Scanner = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState('');
  const [attendance, setAttendance] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);
  const [scannedIds, setScannedIds] = useState(new Set()); // O(1) lookup for duplicates
  const scannerRef = useRef(null);

  useEffect(() => {
    const subject = localStorage.getItem('selectedSubject');
    if (!subject) {
      navigate('/dashboard');
      return;
    }
    setSelectedSubject(subject);
    const storedAttendance = localStorage.getItem(`attendance_${subject}`);
    if (storedAttendance) {
      setAttendance(JSON.parse(storedAttendance));
    }
  }, [navigate]);

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

  const onScanSuccess = (decodedText) => {
    try {
      const studentData = JSON.parse(decodedText);

      // Prevent duplicate scans using Set for O(1) lookup
      if (scannedIds.has(studentData.id)) {
        console.log('Student already scanned:', studentData.name);
        return;
      }

      const now = new Date();
      const time = now.toLocaleTimeString();
      const record = {
        name: studentData.name,
        id: studentData.id,
        time: time,
        subject: selectedSubject,
      };
      const newAttendance = [...attendance, record];
      setAttendance(newAttendance);
      setScannedIds(prev => new Set([...prev, studentData.id])); // Update Set
      setLastScanned(studentData.name);
      setTimeout(() => setLastScanned(null), 3000);
      localStorage.setItem(`attendance_${selectedSubject}`, JSON.stringify(newAttendance));
    } catch {
      console.log('Invalid QR code format');
    }
  };

  const onScanFailure = () => {
    // console.warn(`Code scan error`);
  };

  const exportToCSV = async () => {
    if (attendance.length === 0) {
      alert('No attendance data to export');
      return;
    }

    try {
      const response = await fetch('https://haahah.app.n8n.cloud/webhook-test/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: selectedSubject,
          attendance: attendance,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        alert('Attendance data uploaded successfully!');
      } else {
        alert('Failed to upload attendance data. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading data:', error);
      alert('An error occurred while uploading. Please check your connection.');
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
            <p className="text-dark/70 text-lg">Subject: <span className="font-semibold text-secondary">{selectedSubject}</span></p>
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
                Attendance List ({attendance.length})
              </h2>
              <button
                onClick={exportToCSV}
                disabled={attendance.length === 0}
                className="bg-primary text-accent px-6 py-3 rounded-xl hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg flex items-center space-x-2"
              >
                <FaDownload />
                <span>Export Attendance</span>
              </button>
            </div>
            <div className="overflow-x-auto bg-light rounded-xl shadow-inner">
              <table className="w-full">
                <thead className="bg-dark text-accent">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold">Name</th>
                    <th className="px-6 py-4 text-left font-semibold">Student ID</th>
                    <th className="px-6 py-4 text-left font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="px-6 py-8 text-center text-dark/50">
                        No attendance records yet. Start scanning to add students.
                      </td>
                    </tr>
                  ) : (
                    attendance.map((record, index) => (
                      <tr key={index} className="border-b border-light/50 hover:bg-light/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-dark">{record.name}</td>
                        <td className="px-6 py-4 text-dark/70">{record.id}</td>
                        <td className="px-6 py-4 text-dark/70">{record.time}</td>
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
