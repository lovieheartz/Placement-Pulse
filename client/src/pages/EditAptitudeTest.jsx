import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const EditAptitudeTest = () => {
  const navigate = useNavigate();
  const { id } = useParams();
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
        `http://localhost:3001/api/aptitude/tests/${id}`,
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
        `http://localhost:3001/api/aptitude/tests/${id}/questions`,
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
      navigate('/admin/aptitude-tests');
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
        `http://localhost:3001/api/aptitude/tests/${id}`,
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
      navigate('/admin/aptitude-tests');
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading test data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Edit Aptitude Test</h1>
          <p className="text-gray-600">Update test details and configuration</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
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
                {index < 3 && (
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
                    <div className="ml-7">
                      <label className="block text-sm text-gray-600 mb-1">Max Tab Switches (Auto-submit)</label>
                      <input
                        type="number"
                        value={testData.settings.maxTabSwitches}
                        onChange={(e) => handleNestedChange('settings', 'maxTabSwitches', parseInt(e.target.value))}
                        min="1"
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
                      />
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
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Review & Update</h2>

              <div className="grid grid-cols-2 gap-6">
                <div className="border border-gray-300 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-3">Test Details</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Title:</span> {testData.title}</p>
                    <p><span className="font-medium">Duration:</span> {testData.duration} minutes</p>
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

                <div className="border border-gray-300 rounded-lg p-4 col-span-2">
                  <h3 className="font-semibold text-gray-700 mb-3">Recipients</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="font-medium text-blue-600 mb-1">Students:</p>
                      {recipients.students.all ? (
                        <p className="text-gray-700 ml-4">All Students</p>
                      ) : (
                        <div className="ml-4 space-y-1">
                          {recipients.students.courses.length > 0 && (
                            <p className="text-gray-700">Courses: {recipients.students.courses.join(', ')}</p>
                          )}
                          {recipients.students.branches.length > 0 && (
                            <p className="text-gray-700">Branches: {recipients.students.branches.join(', ')}</p>
                          )}
                          {recipients.students.passoutYears.length > 0 && (
                            <p className="text-gray-700">Passout Years: {recipients.students.passoutYears.join(', ')}</p>
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

                    <div>
                      <p className="font-medium text-green-600 mb-1">Faculty:</p>
                      {recipients.faculty.all ? (
                        <p className="text-gray-700 ml-4">All Faculty</p>
                      ) : recipients.faculty.courses.length > 0 || recipients.faculty.departments.length > 0 ? (
                        <div className="ml-4 space-y-1">
                          {recipients.faculty.courses.length > 0 && (
                            <p className="text-gray-700">Courses: {recipients.faculty.courses.join(', ')}</p>
                          )}
                          {recipients.faculty.departments.length > 0 && (
                            <p className="text-gray-700">Departments: {recipients.faculty.departments.join(', ')}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic ml-4">No faculty selected</p>
                      )}
                    </div>
                  </div>
                </div>
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

            {currentStep < 4 ? (
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
                {isSubmitting ? 'Updating...' : 'Update Test'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditAptitudeTest;
