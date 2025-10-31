import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaCalculator, FaFlask, FaBook, FaSignOutAlt, FaUser } from 'react-icons/fa';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSubjectClick = (subject) => {
    localStorage.setItem('selectedSubject', subject);
    navigate('/scanner');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const subjects = [
    { name: 'SAIDS', icon: <FaCalculator />, color: 'bg-blue-500' },
    { name: 'AI', icon: <FaFlask />, color: 'bg-green-500' },
    { name: 'CN', icon: <FaBook />, color: 'bg-purple-500' },
  ];

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
              key={subject.name}
              onClick={() => handleSubjectClick(subject.name)}
              className={`${subject.color} p-8 rounded-2xl shadow-lg cursor-pointer hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 animate-slide-up`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="text-6xl text-accent mb-6 flex justify-center">
                {subject.icon}
              </div>
              <h3 className="text-2xl font-bold text-accent text-center mb-2">{subject.name}</h3>
              <p className="text-accent/80 text-center">Start attendance session</p>
            </div>
          ))}
        </div>
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
