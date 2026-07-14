import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../lib/api';
import LiquidGlass from '../components/ui/LiquidGlass';
import DateTimePicker from '../components/ui/date-time-picker';

const CreateAptitudeTest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = useMemo(() => {
    if (location.pathname.startsWith('/hod')) return '/hod';
    if (location.pathname.startsWith('/faculty')) return '/faculty';
    return '/admin';
  }, [location.pathname]);
  const [currentStep, setCurrentStep] = useState(1);
  const [showAIModal, setShowAIModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Test basic data
  const [testData, setTestData] = useState({
    title: '',
    description: '',
    duration: 60, // Total test duration in minutes
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

  // Manual question form
  const [manualQuestion, setManualQuestion] = useState({
    questionText: '',
    options: [
      { optionLabel: 'A', optionText: '' },
      { optionLabel: 'B', optionText: '' },
      { optionLabel: 'C', optionText: '' },
      { optionLabel: 'D', optionText: '' }
    ],
    correctAnswer: ['A'],
    explanation: '',
    marks: 1,
    negativeMarks: 0,
    difficultyLevel: 'medium',
    category: 'General',
    topic: ''
  });

  // AI generation config
  const [aiConfig, setAiConfig] = useState({
    companyName: '',
    numberOfQuestions: 50,
    difficulty: 'medium',
    generationType: 'company',
    year: new Date().getFullYear() - 1,
    topics: [],
    questionTypes: ['aptitude', 'logical', 'verbal']
  });

  // Recipients state (students, faculty, hods, and admins can take aptitude tests)
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

  // AI Generation Handler
  const handleGenerateWithAI = async () => {
    if (!aiConfig.companyName || !aiConfig.numberOfQuestions) {
      alert('Please enter company name and number of questions');
      return;
    }

    setIsGenerating(true);
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.post(
        `${API_BASE}/api/aptitude/generate-test-ai`,
        aiConfig,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setQuestions(response.data.data);
        setShowAIModal(false);
        alert(`Successfully generated ${response.data.data.length} questions!`);
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      alert(error.response?.data?.message || 'Failed to generate questions');
    } finally {
      setIsGenerating(false);
    }
  };

  // Manual Question Handler
  const handleAddManualQuestion = () => {
    if (!manualQuestion.questionText.trim()) {
      alert('Please enter question text');
      return;
    }

    const allOptionsFilled = manualQuestion.options.every(opt => opt.optionText.trim());
    if (!allOptionsFilled) {
      alert('Please fill all 4 options');
      return;
    }

    const newQuestion = {
      ...manualQuestion,
      questionNumber: questions.length + 1
    };

    setQuestions(prev => [...prev, newQuestion]);

    // Reset form
    setManualQuestion({
      questionText: '',
      options: [
        { optionLabel: 'A', optionText: '' },
        { optionLabel: 'B', optionText: '' },
        { optionLabel: 'C', optionText: '' },
        { optionLabel: 'D', optionText: '' }
      ],
      correctAnswer: ['A'],
      explanation: '',
      marks: 1,
      negativeMarks: 0,
      difficultyLevel: 'medium',
      category: 'General',
      topic: ''
    });

    alert('Question added successfully!');
  };

  const handleDeleteQuestion = (index) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleManualQuestionChange = (field, value) => {
    setManualQuestion(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOptionChange = (index, value) => {
    setManualQuestion(prev => ({
      ...prev,
      options: prev.options.map((opt, i) =>
        i === index ? { ...opt, optionText: value } : opt
      )
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

  // Submit test creation
  const handleSubmitTest = async () => {
    if (!testData.title.trim()) {
      alert('Please enter test title');
      return;
    }

    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    if (!testData.schedule.startDate || !testData.schedule.endDate) {
      alert('Please set test schedule');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = sessionStorage.getItem('authToken');

      // Create test with recipients
      const testResponse = await axios.post(
        `${API_BASE}/api/aptitude/tests`,
        {
          ...testData,
          totalQuestions: questions.length,
          totalMarks: questions.reduce((sum, q) => sum + (q.marks || 1), 0),
          recipients: recipients  // Include recipients instead of batches
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // Prisma returns `id`; keep `_id` as a fallback for any legacy response shape.
      const testId = testResponse.data.data.id ?? testResponse.data.data._id;

      // Add questions
      await axios.post(
        `${API_BASE}/api/aptitude/tests/${testId}/questions`,
        { questions },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      alert('Test created successfully!');
      navigate(`${basePath}/aptitude-tests`);
    } catch (error) {
      console.error('Error creating test:', error);
      alert(error.response?.data?.message || 'Failed to create test');
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

      // Validate dates
      const startDate = new Date(testData.schedule.startDate);
      const endDate = new Date(testData.schedule.endDate);
      const now = new Date();

      if (startDate < now) {
        alert('Start date cannot be in the past');
        return;
      }

      if (endDate <= startDate) {
        alert('End date must be after start date');
        return;
      }

      // Check if dates are valid
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        alert('Please enter valid dates');
        return;
      }
    }

    // Validate Step 4 (questions) before going to review
    if (currentStep === 4 && questions.length === 0) {
      alert('Please add at least one question before proceeding to review');
      return;
    }

    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const inputClass = 'w-full rounded-xl bg-white/5 px-3 py-2.5 text-white placeholder-white/40 ring-1 ring-white/15 outline-none backdrop-blur-md focus:ring-2 focus:ring-sky-400/60';

  return (
    <div className="relative min-h-screen text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 ds-aurora" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(120%_120%_at_50%_-10%,transparent,rgba(5,6,10,0.55))]" />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <LiquidGlass strong className="rounded-3xl p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-white via-white to-sky-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent">Create Aptitude Test</h1>
              <p className="mt-1.5 text-sm text-white/60">Create a comprehensive aptitude test with AI or manually</p>
            </div>
            <button
              onClick={() => {
                navigate(`${basePath}/aptitude-tests`);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/90 ring-1 ring-white/15 backdrop-blur-md transition-all hover:bg-white/10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Tests
            </button>
          </div>
        </LiquidGlass>

        {/* Progress Steps */}
        <LiquidGlass className="mt-6 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            {[
              { num: 1, title: 'Basic Info' },
              { num: 2, title: 'Settings' },
              { num: 3, title: 'Recipients' },
              { num: 4, title: 'Questions' },
              { num: 5, title: 'Review' }
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
                    currentStep >= step.num ? 'text-sky-200' : 'text-white/55'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < 4 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${
                    currentStep > step.num ? 'bg-gradient-to-r from-sky-500 to-indigo-500' : 'bg-white/10'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </LiquidGlass>

        {/* Step Content */}
        <LiquidGlass className="mt-6 rounded-2xl p-6 sm:p-8">
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
                  <p className="text-xs text-white/55 mt-1">Test will auto-submit after this duration</p>
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
                  <DateTimePicker
                    value={testData.schedule.startDate}
                    onChange={(v) => {
                      handleNestedChange('schedule', 'startDate', v);
                      // Keep the window valid: clear an end date that now precedes the start.
                      if (v && testData.schedule.endDate && testData.schedule.endDate < v) {
                        handleNestedChange('schedule', 'endDate', '');
                      }
                    }}
                    placeholder="Select start date & time"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">End Date & Time *</label>
                  <DateTimePicker
                    value={testData.schedule.endDate}
                    onChange={(v) => handleNestedChange('schedule', 'endDate', v)}
                    min={testData.schedule.startDate}
                    placeholder="Select end date & time"
                  />
                  {testData.schedule.startDate && testData.schedule.endDate && testData.schedule.endDate <= testData.schedule.startDate && (
                    <p className="mt-1 text-xs text-red-400">End must be after the start time.</p>
                  )}
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
                <h3 className="text-lg font-semibold text-white/80 mb-3">Marking Scheme</h3>
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
                      className="w-5 h-5 accent-sky-500 rounded"
                    />
                    <label className="ml-2 text-sm font-medium text-white/70">Partial Marking</label>
                  </div>
                </div>
              </div>

              <div className="border-b border-white/10 pb-4">
                <h3 className="text-lg font-semibold text-white/80 mb-3">Proctoring Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.requireFullscreen}
                      onChange={() => handleCheckboxChange('settings', 'requireFullscreen')}
                      className="w-5 h-5 accent-sky-500 rounded"
                    />
                    <label className="ml-2 text-sm font-medium text-white/70">Require Fullscreen Mode</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.requireCamera}
                      onChange={() => handleCheckboxChange('settings', 'requireCamera')}
                      className="w-5 h-5 accent-sky-500 rounded"
                    />
                    <label className="ml-2 text-sm font-medium text-white/70">Require Camera Access</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.detectTabSwitch}
                      onChange={() => handleCheckboxChange('settings', 'detectTabSwitch')}
                      className="w-5 h-5 accent-sky-500 rounded"
                    />
                    <label className="ml-2 text-sm font-medium text-white/70">Detect Tab Switching</label>
                  </div>

                  {testData.settings.detectTabSwitch && (
                    <div className="ml-7 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-white/60 mb-1">Max Tab Switches (Auto-submit)</label>
                        <input
                          type="number"
                          value={testData.settings.maxTabSwitches}
                          onChange={(e) => handleNestedChange('settings', 'maxTabSwitches', parseInt(e.target.value))}
                          min="1"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  )}

                  {testData.settings.requireCamera && (
                    <div className="ml-7">
                      <label className="block text-sm text-white/60 mb-1">Snapshot Interval (seconds)</label>
                      <input
                        type="number"
                        value={testData.settings.snapshotInterval}
                        onChange={(e) => handleNestedChange('settings', 'snapshotInterval', parseInt(e.target.value))}
                        min="10"
                        className="w-32 rounded-xl bg-white/5 px-3 py-2.5 text-white placeholder-white/40 ring-1 ring-white/15 outline-none backdrop-blur-md focus:ring-2 focus:ring-sky-400/60"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white/80 mb-3">Display Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.shuffleQuestions}
                      onChange={() => handleCheckboxChange('settings', 'shuffleQuestions')}
                      className="w-5 h-5 accent-sky-500 rounded"
                    />
                    <label className="ml-2 text-sm font-medium text-white/70">Shuffle Questions</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.shuffleOptions}
                      onChange={() => handleCheckboxChange('settings', 'shuffleOptions')}
                      className="w-5 h-5 accent-sky-500 rounded"
                    />
                    <label className="ml-2 text-sm font-medium text-white/70">Shuffle Options</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.showQuestionPalette}
                      onChange={() => handleCheckboxChange('settings', 'showQuestionPalette')}
                      className="w-5 h-5 accent-sky-500 rounded"
                    />
                    <label className="ml-2 text-sm font-medium text-white/70">Show Question Palette</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.showResultsImmediately}
                      onChange={() => handleCheckboxChange('settings', 'showResultsImmediately')}
                      className="w-5 h-5 accent-sky-500 rounded"
                    />
                    <label className="ml-2 text-sm font-medium text-white/70">Show Results Immediately After Test</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.allowReview}
                      onChange={() => handleCheckboxChange('settings', 'allowReview')}
                      className="w-5 h-5 accent-sky-500 rounded"
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
                <p className="text-white/60 mt-1">Choose who can take this test</p>
              </div>

              {/* Test Schedule Info */}
              {testData.schedule.startDate && testData.schedule.endDate && (
                <div className="bg-sky-500/15 ring-1 ring-sky-300/25 rounded-lg p-3">
                  <p className="text-sm text-sky-100">
                    <strong>Test Schedule:</strong> {new Date(testData.schedule.startDate).toLocaleString()} to {new Date(testData.schedule.endDate).toLocaleString()}
                  </p>
                  <p className="text-xs text-sky-200/80 mt-1">
                    Selected recipients will see this test on their dashboard during this window.
                  </p>
                </div>
              )}

              {/* Students Section */}
              <div className="bg-sky-500/10 rounded-lg p-4 ring-1 ring-sky-300/20">
                <h5 className="font-medium mb-3 text-sky-200 flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>Students</span>
                </h5>

                <div className="mb-3">
                  <label className="inline-flex items-center p-2 rounded-md hover:bg-white/10">
                    <input
                      type="checkbox"
                      checked={recipients.students.all}
                      onChange={(e) => handleRecipientChange('students', 'all', e.target.checked)}
                      className="h-5 w-5 accent-sky-500 rounded"
                    />
                    <span className="ml-2 font-medium text-white/80">All Students</span>
                  </label>
                </div>

                {!recipients.students.all && (
                  <div className="space-y-3">
                    {/* Courses */}
                    <div>
                      <label className="block text-sm font-medium text-sky-200 mb-1">Courses</label>
                      <div className="flex flex-wrap gap-1">
                        {courses.map(course => (
                          <label key={course} className="inline-flex items-center bg-white/5 px-2 py-1 rounded-md ring-1 ring-white/15 hover:bg-white/10">
                            <input
                              type="checkbox"
                              checked={recipients.students.courses.includes(course)}
                              onChange={() => handleMultiSelectChange('students', 'courses', course)}
                              className="h-4 w-4 accent-sky-500 rounded"
                            />
                            <span className="ml-1 text-sm text-white/80">{course}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Branches */}
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
                                className="h-4 w-4 accent-sky-500 rounded"
                              />
                              <span className="ml-1 text-sm text-white/80">{branch}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Passout Years */}
                    <div>
                      <label className="block text-sm font-medium text-sky-200 mb-1">Passout Years</label>
                      <div className="flex flex-wrap gap-1">
                        {passoutYears.map(year => (
                          <label key={year} className="inline-flex items-center bg-white/5 px-2 py-1 rounded-md ring-1 ring-white/15 hover:bg-white/10">
                            <input
                              type="checkbox"
                              checked={recipients.students.passoutYears.includes(year)}
                              onChange={() => handleMultiSelectChange('students', 'passoutYears', year)}
                              className="h-4 w-4 accent-sky-500 rounded"
                            />
                            <span className="ml-1 text-sm text-white/80">{year}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Faculty Section */}
              <div className="bg-emerald-500/10 rounded-lg p-4 ring-1 ring-emerald-300/20">
                <h5 className="font-medium mb-3 text-emerald-200 flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Faculty</span>
                </h5>

                <div className="mb-3">
                  <label className="inline-flex items-center p-2 rounded-md hover:bg-white/10">
                    <input
                      type="checkbox"
                      checked={recipients.faculty.all}
                      onChange={(e) => handleRecipientChange('faculty', 'all', e.target.checked)}
                      className="h-5 w-5 accent-emerald-500 rounded"
                    />
                    <span className="ml-2 font-medium text-white/80">All Faculty</span>
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
                              className="h-4 w-4 accent-emerald-500 rounded"
                            />
                            <span className="ml-1 text-sm text-white/80">{course}</span>
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
                              className="h-4 w-4 accent-emerald-500 rounded"
                            />
                            <span className="ml-1 text-sm text-white/80">{dept}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* HODs Section */}
              <div className="bg-fuchsia-500/10 rounded-lg p-4 ring-1 ring-fuchsia-300/20">
                <h5 className="font-medium mb-3 text-fuchsia-200 flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>HODs</span>
                </h5>

                <div className="mb-3">
                  <label className="inline-flex items-center p-2 rounded-md hover:bg-white/10">
                    <input
                      type="checkbox"
                      checked={recipients.hods.all}
                      onChange={(e) => handleRecipientChange('hods', 'all', e.target.checked)}
                      className="h-5 w-5 accent-fuchsia-500 rounded"
                    />
                    <span className="ml-2 font-medium text-white/80">All HODs</span>
                  </label>
                </div>

                {!recipients.hods.all && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-fuchsia-200 mb-1">Courses</label>
                      <div className="flex flex-wrap gap-1">
                        {courses.map(course => (
                          <label key={course} className="inline-flex items-center bg-white/5 px-2 py-1 rounded-md ring-1 ring-white/15 hover:bg-white/10">
                            <input
                              type="checkbox"
                              checked={recipients.hods.courses.includes(course)}
                              onChange={() => handleMultiSelectChange('hods', 'courses', course)}
                              className="h-4 w-4 accent-fuchsia-500 rounded"
                            />
                            <span className="ml-1 text-sm text-white/80">{course}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-fuchsia-200 mb-1">Departments</label>
                      <div className="flex flex-wrap gap-1">
                        {departments.map(dept => (
                          <label key={dept} className="inline-flex items-center bg-white/5 px-2 py-1 rounded-md ring-1 ring-white/15 hover:bg-white/10">
                            <input
                              type="checkbox"
                              checked={recipients.hods.departments.includes(dept)}
                              onChange={() => handleMultiSelectChange('hods', 'departments', dept)}
                              className="h-4 w-4 accent-fuchsia-500 rounded"
                            />
                            <span className="ml-1 text-sm text-white/80">{dept}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Admins Section */}
              <div className="bg-amber-500/10 rounded-lg p-4 ring-1 ring-amber-300/20">
                <h5 className="font-medium mb-3 text-amber-200 flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Admins</span>
                </h5>

                <div className="mb-3">
                  <label className="inline-flex items-center p-2 rounded-md hover:bg-white/10">
                    <input
                      type="checkbox"
                      checked={recipients.admins.all}
                      onChange={(e) => handleRecipientChange('admins', 'all', e.target.checked)}
                      className="h-5 w-5 accent-amber-500 rounded"
                    />
                    <span className="ml-2 font-medium text-white/80">All Admins</span>
                  </label>
                </div>
              </div>

              {/* Info Note */}
              <div className="bg-amber-500/15 ring-1 ring-amber-300/25 rounded-lg p-3 mt-4">
                <p className="text-sm text-amber-100">
                  <strong>Note:</strong> When the test is published, all selected recipients will receive a notification and the test will appear on their dashboard.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Questions */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Add Questions</h2>
                <button
                  onClick={() => setShowAIModal(true)}
                  className="ds-shimmer inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(59,99,255,0.6)] ring-1 ring-white/20 transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  Generate with AI
                </button>
              </div>

              {/* Questions Summary */}
              <div className="bg-sky-500/10 ring-1 ring-sky-300/20 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-sky-200 font-medium">Total Questions Added</p>
                    <p className="text-3xl font-bold text-white">{questions.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-sky-200 font-medium">Total Marks</p>
                    <p className="text-3xl font-bold text-white">
                      {questions.reduce((sum, q) => sum + (q.marks || 1), 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Manual Question Form */}
              <div className="rounded-lg p-6 bg-white/5 ring-1 ring-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Add Question Manually</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Question Text *</label>
                    <textarea
                      value={manualQuestion.questionText}
                      onChange={(e) => handleManualQuestionChange('questionText', e.target.value)}
                      rows="3"
                      className={inputClass}
                      placeholder="Enter your question here..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {manualQuestion.options.map((option, index) => (
                      <div key={option.optionLabel}>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                          Option {option.optionLabel} *
                        </label>
                        <input
                          type="text"
                          value={option.optionText}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          className={inputClass}
                          placeholder={`Enter option ${option.optionLabel}`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">Correct Answer *</label>
                      <select
                        value={manualQuestion.correctAnswer[0]}
                        onChange={(e) => handleManualQuestionChange('correctAnswer', [e.target.value])}
                        className={inputClass}
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">Marks</label>
                      <input
                        type="number"
                        value={manualQuestion.marks}
                        onChange={(e) => handleManualQuestionChange('marks', parseInt(e.target.value))}
                        min="1"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">Difficulty</label>
                      <select
                        value={manualQuestion.difficultyLevel}
                        onChange={(e) => handleManualQuestionChange('difficultyLevel', e.target.value)}
                        className={inputClass}
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">Category</label>
                      <input
                        type="text"
                        value={manualQuestion.category}
                        onChange={(e) => handleManualQuestionChange('category', e.target.value)}
                        className={inputClass}
                        placeholder="e.g., Aptitude"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Explanation (Optional)</label>
                    <textarea
                      value={manualQuestion.explanation}
                      onChange={(e) => handleManualQuestionChange('explanation', e.target.value)}
                      rows="2"
                      className={inputClass}
                      placeholder="Explain the correct answer..."
                    />
                  </div>

                  <button
                    onClick={handleAddManualQuestion}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl ring-1 ring-white/20 transition-colors"
                  >
                    Add Question
                  </button>
                </div>
              </div>

              {/* Questions List */}
              {questions.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Added Questions ({questions.length})</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {questions.map((q, index) => (
                      <div key={index} className="rounded-lg p-4 bg-white/5 ring-1 ring-white/10">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-white">
                              {index + 1}. {q.questionText}
                            </p>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                              {q.options.map((opt) => (
                                <p key={opt.optionLabel} className={`${
                                  q.correctAnswer.includes(opt.optionLabel)
                                    ? 'text-emerald-300 font-semibold'
                                    : 'text-white/70'
                                }`}>
                                  {opt.optionLabel}. {opt.optionText}
                                </p>
                              ))}
                            </div>
                            <div className="mt-2 flex gap-4 text-xs text-white/55">
                              <span>Marks: {q.marks || 1}</span>
                              <span>Difficulty: {q.difficultyLevel}</span>
                              <span>Category: {q.category}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteQuestion(index)}
                            className="ml-4 px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white text-sm rounded-xl ring-1 ring-white/20"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Review & Submit</h2>

              <div className="grid grid-cols-2 gap-6">
                <div className="rounded-lg p-4 bg-white/5 ring-1 ring-white/10">
                  <h3 className="font-semibold text-white/80 mb-3">Test Details</h3>
                  <div className="space-y-2 text-sm text-white/70">
                    <p><span className="font-medium text-white/90">Title:</span> {testData.title}</p>
                    <p><span className="font-medium text-white/90">Duration:</span> {testData.duration} minutes (auto-submit)</p>
                    <p><span className="font-medium text-white/90">Total Questions:</span> {questions.length}</p>
                    <p><span className="font-medium text-white/90">Total Marks:</span> {questions.reduce((sum, q) => sum + (q.marks || 1), 0)}</p>
                    <p><span className="font-medium text-white/90">Pass Percentage:</span> {testData.passPercentage}%</p>
                  </div>
                </div>

                <div className="rounded-lg p-4 bg-white/5 ring-1 ring-white/10">
                  <h3 className="font-semibold text-white/80 mb-3">Schedule</h3>
                  <div className="space-y-2 text-sm text-white/70">
                    <p><span className="font-medium text-white/90">Start:</span> {new Date(testData.schedule.startDate).toLocaleString()}</p>
                    <p><span className="font-medium text-white/90">End:</span> {new Date(testData.schedule.endDate).toLocaleString()}</p>
                  </div>
                </div>

                <div className="rounded-lg p-4 bg-white/5 ring-1 ring-white/10">
                  <h3 className="font-semibold text-white/80 mb-3">Recipients</h3>
                  <div className="space-y-2 text-sm">
                    {/* Students */}
                    <div>
                      <p className="font-medium text-sky-200 mb-1">Students:</p>
                      {recipients.students.all ? (
                        <p className="text-white/70 ml-4">All Students</p>
                      ) : (
                        <div className="ml-4 space-y-1">
                          {recipients.students.courses.length > 0 && (
                            <p className="text-white/70">
                              Courses: {recipients.students.courses.join(', ')}
                            </p>
                          )}
                          {recipients.students.branches.length > 0 && (
                            <p className="text-white/70">
                              Branches: {recipients.students.branches.join(', ')}
                            </p>
                          )}
                          {recipients.students.passoutYears.length > 0 && (
                            <p className="text-white/70">
                              Passout Years: {recipients.students.passoutYears.join(', ')}
                            </p>
                          )}
                          {!recipients.students.all &&
                           recipients.students.courses.length === 0 &&
                           recipients.students.branches.length === 0 &&
                           recipients.students.passoutYears.length === 0 && (
                            <p className="text-white/50 italic">No students selected</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Faculty */}
                    <div>
                      <p className="font-medium text-emerald-200 mb-1">Faculty:</p>
                      {recipients.faculty.all ? (
                        <p className="text-white/70 ml-4">All Faculty</p>
                      ) : recipients.faculty.courses.length > 0 || recipients.faculty.departments.length > 0 ? (
                        <div className="ml-4 space-y-1">
                          {recipients.faculty.courses.length > 0 && (
                            <p className="text-white/70">
                              Courses: {recipients.faculty.courses.join(', ')}
                            </p>
                          )}
                          {recipients.faculty.departments.length > 0 && (
                            <p className="text-white/70">
                              Departments: {recipients.faculty.departments.join(', ')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-white/50 italic ml-4">No faculty selected</p>
                      )}
                    </div>

                    {/* HODs */}
                    <div>
                      <p className="font-medium text-fuchsia-200 mb-1">HODs:</p>
                      {recipients.hods.all ? (
                        <p className="text-white/70 ml-4">All HODs</p>
                      ) : recipients.hods.courses.length > 0 || recipients.hods.departments.length > 0 ? (
                        <div className="ml-4 space-y-1">
                          {recipients.hods.courses.length > 0 && (
                            <p className="text-white/70">
                              Courses: {recipients.hods.courses.join(', ')}
                            </p>
                          )}
                          {recipients.hods.departments.length > 0 && (
                            <p className="text-white/70">
                              Departments: {recipients.hods.departments.join(', ')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-white/50 italic ml-4">No HODs selected</p>
                      )}
                    </div>

                    {/* Admins */}
                    <div>
                      <p className="font-medium text-amber-200 mb-1">Admins:</p>
                      {recipients.admins.all ? (
                        <p className="text-white/70 ml-4">All Admins</p>
                      ) : (
                        <p className="text-white/50 italic ml-4">No admins selected</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg p-4 bg-white/5 ring-1 ring-white/10">
                  <h3 className="font-semibold text-white/80 mb-3">Proctoring</h3>
                  <div className="space-y-1 text-sm text-white/70">
                    <p>{testData.settings.requireFullscreen ? '✓' : '✗'} Fullscreen Required</p>
                    <p>{testData.settings.requireCamera ? '✓' : '✗'} Camera Required</p>
                    <p>{testData.settings.detectTabSwitch ? '✓' : '✗'} Tab Switch Detection</p>
                    {testData.settings.detectTabSwitch && (
                      <p className="text-xs text-rose-300">Auto-submit after {testData.settings.maxTabSwitches} tab switches</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-4 bg-white/5 ring-1 ring-white/10">
                <h3 className="font-semibold text-white/80 mb-3">Settings</h3>
                <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm text-white/70">
                  <p>{testData.settings.shuffleQuestions ? '✓' : '✗'} Shuffle Questions</p>
                  <p>{testData.settings.shuffleOptions ? '✓' : '✗'} Shuffle Options</p>
                  <p>{testData.settings.showResultsImmediately ? '✓' : '✗'} Show Results Immediately</p>
                  <p>{testData.settings.allowReview ? '✓' : '✗'} Allow Review</p>
                  <p>{testData.settings.showQuestionPalette ? '✓' : '✗'} Show Question Palette</p>
                </div>
              </div>

              <div className="bg-amber-500/15 ring-1 ring-amber-300/25 rounded-lg p-4">
                <p className="text-sm text-amber-100">
                  <strong>Important:</strong> Once created, the test will be in draft status.
                  You need to publish it to make it available to students.
                </p>
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

            {currentStep < 5 ? (
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
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all ${
                  isSubmitting
                    ? 'bg-white/10 ring-1 ring-white/10 cursor-not-allowed'
                    : 'ds-shimmer bg-gradient-to-r from-sky-500 to-indigo-500 shadow-[0_10px_30px_-8px_rgba(59,99,255,0.6)] ring-1 ring-white/20 hover:brightness-110 active:scale-[0.98]'
                }`}
              >
                {isSubmitting ? 'Creating...' : 'Create Test'}
              </button>
            )}
          </div>
        </LiquidGlass>
      </div>

      {/* AI Generation Modal */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <LiquidGlass strong className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-3xl">
            <div className="bg-gradient-to-r from-sky-600/80 to-indigo-600/70 text-white p-6 rounded-t-3xl">
              <h2 className="text-2xl font-bold">Generate Questions with AI</h2>
              <p className="text-sky-100 mt-1">Create test based on company patterns or previous years</p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Generation Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setAiConfig(prev => ({ ...prev, generationType: 'company' }))}
                    className={`py-3 px-4 rounded-xl font-medium ring-1 transition-all ${
                      aiConfig.generationType === 'company'
                        ? 'bg-sky-500/15 text-sky-200 ring-sky-300/40'
                        : 'bg-white/5 text-white/70 ring-white/15 hover:bg-white/10'
                    }`}
                  >
                    Company Pattern
                  </button>
                  <button
                    onClick={() => setAiConfig(prev => ({ ...prev, generationType: 'previous-year' }))}
                    className={`py-3 px-4 rounded-xl font-medium ring-1 transition-all ${
                      aiConfig.generationType === 'previous-year'
                        ? 'bg-sky-500/15 text-sky-200 ring-sky-300/40'
                        : 'bg-white/5 text-white/70 ring-white/15 hover:bg-white/10'
                    }`}
                  >
                    Previous Year
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Company Name *</label>
                <input
                  type="text"
                  value={aiConfig.companyName}
                  onChange={(e) => setAiConfig(prev => ({ ...prev, companyName: e.target.value }))}
                  className={inputClass}
                  placeholder="e.g., TCS, Infosys, Wipro, Accenture"
                />
              </div>

              {aiConfig.generationType === 'previous-year' && (
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Year</label>
                  <input
                    type="number"
                    value={aiConfig.year}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                    min="2020"
                    max={new Date().getFullYear()}
                    className={inputClass}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Number of Questions *</label>
                  <input
                    type="number"
                    value={aiConfig.numberOfQuestions}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, numberOfQuestions: parseInt(e.target.value) }))}
                    min="1"
                    max="100"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Difficulty Level</label>
                  <select
                    value={aiConfig.difficulty}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, difficulty: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowAIModal(false)}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/90 ring-1 ring-white/15 backdrop-blur-md transition-all hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateWithAI}
                  disabled={isGenerating}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all ${
                    isGenerating
                      ? 'bg-white/10 ring-1 ring-white/10 cursor-not-allowed'
                      : 'ds-shimmer bg-gradient-to-r from-sky-500 to-indigo-500 shadow-[0_10px_30px_-8px_rgba(59,99,255,0.6)] ring-1 ring-white/20 hover:brightness-110 active:scale-[0.98]'
                  }`}
                >
                  {isGenerating ? 'Generating...' : 'Generate Questions'}
                </button>
              </div>
            </div>
          </LiquidGlass>
        </div>
      )}
    </div>
  );
};

export default CreateAptitudeTest;
