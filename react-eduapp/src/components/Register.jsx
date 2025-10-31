import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaUserPlus, FaArrowLeft } from 'react-icons/fa';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Registration successful! You can now log in.');
        setTimeout(() => navigate('/'), 2000);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-accent p-8 rounded-2xl shadow-2xl max-w-md w-full animate-slide-up backdrop-blur-sm bg-opacity-95">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary rounded-full mb-4">
            <FaUserPlus className="text-accent text-2xl" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">Create Account</h1>
          <p className="text-dark/70">Join our teacher community</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-semibold mb-2 text-dark">Username</label>
            <div className="relative">
              <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark/50" />
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border-2 border-light rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300"
                placeholder="Choose a username"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold mb-2 text-dark">Password</label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark/50" />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border-2 border-light rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300"
                placeholder="Create a password"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold mb-2 text-dark">Confirm Password</label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark/50" />
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border-2 border-light rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300"
                placeholder="Confirm your password"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-secondary text-accent py-3 px-4 rounded-xl hover:bg-secondary/90 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent mr-2"></div>
                Creating Account...
              </div>
            ) : (
              <>
                <FaUserPlus className="inline mr-2" />
                Create Account
              </>
            )}
          </button>
        </form>
        <button
          onClick={() => navigate('/')}
          className="w-full mt-6 bg-primary text-accent py-3 px-4 rounded-xl hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 font-semibold text-lg shadow-lg flex items-center justify-center"
        >
          <FaArrowLeft className="mr-2" />
          Back to Login
        </button>
        {error && (
          <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg animate-slide-up">
            <p className="text-error text-center font-medium">{error}</p>
          </div>
        )}
        {success && (
          <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg animate-slide-up">
            <p className="text-success text-center font-medium">{success}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
