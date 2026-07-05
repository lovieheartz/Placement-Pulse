import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CreateAptitudeTest = () => {
  const navigate = useNavigate();
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
        'http://localhost:3001/api/aptitude/generate-test-ai',
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
        'http://localhost:3001/api/aptitude/tests',
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

      const testId = testResponse.data.data._id;

      // Add questions
      await axios.post(
        `http://localhost:3001/api/aptitude/tests/${testId}/questions`,
        { questions },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      alert('Test created successfully!');
      navigate('/admin/aptitude-tests');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Create Aptitude Test</h1>
              <p className="text-gray-600">Create a comprehensive aptitude test with AI or manually</p>
            </div>
            <button
              onClick={() => {
                const path = window.location.pathname;
                if (path.includes('/hod/')) {
                  navigate('/hod/aptitude-tests');
                } else {
                  navigate('/admin/aptitude-tests');
                }
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Tests
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
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
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step.num}
                  </div>
                  <span className={`mt-2 text-sm font-medium ${
                    currentStep >= step.num ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < 4 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    currentStep > step.num ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Basic Information</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Title *</label>
                <input
                  type="text"
                  name="title"
                  value={testData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., TCS NQT Mock Test 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={testData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of the test"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Test Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    name="duration"
                    value={testData.duration}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="60"
                  />
                  <p className="text-xs text-gray-500 mt-1">Test will auto-submit after this duration</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pass Percentage</label>
                  <input
                    type="number"
                    name="passPercentage"
                    value={testData.passPercentage}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={testData.schedule.startDate}
                    onChange={(e) => handleNestedChange('schedule', 'startDate', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={testData.schedule.endDate}
                    onChange={(e) => handleNestedChange('schedule', 'endDate', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Instructions</label>
                <textarea
                  name="instructions"
                  value={testData.instructions}
                  onChange={handleInputChange}
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Instructions for students..."
                />
              </div>
            </div>
          )}

          {/* Step 2: Settings */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Test Settings</h2>

              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Marking Scheme</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Marks per Question</label>
                    <input
                      type="number"
                      value={testData.markingScheme.positiveMarks}
                      onChange={(e) => handleNestedChange('markingScheme', 'positiveMarks', parseFloat(e.target.value))}
                      step="0.1"
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Negative Marks</label>
                    <input
                      type="number"
                      value={testData.markingScheme.negativeMarks}
                      onChange={(e) => handleNestedChange('markingScheme', 'negativeMarks', parseFloat(e.target.value))}
                      step="0.1"
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.markingScheme.partialMarking}
                      onChange={() => handleCheckboxChange('markingScheme', 'partialMarking')}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700">Partial Marking</label>
                  </div>
                </div>
              </div>

              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Proctoring Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.requireFullscreen}
                      onChange={() => handleCheckboxChange('settings', 'requireFullscreen')}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700">Require Fullscreen Mode</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.requireCamera}
                      onChange={() => handleCheckboxChange('settings', 'requireCamera')}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700">Require Camera Access</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.detectTabSwitch}
                      onChange={() => handleCheckboxChange('settings', 'detectTabSwitch')}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700">Detect Tab Switching</label>
                  </div>

                  {testData.settings.detectTabSwitch && (
                    <div className="ml-7 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Max Tab Switches (Auto-submit)</label>
                        <input
                          type="number"
                          value={testData.settings.maxTabSwitches}
                          onChange={(e) => handleNestedChange('settings', 'maxTabSwitches', parseInt(e.target.value))}
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  )}

                  {testData.settings.requireCamera && (
                    <div className="ml-7">
                      <label className="block text-sm text-gray-600 mb-1">Snapshot Interval (seconds)</label>
                      <input
                        type="number"
                        value={testData.settings.snapshotInterval}
                        onChange={(e) => handleNestedChange('settings', 'snapshotInterval', parseInt(e.target.value))}
                        min="10"
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Display Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.shuffleQuestions}
                      onChange={() => handleCheckboxChange('settings', 'shuffleQuestions')}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700">Shuffle Questions</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.shuffleOptions}
                      onChange={() => handleCheckboxChange('settings', 'shuffleOptions')}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700">Shuffle Options</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.showQuestionPalette}
                      onChange={() => handleCheckboxChange('settings', 'showQuestionPalette')}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700">Show Question Palette</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.showResultsImmediately}
                      onChange={() => handleCheckboxChange('settings', 'showResultsImmediately')}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700">Show Results Immediately After Test</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testData.settings.allowReview}
                      onChange={() => handleCheckboxChange('settings', 'allowReview')}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700">Allow Answer Review After Submission</label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Recipients */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Select Recipients</h2>
                <p className="text-gray-600 mt-1">Choose who can take this test</p>
              </div>

              {/* Test Schedule Info */}
              {testData.schedule.startDate && testData.schedule.endDate && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Test Schedule:</strong> {new Date(testData.schedule.startDate).toLocaleString()} to {new Date(testData.schedule.endDate).toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Selected recipients will see this test on their dashboard during this window.
                  </p>
                </div>
              )}

              {/* Students Section */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 shadow-sm">
                <h5 className="font-medium mb-3 text-blue-800 flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>Students</span>
                </h5>

                <div className="mb-3">
                  <label className="inline-flex items-center p-2 rounded-md hover:bg-blue-100">
                    <input
                      type="checkbox"
                      checked={recipients.students.all}
                      onChange={(e) => handleRecipientChange('students', 'all', e.target.checked)}
                      className="form-checkbox h-5 w-5 text-blue-600 rounded"
                    />
                    <span className="ml-2 font-medium">All Students</span>
                  </label>
                </div>

                {!recipients.students.all && (
                  <div className="space-y-3">
                    {/* Courses */}
                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-1">Courses</label>
                      <div className="flex flex-wrap gap-1">
                        {courses.map(course => (
                          <label key={course} className="inline-flex items-center bg-white px-2 py-1 rounded-md border border-blue-200 hover:bg-blue-50">
                            <input
                              type="checkbox"
                              checked={recipients.students.courses.includes(course)}
                              onChange={() => handleMultiSelectChange('students', 'courses', course)}
                              className="form-checkbox h-4 w-4 text-blue-600 rounded"
                            />
                            <span className="ml-1 text-sm">{course}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Branches */}
                    {recipients.students.courses.length > 0 && branches.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-blue-800 mb-1">Branches</label>
                        <div className="flex flex-wrap gap-1">
                          {branches.map(branch => (
                            <label key={branch} className="inline-flex items-center bg-white px-2 py-1 rounded-md border border-blue-200 hover:bg-blue-50">
                              <input
                                type="checkbox"
                                checked={recipients.students.branches.includes(branch)}
                                onChange={() => handleMultiSelectChange('students', 'branches', branch)}
                                className="form-checkbox h-4 w-4 text-blue-600 rounded"
                              />
                              <span className="ml-1 text-sm">{branch}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Passout Years */}
                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-1">Passout Years</label>
                      <div className="flex flex-wrap gap-1">
                        {passoutYears.map(year => (
                          <label key={year} className="inline-flex items-center bg-white px-2 py-1 rounded-md border border-blue-200 hover:bg-blue-50">
                            <input
                              type="checkbox"
                              checked={recipients.students.passoutYears.includes(year)}
                              onChange={() => handleMultiSelectChange('students', 'passoutYears', year)}
                              className="form-checkbox h-4 w-4 text-blue-600 rounded"
                            />
                            <span className="ml-1 text-sm">{year}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Faculty Section */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-100 shadow-sm">
                <h5 className="font-medium mb-3 text-green-800 flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Faculty</span>
                </h5>

                <div className="mb-3">
                  <label className="inline-flex items-center p-2 rounded-md hover:bg-green-100">
                    <input
                      type="checkbox"
                      checked={recipients.faculty.all}
                      onChange={(e) => handleRecipientChange('faculty', 'all', e.target.checked)}
                      className="form-checkbox h-5 w-5 text-green-600 rounded"
                    />
                    <span className="ml-2 font-medium">All Faculty</span>
                  </label>
                </div>

                {!recipients.faculty.all && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-green-800 mb-1">Courses</label>
                      <div className="flex flex-wrap gap-1">
                        {courses.map(course => (
                          <label key={course} className="inline-flex items-center bg-white px-2 py-1 rounded-md border border-green-200 hover:bg-green-50">
                            <input
                              type="checkbox"
                              checked={recipients.faculty.courses.includes(course)}
                              onChange={() => handleMultiSelectChange('faculty', 'courses', course)}
                              className="form-checkbox h-4 w-4 text-green-600 rounded"
                            />
                            <span className="ml-1 text-sm">{course}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-green-800 mb-1">Departments</label>
                      <div className="flex flex-wrap gap-1">
                        {departments.map(dept => (
                          <label key={dept} className="inline-flex items-center bg-white px-2 py-1 rounded-md border border-green-200 hover:bg-green-50">
                            <input
                              type="checkbox"
                              checked={recipients.faculty.departments.includes(dept)}
                              onChange={() => handleMultiSelectChange('faculty', 'departments', dept)}
                              className="form-checkbox h-4 w-4 text-green-600 rounded"
                            />
                            <span className="ml-1 text-sm">{dept}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* HODs Section */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-100 shadow-sm">
                <h5 className="font-medium mb-3 text-purple-800 flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>HODs</span>
                </h5>

                <div className="mb-3">
                  <label className="inline-flex items-center p-2 rounded-md hover:bg-purple-100">
                    <input
                      type="checkbox"
                      checked={recipients.hods.all}
                      onChange={(e) => handleRecipientChange('hods', 'all', e.target.checked)}
                      className="form-checkbox h-5 w-5 text-purple-600 rounded"
                    />
                    <span className="ml-2 font-medium">All HODs</span>
                  </label>
                </div>

                {!recipients.hods.all && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-purple-800 mb-1">Courses</label>
                      <div className="flex flex-wrap gap-1">
                        {courses.map(course => (
                          <label key={course} className="inline-flex items-center bg-white px-2 py-1 rounded-md border border-purple-200 hover:bg-purple-50">
                            <input
                              type="checkbox"
                              checked={recipients.hods.courses.includes(course)}
                              onChange={() => handleMultiSelectChange('hods', 'courses', course)}
                              className="form-checkbox h-4 w-4 text-purple-600 rounded"
                            />
                            <span className="ml-1 text-sm">{course}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-800 mb-1">Departments</label>
                      <div className="flex flex-wrap gap-1">
                        {departments.map(dept => (
                          <label key={dept} className="inline-flex items-center bg-white px-2 py-1 rounded-md border border-purple-200 hover:bg-purple-50">
                            <input
                              type="checkbox"
                              checked={recipients.hods.departments.includes(dept)}
                              onChange={() => handleMultiSelectChange('hods', 'departments', dept)}
                              className="form-checkbox h-4 w-4 text-purple-600 rounded"
                            />
                            <span className="ml-1 text-sm">{dept}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Admins Section */}
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-100 shadow-sm">
                <h5 className="font-medium mb-3 text-orange-800 flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Admins</span>
                </h5>

                <div className="mb-3">
                  <label className="inline-flex items-center p-2 rounded-md hover:bg-orange-100">
                    <input
                      type="checkbox"
                      checked={recipients.admins.all}
                      onChange={(e) => handleRecipientChange('admins', 'all', e.target.checked)}
                      className="form-checkbox h-5 w-5 text-orange-600 rounded"
                    />
                    <span className="ml-2 font-medium">All Admins</span>
                  </label>
                </div>
              </div>

              {/* Info Note */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> When the test is published, all selected recipients will receive a notification and the test will appear on their dashboard.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Questions */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Add Questions</h2>
                <button
                  onClick={() => setShowAIModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  Generate with AI
                </button>
              </div>

              {/* Questions Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Total Questions Added</p>
                    <p className="text-3xl font-bold text-blue-700">{questions.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Total Marks</p>
                    <p className="text-3xl font-bold text-blue-700">
                      {questions.reduce((sum, q) => sum + (q.marks || 1), 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Manual Question Form */}
              <div className="border border-gray-300 rounded-lg p-6 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Question Manually</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Question Text *</label>
                    <textarea
                      value={manualQuestion.questionText}
                      onChange={(e) => handleManualQuestionChange('questionText', e.target.value)}
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your question here..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {manualQuestion.options.map((option, index) => (
                      <div key={option.optionLabel}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Option {option.optionLabel} *
                        </label>
                        <input
                          type="text"
                          value={option.optionText}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder={`Enter option ${option.optionLabel}`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer *</label>
                      <select
                        value={manualQuestion.correctAnswer[0]}
                        onChange={(e) => handleManualQuestionChange('correctAnswer', [e.target.value])}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Marks</label>
                      <input
                        type="number"
                        value={manualQuestion.marks}
                        onChange={(e) => handleManualQuestionChange('marks', parseInt(e.target.value))}
                        min="1"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                      <select
                        value={manualQuestion.difficultyLevel}
                        onChange={(e) => handleManualQuestionChange('difficultyLevel', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <input
                        type="text"
                        value={manualQuestion.category}
                        onChange={(e) => handleManualQuestionChange('category', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Aptitude"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Explanation (Optional)</label>
                    <textarea
                      value={manualQuestion.explanation}
                      onChange={(e) => handleManualQuestionChange('explanation', e.target.value)}
                      rows="2"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Explain the correct answer..."
                    />
                  </div>

                  <button
                    onClick={handleAddManualQuestion}
                    className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Add Question
                  </button>
                </div>
              </div>

              {/* Questions List */}
              {questions.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Added Questions ({questions.length})</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {questions.map((q, index) => (
                      <div key={index} className="border border-gray-300 rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">
                              {index + 1}. {q.questionText}
                            </p>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                              {q.options.map((opt) => (
                                <p key={opt.optionLabel} className={`${
                                  q.correctAnswer.includes(opt.optionLabel)
                                    ? 'text-green-600 font-semibold'
                                    : 'text-gray-600'
                                }`}>
                                  {opt.optionLabel}. {opt.optionText}
                                </p>
                              ))}
                            </div>
                            <div className="mt-2 flex gap-4 text-xs text-gray-500">
                              <span>Marks: {q.marks || 1}</span>
                              <span>Difficulty: {q.difficultyLevel}</span>
                              <span>Category: {q.category}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteQuestion(index)}
                            className="ml-4 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
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
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Review & Submit</h2>

              <div className="grid grid-cols-2 gap-6">
                <div className="border border-gray-300 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-3">Test Details</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Title:</span> {testData.title}</p>
                    <p><span className="font-medium">Duration:</span> {testData.duration} minutes (auto-submit)</p>
                    <p><span className="font-medium">Total Questions:</span> {questions.length}</p>
                    <p><span className="font-medium">Total Marks:</span> {questions.reduce((sum, q) => sum + (q.marks || 1), 0)}</p>
                    <p><span className="font-medium">Pass Percentage:</span> {testData.passPercentage}%</p>
                  </div>
                </div>

                <div className="border border-gray-300 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-3">Schedule</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Start:</span> {new Date(testData.schedule.startDate).toLocaleString()}</p>
                    <p><span className="font-medium">End:</span> {new Date(testData.schedule.endDate).toLocaleString()}</p>
                  </div>
                </div>

                <div className="border border-gray-300 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-3">Recipients</h3>
                  <div className="space-y-2 text-sm">
                    {/* Students */}
                    <div>
                      <p className="font-medium text-blue-600 mb-1">Students:</p>
                      {recipients.students.all ? (
                        <p className="text-gray-700 ml-4">All Students</p>
                      ) : (
                        <div className="ml-4 space-y-1">
                          {recipients.students.courses.length > 0 && (
                            <p className="text-gray-700">
                              Courses: {recipients.students.courses.join(', ')}
                            </p>
                          )}
                          {recipients.students.branches.length > 0 && (
                            <p className="text-gray-700">
                              Branches: {recipients.students.branches.join(', ')}
                            </p>
                          )}
                          {recipients.students.passoutYears.length > 0 && (
                            <p className="text-gray-700">
                              Passout Years: {recipients.students.passoutYears.join(', ')}
                            </p>
                          )}
                          {!recipients.students.all &&
                           recipients.students.courses.length === 0 &&
                           recipients.students.branches.length === 0 &&
                           recipients.students.passoutYears.length === 0 && (
                            <p className="text-gray-500 italic">No students selected</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Faculty */}
                    <div>
                      <p className="font-medium text-green-600 mb-1">Faculty:</p>
                      {recipients.faculty.all ? (
                        <p className="text-gray-700 ml-4">All Faculty</p>
                      ) : recipients.faculty.courses.length > 0 || recipients.faculty.departments.length > 0 ? (
                        <div className="ml-4 space-y-1">
                          {recipients.faculty.courses.length > 0 && (
                            <p className="text-gray-700">
                              Courses: {recipients.faculty.courses.join(', ')}
                            </p>
                          )}
                          {recipients.faculty.departments.length > 0 && (
                            <p className="text-gray-700">
                              Departments: {recipients.faculty.departments.join(', ')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic ml-4">No faculty selected</p>
                      )}
                    </div>

                    {/* HODs */}
                    <div>
                      <p className="font-medium text-purple-600 mb-1">HODs:</p>
                      {recipients.hods.all ? (
                        <p className="text-gray-700 ml-4">All HODs</p>
                      ) : recipients.hods.courses.length > 0 || recipients.hods.departments.length > 0 ? (
                        <div className="ml-4 space-y-1">
                          {recipients.hods.courses.length > 0 && (
                            <p className="text-gray-700">
                              Courses: {recipients.hods.courses.join(', ')}
                            </p>
                          )}
                          {recipients.hods.departments.length > 0 && (
                            <p className="text-gray-700">
                              Departments: {recipients.hods.departments.join(', ')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic ml-4">No HODs selected</p>
                      )}
                    </div>

                    {/* Admins */}
                    <div>
                      <p className="font-medium text-orange-600 mb-1">Admins:</p>
                      {recipients.admins.all ? (
                        <p className="text-gray-700 ml-4">All Admins</p>
                      ) : (
                        <p className="text-gray-500 italic ml-4">No admins selected</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border border-gray-300 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-3">Proctoring</h3>
                  <div className="space-y-1 text-sm">
                    <p>{testData.settings.requireFullscreen ? '✓' : '✗'} Fullscreen Required</p>
                    <p>{testData.settings.requireCamera ? '✓' : '✗'} Camera Required</p>
                    <p>{testData.settings.detectTabSwitch ? '✓' : '✗'} Tab Switch Detection</p>
                    {testData.settings.detectTabSwitch && (
                      <p className="text-xs text-red-600">Auto-submit after {testData.settings.maxTabSwitches} tab switches</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border border-gray-300 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Settings</h3>
                <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
                  <p>{testData.settings.shuffleQuestions ? '✓' : '✗'} Shuffle Questions</p>
                  <p>{testData.settings.shuffleOptions ? '✓' : '✗'} Shuffle Options</p>
                  <p>{testData.settings.showResultsImmediately ? '✓' : '✗'} Show Results Immediately</p>
                  <p>{testData.settings.allowReview ? '✓' : '✗'} Allow Review</p>
                  <p>{testData.settings.showQuestionPalette ? '✓' : '✗'} Show Question Palette</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> Once created, the test will be in draft status.
                  You need to publish it to make it available to students.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-6 py-3 rounded-lg font-semibold ${
                currentStep === 1
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              Previous
            </button>

            {currentStep < 5 ? (
              <button
                onClick={nextStep}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmitTest}
                disabled={isSubmitting}
                className={`px-8 py-3 rounded-lg font-semibold ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-blue-600 hover:shadow-lg'
                } text-white`}
              >
                {isSubmitting ? 'Creating...' : 'Create Test'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI Generation Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-xl">
              <h2 className="text-2xl font-bold">Generate Questions with AI</h2>
              <p className="text-purple-100 mt-1">Create test based on company patterns or previous years</p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Generation Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setAiConfig(prev => ({ ...prev, generationType: 'company' }))}
                    className={`py-3 px-4 rounded-lg border-2 font-medium ${
                      aiConfig.generationType === 'company'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    Company Pattern
                  </button>
                  <button
                    onClick={() => setAiConfig(prev => ({ ...prev, generationType: 'previous-year' }))}
                    className={`py-3 px-4 rounded-lg border-2 font-medium ${
                      aiConfig.generationType === 'previous-year'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    Previous Year
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                <input
                  type="text"
                  value={aiConfig.companyName}
                  onChange={(e) => setAiConfig(prev => ({ ...prev, companyName: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., TCS, Infosys, Wipro, Accenture"
                />
              </div>

              {aiConfig.generationType === 'previous-year' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <input
                    type="number"
                    value={aiConfig.year}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                    min="2020"
                    max={new Date().getFullYear()}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Number of Questions *</label>
                  <input
                    type="number"
                    value={aiConfig.numberOfQuestions}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, numberOfQuestions: parseInt(e.target.value) }))}
                    min="1"
                    max="100"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
                  <select
                    value={aiConfig.difficulty}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateWithAI}
                  disabled={isGenerating}
                  className={`px-8 py-3 rounded-lg font-semibold text-white ${
                    isGenerating
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-lg'
                  }`}
                >
                  {isGenerating ? 'Generating...' : 'Generate Questions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateAptitudeTest;
