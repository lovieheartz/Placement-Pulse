import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../lib/api';
import LiquidGlass from '../components/ui/LiquidGlass';

const EditAptitudeTest = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const basePath = useMemo(() => {
    if (location.pathname.startsWith('/hod')) return '/hod';
    if (location.pathname.startsWith('/faculty')) return '/faculty';
    return '/admin';
  }, [location.pathname]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Test basic data
  const [testData, setTestData] = useState({
    title: '',
    description: '',
    duration: 60,
    passPercentage: 40,
    markingScheme: {
      positiveMarks: 1,
      negativeMarks: 0,
      partialMarking: false
    },
    settings: {
      shuffleQuestions: true,
      shuffleOptions: true,
      showResultsImmediately: false,
      allowReview: true,
      requireFullscreen: true,
      requireCamera: true,
      detectTabSwitch: true,
      maxTabSwitches: 3,
      snapshotInterval: 30,
      showQuestionPalette: true
    },
    schedule: {
      startDate: '',
      endDate: ''
    },
    instructions: ''
  });

  // Questions state
  const [questions, setQuestions] = useState([]);

  // Recipients state
  const [recipients, setRecipients] = useState({
    students: {
      all: false,
      courses: [],
      branches: [],
      passoutYears: []
    },
    faculty: {
      all: false,
      courses: [],
      departments: []
    },
    hods: {
      all: false,
      courses: [],
      departments: []
    },
    admins: {
      all: false
    }
  });

  // Predefined data for filters
  const [courses] = useState(['BTech', 'MTech', 'BCA', 'MCA', 'BBA', 'MBA', 'Diploma']);
  const [allBranches] = useState({
    'BTech': ['CSE', 'CSE(AIML)', 'CSE-DS', 'CSE-IOT', 'BME', 'IT', 'CSBS', 'CE', 'EE', 'ME', 'ECE'],
    'MTech': ['CSE', 'CI', 'ECE&PS'],
    'Diploma': ['EE', 'EEEVT', 'CE', 'CSE'],
    'BCA': ['BCA'],
    'MCA': ['MCA'],
    'BBA': ['BBA'],
    'MBA': ['MBA']
  });
  const [branches, setBranches] = useState([]);
  const [passoutYears] = useState([2025, 2026, 2027, 2028, 2029, 2030]);
  const [departments] = useState(['Computer Science', 'Electrical', 'Mechanical', 'Civil', 'Electronics']);

  // Fetch test data on mount
  useEffect(() => {
    fetchTestData();
  }, [id]);

  const fetchTestData = async () => {
    setIsLoading(true);
    try {
      const token = sessionStorage.getItem('authToken');

      // Fetch test details
      const testResponse = await axios.get(
        `${API_BASE}/api/aptitude/tests/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const test = testResponse.data.data;

      // Set test data
      setTestData({
        title: test.title,
        description: test.description || '',
        duration: test.duration,
        passPercentage: test.passPercentage,
        markingScheme: test.markingScheme,
        settings: test.settings,
        schedule: {
          startDate: test.schedule.startDate ? new Date(test.schedule.startDate).toISOString().slice(0, 16) : '',
          endDate: test.schedule.endDate ? new Date(test.schedule.endDate).toISOString().slice(0, 16) : ''
        },
        instructions: test.instructions || ''
      });

      // Set recipients
      if (test.recipients) {
        setRecipients(test.recipients);

        // Update branches based on selected courses
        if (test.recipients.students.courses && test.recipients.students.courses.length > 0) {
          const availableBranches = [];
          test.recipients.students.courses.forEach(course => {
            if (allBranches[course]) {
              allBranches[course].forEach(branch => {
                if (!availableBranches.includes(branch)) {
                  availableBranches.push(branch);
                }
              });
            }
          });
          setBranches(availableBranches);
        }
      }

      // Fetch questions
      const questionsResponse = await axios.get(
        `${API_BASE}/api/aptitude/tests/${id}/questions`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setQuestions(questionsResponse.data.data || []);

    } catch (error) {
      console.error('Error fetching test data:', error);
      alert('Failed to load test: ' + (error.response?.data?.message || error.message));
      navigate(`${basePath}/aptitude-tests`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTestData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNestedChange = (category, field, value) => {
    setTestData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleCheckboxChange = (category, field) => {
    setTestData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: !prev[category][field]
      }
    }));
  };

  // Recipient handler functions
  const handleRecipientChange = (category, subcategory, value) => {
    setRecipients(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [subcategory]: value
      }
    }));
  };

  const handleMultiSelectChange = (category, subcategory, value) => {
    const currentValues = recipients[category][subcategory];
    let newValues;

    if (currentValues.includes(value)) {
      newValues = currentValues.filter(item => item !== value);
    } else {
      newValues = [...currentValues, value];
    }

    handleRecipientChange(category, subcategory, newValues);

    // Auto-update branches based on selected courses for students
    if (category === 'students' && subcategory === 'courses') {
      handleRecipientChange('students', 'branches', []);
      if (newValues.length > 0) {
        const availableBranches = [];
        newValues.forEach(course => {
          if (allBranches[course]) {
            allBranches[course].forEach(branch => {
              if (!availableBranches.includes(branch)) {
                availableBranches.push(branch);
              }
            });
          }
        });
        setBranches(availableBranches);
      } else {
        setBranches([]);
      }
    }
  };

  // Submit test update
  const handleSubmitTest = async () => {
    if (!testData.title.trim()) {
      alert('Please enter test title');
      return;
    }

    if (!testData.schedule.startDate || !testData.schedule.endDate) {
      alert('Please set test schedule');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = sessionStorage.getItem('authToken');

      // Update test
      await axios.put(
        `${API_BASE}/api/aptitude/tests/${id}`,
        {
          ...testData,
          totalQuestions: questions.length,
          totalMarks: questions.reduce((sum, q) => sum + (q.marks || 1), 0),
          recipients: recipients
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      alert('Test updated successfully!');
      navigate(`${basePath}/aptitude-tests`);
    } catch (error) {
      console.error('Error updating test:', error);
      alert(error.response?.data?.message || 'Failed to update test');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    // Validate Step 1 before proceeding
    if (currentStep === 1) {
      if (!testData.title.trim()) {
        alert('Please enter a test title');
        return;
      }
      if (!testData.schedule.startDate || !testData.schedule.endDate) {
        alert('Please set both start and end dates');
        return;
      }

      const startDate = new Date(testData.schedule.startDate);
      const endDate = new Date(testData.schedule.endDate);

      if (endDate <= startDate) {
        alert('End date must be after start date');
        return;
      }

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        alert('Please enter valid dates');
        return;
      }
    }

    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  if (isLoading) {
    return (
      <div className="relative min-h-screen text-white flex items-center justify-center">
        <div className="pointer-events-none fixed inset-0 -z-10 ds-aurora" />
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(120%_120%_at_50%_-10%,transparent,rgba(5,6,10,0.55))]" />
        <div className="text-center">
          <div className="inline-block w-16 h-16 rounded-full border-2 border-white/20 border-b-sky-300 animate-spin"></div>
          <p className="mt-4 text-white/70 font-medium">Loading test data...</p>
        </div>
      </div>
    );
  }

  const inputClass = "w-full rounded-xl bg-white/5 px-3 py-2.5 text-white placeholder-white/40 ring-1 ring-white/15 outline-none backdrop-blur-md focus:ring-2 focus:ring-sky-400/60";

  return (
    <div className="relative min-h-screen text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 ds-aurora" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(120%_120%_at_50%_-10%,transparent,rgba(5,6,10,0.55))]" />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <LiquidGlass strong className="rounded-3xl p-6 sm:p-8 mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Edit Aptitude Test</h1>
          <p className="text-white/70">Update test details and configuration</p>
        </LiquidGlass>

        {/* Progress Steps */}
        <LiquidGlass className="rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            {[
              { num: 1, title: 'Basic Info' },
              { num: 2, title: 'Settings' },
              { num: 3, title: 'Recipients' },
              { num: 4, title: 'Review' }
            ].map((step, index) => (
              <React.Fragment key={step.num}>
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                    currentStep >= step.num
                      ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white'
                      : 'bg-white/5 text-white/60 ring-1 ring-white/10'
                  }`}>
                    {step.num}
                  </div>
                  <span className={`mt-2 text-sm font-medium ${
                    currentStep >= step.num ? 'text-sky-300' : 'text-white/55'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < 3 && (
                  <div className={`flex-1 h-1 mx-2 rounded-full ${
                    currentStep > step.num ? 'bg-gradient-to-r from-sky-500 to-indigo-500' : 'bg-white/10'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </LiquidGlass>

        {/* Step Content */}
        <LiquidGlass className="rounded-2xl p-6 sm:p-8">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Basic Information</h2>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Test Title *</label>
                <input
                  type="text"
                  name="title"
                  value={testData.title}
                  onChange={handleInputChange}
                  className={inputClass}
                  placeholder="e.g., TCS NQT Mock Test 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Description</label>
                <textarea
                  name="description"
                  value={testData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className={inputClass}
                  placeholder="Brief description of the test"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Total Test Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    name="duration"
                    value={testData.duration}
                    onChange={handleInputChange}
                    min="1"
                    className={inputClass}
                    placeholder="60"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Pass Percentage</label>
                  <input
                    type="number"
                    name="passPercentage"
                    value={testData.passPercentage}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    className={inputClass}
                    placeholder="40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={testData.schedule.startDate}
                    onChange={(e) => handleNestedChange('schedule', 'startDate', e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">End Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={testData.schedule.endDate}
                    onChange={(e) => handleNestedChange('schedule', 'endDate', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Test Instructions</label>
                <textarea
                  name="instructions"
                  value={testData.instructions}
                  onChange={handleInputChange}
                  rows="4"
                  className={inputClass}
                  placeholder="Instructions for students..."
                />
              </div>
            </div>
          )}

          {/* Step 2: Settings */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Test Settings</h2>

              <div className="border-b border-white/10 pb-4">
                <h3 className="text-lg font-semibold text-white/70 mb-3">Marking Scheme</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Marks per Question</label>
                    <input
                      type="number"
                      value={testData.markingScheme.positiveMarks}
                      onChange={(e) => handleNestedChange('markingScheme', 'positiveMarks', parseFloat(e.target.value))}
                      step="0.1"
                      min="0"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Negative Marks</label>
                    <input
                      type="number"
                      value={testData.markingScheme.negativeMarks}
                      onChange={(e) => handleNestedChange('markingScheme', 'negativeMarks', parseFloat(e.target.value))}
                      step="0.1"
                      min="0"
                      className={inputClass}
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.markingScheme.partialMarking}
                      onChange={() => handleCheckboxChange('markingScheme', 'partialMarking')}
                      className="w-5 h-5 text-sky-500 rounded focus:ring-sky-400"
                    />
                    <label className="ml-2 text-sm font-medium text-white/70">Partial Marking</label>
                  </div>
                </div>
              </div>

              <div className="border-b border-white/10 pb-4">
                <h3 className="text-lg font-semibold text-white/70 mb-3">Proctoring Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.requireFullscreen}
                      onChange={() => handleCheckboxChange('settings', 'requireFullscreen')}
                      className="w-5 h-5 text-sky-500 rounded focus:ring-sky-400"
                    />
                    <label className="ml-2 text-sm font-medium text-white/70">Require Fullscreen Mode</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.requireCamera}
                      onChange={() => handleCheckboxChange('settings', 'requireCamera')}
                      className="w-5 h-5 text-sky-500 rounded focus:ring-sky-400"
                    />
                    <label className="ml-2 text-sm font-medium text-white/70">Require Camera Access</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.detectTabSwitch}
                      onChange={() => handleCheckboxChange('settings', 'detectTabSwitch')}
                      className="w-5 h-5 text-sky-500 rounded focus:ring-sky-400"
                    />
                    <label className="ml-2 text-sm font-medium text-white/70">Detect Tab Switching</label>
                  </div>

                  {testData.settings.detectTabSwitch && (
                    <div className="ml-7">
                      <label className="block text-sm text-white/55 mb-1">Max Tab Switches (Auto-submit)</label>
                      <input
                        type="number"
                        value={testData.settings.maxTabSwitches}
                        onChange={(e) => handleNestedChange('settings', 'maxTabSwitches', parseInt(e.target.value))}
                        min="1"
                        className="w-32 rounded-xl bg-white/5 px-3 py-2 text-white placeholder-white/40 ring-1 ring-white/15 outline-none backdrop-blur-md focus:ring-2 focus:ring-sky-400/60"
                      />
                    </div>
                  )}

                  {testData.settings.requireCamera && (
                    <div className="ml-7">
                      <label className="block text-sm text-white/55 mb-1">Snapshot Interval (seconds)</label>
                      <input
                        type="number"
                        value={testData.settings.snapshotInterval}
                        onChange={(e) => handleNestedChange('settings', 'snapshotInterval', parseInt(e.target.value))}
                        min="10"
                        className="w-32 rounded-xl bg-white/5 px-3 py-2 text-white placeholder-white/40 ring-1 ring-white/15 outline-none backdrop-blur-md focus:ring-2 focus:ring-sky-400/60"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white/70 mb-3">Display Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.shuffleQuestions}
                      onChange={() => handleCheckboxChange('settings', 'shuffleQuestions')}
                      className="w-5 h-5 text-sky-500 rounded focus:ring-sky-400"
                    />
                    <label className="ml-2 text-sm font-medium text-white/70">Shuffle Questions</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.shuffleOptions}
                      onChange={() => handleCheckboxChange('settings', 'shuffleOptions')}
                      className="w-5 h-5 text-sky-500 rounded focus:ring-sky-400"
                    />
                    <label className="ml-2 text-sm font-medium text-white/70">Shuffle Options</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.showQuestionPalette}
                      onChange={() => handleCheckboxChange('settings', 'showQuestionPalette')}
                      className="w-5 h-5 text-sky-500 rounded focus:ring-sky-400"
                    />
                    <label className="ml-2 text-sm font-medium text-white/70">Show Question Palette</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.showResultsImmediately}
                      onChange={() => handleCheckboxChange('settings', 'showResultsImmediately')}
                      className="w-5 h-5 text-sky-500 rounded focus:ring-sky-400"
                    />
                    <label className="ml-2 text-sm font-medium text-white/70">Show Results Immediately After Test</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.allowReview}
                      onChange={() => handleCheckboxChange('settings', 'allowReview')}
                      className="w-5 h-5 text-sky-500 rounded focus:ring-sky-400"
                    />
                    <label className="ml-2 text-sm font-medium text-white/70">Allow Answer Review After Submission</label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Recipients */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-white">Select Recipients</h2>
                <p className="text-white/70 mt-1">Choose who can take this test</p>
              </div>

              {/* Students Section */}
              <div className="bg-sky-500/15 rounded-lg p-4 ring-1 ring-sky-300/25">
                <h5 className="font-medium mb-3 text-sky-200 flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>Students</span>
                </h5>

                <div className="mb-3">
                  <label className="inline-flex items-center p-2 rounded-md hover:bg-white/5">
                    <input
                      type="checkbox"
                      checked={recipients.students.all}
                      onChange={(e) => handleRecipientChange('students', 'all', e.target.checked)}
                      className="form-checkbox h-5 w-5 text-sky-500 rounded"
                    />
                    <span className="ml-2 font-medium text-white/90">All Students</span>
                  </label>
                </div>

                {!recipients.students.all && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-sky-200 mb-1">Courses</label>
                      <div className="flex flex-wrap gap-1">
                        {courses.map(course => (
                          <label key={course} className="inline-flex items-center bg-white/5 px-2 py-1 rounded-md ring-1 ring-white/15 hover:bg-white/10">
                            <input
                              type="checkbox"
                              checked={recipients.students.courses.includes(course)}
                              onChange={() => handleMultiSelectChange('students', 'courses', course)}
                              className="form-checkbox h-4 w-4 text-sky-500 rounded"
                            />
                            <span className="ml-1 text-sm text-white/90">{course}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {recipients.students.courses.length > 0 && branches.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-sky-200 mb-1">Branches</label>
                        <div className="flex flex-wrap gap-1">
                          {branches.map(branch => (
                            <label key={branch} className="inline-flex items-center bg-white/5 px-2 py-1 rounded-md ring-1 ring-white/15 hover:bg-white/10">
                              <input
                                type="checkbox"
                                checked={recipients.students.branches.includes(branch)}
                                onChange={() => handleMultiSelectChange('students', 'branches', branch)}
                                className="form-checkbox h-4 w-4 text-sky-500 rounded"
                              />
                              <span className="ml-1 text-sm text-white/90">{branch}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-sky-200 mb-1">Passout Years</label>
                      <div className="flex flex-wrap gap-1">
                        {passoutYears.map(year => (
                          <label key={year} className="inline-flex items-center bg-white/5 px-2 py-1 rounded-md ring-1 ring-white/15 hover:bg-white/10">
                            <input
                              type="checkbox"
                              checked={recipients.students.passoutYears.includes(year)}
                              onChange={() => handleMultiSelectChange('students', 'passoutYears', year)}
                              className="form-checkbox h-4 w-4 text-sky-500 rounded"
                            />
                            <span className="ml-1 text-sm text-white/90">{year}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Faculty Section */}
              <div className="bg-emerald-500/15 rounded-lg p-4 ring-1 ring-emerald-300/25">
                <h5 className="font-medium mb-3 text-emerald-200 flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Faculty</span>
                </h5>

                <div className="mb-3">
                  <label className="inline-flex items-center p-2 rounded-md hover:bg-white/5">
                    <input
                      type="checkbox"
                      checked={recipients.faculty.all}
                      onChange={(e) => handleRecipientChange('faculty', 'all', e.target.checked)}
                      className="form-checkbox h-5 w-5 text-emerald-500 rounded"
                    />
                    <span className="ml-2 font-medium text-white/90">All Faculty</span>
                  </label>
                </div>

                {!recipients.faculty.all && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-emerald-200 mb-1">Courses</label>
                      <div className="flex flex-wrap gap-1">
                        {courses.map(course => (
                          <label key={course} className="inline-flex items-center bg-white/5 px-2 py-1 rounded-md ring-1 ring-white/15 hover:bg-white/10">
                            <input
                              type="checkbox"
                              checked={recipients.faculty.courses.includes(course)}
                              onChange={() => handleMultiSelectChange('faculty', 'courses', course)}
                              className="form-checkbox h-4 w-4 text-emerald-500 rounded"
                            />
                            <span className="ml-1 text-sm text-white/90">{course}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-emerald-200 mb-1">Departments</label>
                      <div className="flex flex-wrap gap-1">
                        {departments.map(dept => (
                          <label key={dept} className="inline-flex items-center bg-white/5 px-2 py-1 rounded-md ring-1 ring-white/15 hover:bg-white/10">
                            <input
                              type="checkbox"
                              checked={recipients.faculty.departments.includes(dept)}
                              onChange={() => handleMultiSelectChange('faculty', 'departments', dept)}
                              className="form-checkbox h-4 w-4 text-emerald-500 rounded"
                            />
                            <span className="ml-1 text-sm text-white/90">{dept}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* HODs Section */}
              <div className="bg-purple-500/15 rounded-lg p-4 ring-1 ring-purple-300/25">
                <h5 className="font-medium mb-3 text-purple-200 flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>HODs</span>
                </h5>

                <div className="mb-3">
                  <label className="inline-flex items-center p-2 rounded-md hover:bg-white/5">
                    <input
                      type="checkbox"
                      checked={recipients.hods.all}
                      onChange={(e) => handleRecipientChange('hods', 'all', e.target.checked)}
                      className="form-checkbox h-5 w-5 text-purple-500 rounded"
                    />
                    <span className="ml-2 font-medium text-white/90">All HODs</span>
                  </label>
                </div>

                {!recipients.hods.all && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-1">Courses</label>
                      <div className="flex flex-wrap gap-1">
                        {courses.map(course => (
                          <label key={course} className="inline-flex items-center bg-white/5 px-2 py-1 rounded-md ring-1 ring-white/15 hover:bg-white/10">
                            <input
                              type="checkbox"
                              checked={recipients.hods.courses.includes(course)}
                              onChange={() => handleMultiSelectChange('hods', 'courses', course)}
                              className="form-checkbox h-4 w-4 text-purple-500 rounded"
                            />
                            <span className="ml-1 text-sm text-white/90">{course}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-1">Departments</label>
                      <div className="flex flex-wrap gap-1">
                        {departments.map(dept => (
                          <label key={dept} className="inline-flex items-center bg-white/5 px-2 py-1 rounded-md ring-1 ring-white/15 hover:bg-white/10">
                            <input
                              type="checkbox"
                              checked={recipients.hods.departments.includes(dept)}
                              onChange={() => handleMultiSelectChange('hods', 'departments', dept)}
                              className="form-checkbox h-4 w-4 text-purple-500 rounded"
                            />
                            <span className="ml-1 text-sm text-white/90">{dept}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Admins Section */}
              <div className="bg-orange-500/15 rounded-lg p-4 ring-1 ring-orange-300/25">
                <h5 className="font-medium mb-3 text-orange-200 flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Admins</span>
                </h5>

                <div className="mb-3">
                  <label className="inline-flex items-center p-2 rounded-md hover:bg-white/5">
                    <input
                      type="checkbox"
                      checked={recipients.admins.all}
                      onChange={(e) => handleRecipientChange('admins', 'all', e.target.checked)}
                      className="form-checkbox h-5 w-5 text-orange-500 rounded"
                    />
                    <span className="ml-2 font-medium text-white/90">All Admins</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Review & Update</h2>

              <div className="grid grid-cols-2 gap-6">
                <div className="ring-1 ring-white/15 rounded-lg p-4 bg-white/5">
                  <h3 className="font-semibold text-white/70 mb-3">Test Details</h3>
                  <div className="space-y-2 text-sm text-white/90">
                    <p><span className="font-medium text-white/70">Title:</span> {testData.title}</p>
                    <p><span className="font-medium text-white/70">Duration:</span> {testData.duration} minutes</p>
                    <p><span className="font-medium text-white/70">Total Questions:</span> {questions.length}</p>
                    <p><span className="font-medium text-white/70">Total Marks:</span> {questions.reduce((sum, q) => sum + (q.marks || 1), 0)}</p>
                    <p><span className="font-medium text-white/70">Pass Percentage:</span> {testData.passPercentage}%</p>
                  </div>
                </div>

                <div className="ring-1 ring-white/15 rounded-lg p-4 bg-white/5">
                  <h3 className="font-semibold text-white/70 mb-3">Schedule</h3>
                  <div className="space-y-2 text-sm text-white/90">
                    <p><span className="font-medium text-white/70">Start:</span> {new Date(testData.schedule.startDate).toLocaleString()}</p>
                    <p><span className="font-medium text-white/70">End:</span> {new Date(testData.schedule.endDate).toLocaleString()}</p>
                  </div>
                </div>

                <div className="ring-1 ring-white/15 rounded-lg p-4 col-span-2 bg-white/5">
                  <h3 className="font-semibold text-white/70 mb-3">Recipients</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="font-medium text-sky-300 mb-1">Students:</p>
                      {recipients.students.all ? (
                        <p className="text-white/90 ml-4">All Students</p>
                      ) : (
                        <div className="ml-4 space-y-1">
                          {recipients.students.courses.length > 0 && (
                            <p className="text-white/90">Courses: {recipients.students.courses.join(', ')}</p>
                          )}
                          {recipients.students.branches.length > 0 && (
                            <p className="text-white/90">Branches: {recipients.students.branches.join(', ')}</p>
                          )}
                          {recipients.students.passoutYears.length > 0 && (
                            <p className="text-white/90">Passout Years: {recipients.students.passoutYears.join(', ')}</p>
                          )}
                          {!recipients.students.all &&
                           recipients.students.courses.length === 0 &&
                           recipients.students.branches.length === 0 &&
                           recipients.students.passoutYears.length === 0 && (
                            <p className="text-white/55 italic">No students selected</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="font-medium text-emerald-300 mb-1">Faculty:</p>
                      {recipients.faculty.all ? (
                        <p className="text-white/90 ml-4">All Faculty</p>
                      ) : recipients.faculty.courses.length > 0 || recipients.faculty.departments.length > 0 ? (
                        <div className="ml-4 space-y-1">
                          {recipients.faculty.courses.length > 0 && (
                            <p className="text-white/90">Courses: {recipients.faculty.courses.join(', ')}</p>
                          )}
                          {recipients.faculty.departments.length > 0 && (
                            <p className="text-white/90">Departments: {recipients.faculty.departments.join(', ')}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-white/55 italic ml-4">No faculty selected</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                currentStep === 1
                  ? 'bg-white/5 text-white/40 ring-1 ring-white/10 cursor-not-allowed'
                  : 'bg-white/5 text-white/90 ring-1 ring-white/15 backdrop-blur-md hover:bg-white/10'
              }`}
            >
              Previous
            </button>

            {currentStep < 4 ? (
              <button
                onClick={nextStep}
                className="ds-shimmer inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(59,99,255,0.6)] ring-1 ring-white/20 transition-all hover:brightness-110 active:scale-[0.98]"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmitTest}
                disabled={isSubmitting}
                className={`ds-shimmer inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/20 transition-all ${
                  isSubmitting
                    ? 'bg-white/10 text-white/60 cursor-not-allowed'
                    : 'bg-gradient-to-r from-sky-500 to-indigo-500 shadow-[0_10px_30px_-8px_rgba(59,99,255,0.6)] hover:brightness-110 active:scale-[0.98]'
                }`}
              >
                {isSubmitting ? 'Updating...' : 'Update Test'}
              </button>
            )}
          </div>
        </LiquidGlass>
      </div>
    </div>
  );
};

export default EditAptitudeTest;
