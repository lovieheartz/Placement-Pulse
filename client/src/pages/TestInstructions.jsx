import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { FiCamera, FiMonitor, FiClock, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { API_BASE } from '../config/api';

const TestInstructions = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [systemCheck, setSystemCheck] = useState({
    camera: false,
    fullscreen: false,
    checking: true
  });

  useEffect(() => {
    fetchTestDetails();
    performSystemCheck();
  }, [testId]);

  const fetchTestDetails = async () => {
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.get(
        `${API_BASE}/api/aptitude/tests/${testId}/preview`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setTest(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching test:', error);
      alert('Failed to load test details');
      navigate('/student/tests');
    } finally {
      setLoading(false);
    }
  };

  const performSystemCheck = async () => {
    // Check camera access
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setSystemCheck(prev => ({ ...prev, camera: true }));
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('Camera access denied:', error);
        setSystemCheck(prev => ({ ...prev, camera: false }));
      }
    }

    // Check fullscreen API availability
    const fullscreenEnabled =
      document.fullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      document.mozFullScreenEnabled ||
      document.msFullscreenEnabled;

    setSystemCheck(prev => ({
      ...prev,
      fullscreen: fullscreenEnabled,
      checking: false
    }));
  };

  const handleStartTest = async () => {
    // Validate system requirements
    if (test?.settings?.requireCamera && !systemCheck.camera) {
      alert('Camera access is required for this test. Please enable camera and refresh the page.');
      return;
    }

    if (test?.settings?.requireFullscreen && !systemCheck.fullscreen) {
      alert('Fullscreen mode is required for this test.');
      return;
    }

    // Request fullscreen if required
    if (test?.settings?.requireFullscreen) {
      try {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          await elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        }
      } catch (error) {
        alert('Please enable fullscreen mode to start the test');
        return;
      }
    }

    // Navigate to test
    navigate(`/student/tests/${testId}/take`);
  };

  if (loading || systemCheck.checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading test instructions...</p>
        </div>
      </div>
    );
  }

  if (!test) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{test.title}</h1>
          <p className="text-gray-600">{test.description}</p>
        </div>

        {/* System Check */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">System Check</h2>
          <div className="space-y-3">
            {test.settings?.requireCamera && (
              <div className="flex items-center gap-3">
                {systemCheck.camera ? (
                  <FiCheckCircle size={24} className="text-green-600" />
                ) : (
                  <FiAlertCircle size={24} className="text-red-600" />
                )}
                <div>
                  <p className={`font-medium ${systemCheck.camera ? 'text-green-700' : 'text-red-700'}`}>
                    Camera Access
                  </p>
                  <p className="text-sm text-gray-600">
                    {systemCheck.camera
                      ? 'Camera is working properly'
                      : 'Camera access is required. Please enable it in your browser settings.'}
                  </p>
                </div>
              </div>
            )}

            {test.settings?.requireFullscreen && (
              <div className="flex items-center gap-3">
                {systemCheck.fullscreen ? (
                  <FiCheckCircle size={24} className="text-green-600" />
                ) : (
                  <FiAlertCircle size={24} className="text-red-600" />
                )}
                <div>
                  <p className={`font-medium ${systemCheck.fullscreen ? 'text-green-700' : 'text-red-700'}`}>
                    Fullscreen Support
                  </p>
                  <p className="text-sm text-gray-600">
                    {systemCheck.fullscreen
                      ? 'Fullscreen mode is supported'
                      : 'Fullscreen mode is not supported on your browser'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Test Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Test Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FiClock size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="text-lg font-semibold text-gray-800">{test.duration} minutes</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FiCheckCircle size={24} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Questions</p>
                <p className="text-lg font-semibold text-gray-800">{test.totalQuestions}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FiCheckCircle size={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Marks</p>
                <p className="text-lg font-semibold text-gray-800">{test.totalMarks}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <FiCheckCircle size={24} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pass Percentage</p>
                <p className="text-lg font-semibold text-gray-800">{test.passPercentage}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Important Instructions</h2>
          <div className="space-y-3 text-gray-700">
            {test.instructions ? (
              <p className="whitespace-pre-wrap">{test.instructions}</p>
            ) : (
              <>
                <p>1. Read all questions carefully before answering.</p>
                <p>2. Once the test is started, the timer will begin and cannot be paused.</p>
                <p>3. You can mark questions for review and come back to them later.</p>
                <p>4. The test will auto-submit when time expires.</p>
                <p>5. Once submitted, you cannot change your answers.</p>
              </>
            )}
          </div>
        </div>

        {/* Proctoring Rules */}
        {(test.settings?.requireCamera || test.settings?.detectTabSwitch || test.settings?.requireFullscreen) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-yellow-800 mb-4 flex items-center gap-2">
              <FiAlertCircle size={24} />
              Proctoring Rules
            </h2>
            <ul className="space-y-2 text-yellow-800">
              {test.settings.requireFullscreen && (
                <li className="flex items-start gap-2">
                  <FiMonitor className="mt-1 flex-shrink-0" />
                  <span>You must keep the test in fullscreen mode throughout.</span>
                </li>
              )}
              {test.settings.requireCamera && (
                <li className="flex items-start gap-2">
                  <FiCamera className="mt-1 flex-shrink-0" />
                  <span>Your camera will capture periodic snapshots during the test.</span>
                </li>
              )}
              {test.settings.detectTabSwitch && (
                <li className="flex items-start gap-2">
                  <FiAlertCircle className="mt-1 flex-shrink-0" />
                  <span>
                    Switching tabs is monitored. The test will auto-submit after {test.settings.maxTabSwitches} tab switches.
                  </span>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Start Button */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/student/tests')}
              className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>

            <button
              onClick={handleStartTest}
              disabled={
                (test.settings?.requireCamera && !systemCheck.camera) ||
                (test.settings?.requireFullscreen && !systemCheck.fullscreen)
              }
              className={`px-8 py-3 font-semibold rounded-lg transition-all duration-200 ${
                (test.settings?.requireCamera && !systemCheck.camera) ||
                (test.settings?.requireFullscreen && !systemCheck.fullscreen)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-blue-600 text-white hover:shadow-lg'
              }`}
            >
              I'm Ready, Start Test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestInstructions;
