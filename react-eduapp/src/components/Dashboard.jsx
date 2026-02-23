 import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { FaCalculator, FaFlask, FaBook, FaSignOutAlt, FaUser, FaPlus, FaTrash, FaCalendarAlt } from 'react-icons/fa';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchSubjects();
    fetchYears();
  }, []);

  const fetchYears = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/years', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setYears(data.years);
        if (data.years.length > 0) {
          setSelectedYear(data.years[0].id);
        }
      } else {
        console.error('Failed to fetch years:', data.error);
      }
    } catch (error) {
      console.error('Error fetching years:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/subjects', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setSubjects(data.subjects);
      } else {
        console.error('Failed to fetch subjects:', data.error);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectClick = (subject) => {
    localStorage.setItem('selectedSubject', JSON.stringify(subject));
    navigate('/scanner');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    if (!selectedYear) {
      alert('Please select a year');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newSubjectName.trim(), year_id: selectedYear }),
      });
      const data = await response.json();
      if (response.ok) {
        fetchSubjects();
        setNewSubjectName('');
        setShowAddForm(false);
      } else {
        console.error('Failed to add subject:', data.error);
      }
    } catch (error) {
      console.error('Error adding subject:', error);
    }
  };

  const handleDeleteSubject = async (subjectId, subjectName) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete the subject "${subjectName}"? This will also delete all attendance records for this subject. This action cannot be undone.`);

    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/subjects?id=${subjectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setSubjects(subjects.filter(subject => subject.id !== subjectId));
        alert('Subject and all associated attendance records deleted successfully!');
      } else {
        const errorData = await response.json();
        console.error('Failed to delete subject:', errorData.error);
        alert('Failed to delete subject. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting subject:', error);
      alert('An error occurred while deleting the subject.');
    }
  };

  const getSubjectIcon = (index) => {
    const icons = [<FaCalculator />, <FaFlask />, <FaBook />];
    return icons[index % icons.length];
  };

  const getSubjectColor = (index) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 'bg-yellow-500'];
    return colors[index % colors.length];
  };

  return (
    <div className="min-h-screen from-white-50 to-blue-100">
      <header className="bg-chalkboard text-accent p-6 shadow-lg">
        <nav className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <FaUser className="text-accent text-lg" />
            </div>
            <div>
              <div className="text-xl font-bold">EduApp</div>
              <div className="text-sm text-light/80">Teacher Portal</div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-light">Welcome, {user?.name}!</span>
            <button
              onClick={handleLogout}
              className="bg-error hover:bg-error/80 text-accent px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
          </div>
        </nav>
      </header>
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-dark mb-4 animate-fade-in">Welcome back, {user?.name}!</h1>
          <p className="text-xl text-dark/70">Choose a subject to begin taking attendance</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {subjects.map((subject, index) => (
            <div
              key={subject.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => handleDeleteSubject(subject.id, subject.name)}
                  className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors duration-300 shadow-lg"
                  title="Delete Subject"
                >
                  <FaTrash className="text-sm" />
                </button>
              </div>
              <div
                className={`${getSubjectColor(index)} p-8 rounded-2xl shadow-lg cursor-pointer hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105`}
                onClick={() => handleSubjectClick(subject)}
              >
                <div className="text-6xl text-accent mb-6 flex justify-center">
                  {getSubjectIcon(index)}
                </div>
                <h3 className="text-2xl font-bold text-accent text-center mb-2">{subject.name}</h3>
                <p className="text-accent/80 text-center">Start attendance session</p>
              </div>
            </div>
          ))}
          <div
            onClick={() => setShowAddForm(true)}
            className="bg-gray-500 p-8 rounded-2xl shadow-lg cursor-pointer hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 animate-slide-up border-2 border-dashed border-gray-400 flex flex-col items-center justify-center"
          >
            <FaPlus className="text-6xl text-accent mb-6" />
            <h3 className="text-2xl font-bold text-accent text-center mb-2">Add Subject</h3>
            <p className="text-accent/80 text-center">Create new subject</p>
          </div>
        </div>

        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-accent p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-primary mb-6 text-center">Add New Subject</h2>
              <form onSubmit={handleAddSubject}>
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="Subject name"
                  className="w-full p-3 border border-light rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full p-3 border border-light rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">Select Year</option>
                  {years.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name}
                    </option>
                  ))}
                </select>
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-accent py-3 rounded-lg hover:bg-primary/90 transition-colors font-semibold"
                  >
                    Add Subject
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 bg-gray-500 text-accent py-3 rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center space-x-2 bg-accent/50 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
            <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
            <span className="text-dark font-medium">System Ready</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
