import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiPlus, FiEdit2, FiTrash2, FiBarChart2, FiDownload, FiEye, FiUsers, FiUserPlus, FiX, FiCheck } from 'react-icons/fi';

const AptitudeTestList = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Batch management modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [testBatches, setTestBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.get('http://localhost:3001/api/aptitude/tests', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setTests(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
      alert('Failed to fetch tests');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishTest = async (testId) => {
    if (!window.confirm('Are you sure you want to publish this test? Students will be able to see it.')) {
      return;
    }

    try {
      const token = sessionStorage.getItem('authToken');
      await axios.post(
        `http://localhost:3001/api/aptitude/tests/${testId}/publish`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Test published successfully!');
      fetchTests();
    } catch (error) {
      console.error('Error publishing test:', error);
      alert(error.response?.data?.message || 'Failed to publish test');
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
      return;
    }

    try {
      const token = sessionStorage.getItem('authToken');
      await axios.delete(
        `http://localhost:3001/api/aptitude/tests/${testId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Test deleted successfully!');
      fetchTests();
    } catch (error) {
      console.error('Error deleting test:', error);
      alert(error.response?.data?.message || 'Failed to delete test');
    }
  };

  const handleExportResults = async (testId) => {
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.get(
        `http://localhost:3001/api/aptitude/tests/${testId}/export`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `test-results-${testId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting results:', error);
      alert('Failed to export results');
    }
  };

  // Batch Management Functions
  const handleManageBatches = async (test) => {
    setSelectedTest(test);
    setShowBatchModal(true);
    setLoadingBatches(true);

    try {
      const token = sessionStorage.getItem('authToken');

      // Fetch all available batches
      const batchResponse = await axios.get(
        'http://localhost:3001/api/batches?status=active&limit=100',
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAvailableBatches(batchResponse.data.data || []);
      setTestBatches(test.assignedBatches || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
      alert('Failed to load batches');
    } finally {
      setLoadingBatches(false);
    }
  };

  const handleAssignBatch = async (batchId) => {
    try {
      const token = sessionStorage.getItem('authToken');
      await axios.post(
        `http://localhost:3001/api/aptitude/tests/${selectedTest._id}/assign-batch`,
        { batchId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTestBatches([...testBatches, batchId]);
      alert('Batch assigned successfully!');
      fetchTests(); // Refresh test list
    } catch (error) {
      console.error('Error assigning batch:', error);
      alert(error.response?.data?.message || 'Failed to assign batch');
    }
  };

  const handleRemoveBatch = async (batchId) => {
    try {
      const token = sessionStorage.getItem('authToken');
      await axios.delete(
        `http://localhost:3001/api/aptitude/tests/${selectedTest._id}/remove-batch/${batchId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTestBatches(testBatches.filter(id => id !== batchId));
      alert('Batch removed successfully!');
      fetchTests(); // Refresh test list
    } catch (error) {
      console.error('Error removing batch:', error);
      alert(error.response?.data?.message || 'Failed to remove batch');
    }
  };

  const handlePopulateStudents = async (batchId) => {
    if (!window.confirm('This will add ALL students matching this batch\'s criteria (course, department, passout year). Continue?')) {
      return;
    }

    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.post(
        `http://localhost:3001/api/batches/${batchId}/add-all-students`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(response.data.message || 'Students added successfully!');

      // Refresh batches
      handleManageBatches(selectedTest);
    } catch (error) {
      console.error('Error populating students:', error);
      alert(error.response?.data?.message || 'Failed to populate students');
    }
  };

  const getStatusBadge = (test) => {
    const now = new Date();
    const startDate = new Date(test.schedule.startDate);
    const endDate = new Date(test.schedule.endDate);

    if (test.status === 'draft') {
      return <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-semibold">Draft</span>;
    }

    if (test.status === 'archived') {
      return <span className="px-3 py-1 bg-purple-200 text-purple-700 rounded-full text-xs font-semibold">Archived</span>;
    }

    if (endDate < now) {
      return <span className="px-3 py-1 bg-red-200 text-red-700 rounded-full text-xs font-semibold">Completed</span>;
    }

    if (startDate > now) {
      return <span className="px-3 py-1 bg-blue-200 text-blue-700 rounded-full text-xs font-semibold">Upcoming</span>;
    }

    return <span className="px-3 py-1 bg-green-200 text-green-700 rounded-full text-xs font-semibold">Ongoing</span>;
  };

  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase());

    if (filter === 'all') return matchesSearch;
    if (filter === 'draft') return matchesSearch && test.status === 'draft';
    if (filter === 'published') return matchesSearch && test.status === 'published';
    if (filter === 'completed') {
      const endDate = new Date(test.schedule.endDate);
      return matchesSearch && endDate < new Date();
    }

    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Aptitude Tests</h1>
              <p className="text-gray-600 mt-1">Manage and monitor all aptitude tests</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  // Determine if user is admin or HOD based on current path
                  const path = window.location.pathname;
                  if (path.includes('/hod/')) {
                    navigate('/hod/dashboard');
                  } else {
                    navigate('/home'); // Admin dashboard
                  }
                }}
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </button>
              <button
                onClick={() => navigate('/admin/aptitude-tests/create')}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-200"
              >
                <FiPlus size={20} />
                Create New Test
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tests</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{tests.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <FiBarChart2 size={24} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Published</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {tests.filter(t => t.status === 'published').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <FiEye size={24} className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Draft</p>
                <p className="text-3xl font-bold text-gray-600 mt-1">
                  {tests.filter(t => t.status === 'draft').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <FiEdit2 size={24} className="text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Attempts</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {tests.reduce((sum, t) => sum + (t.stats?.totalAttempts || 0), 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <FiUsers size={24} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Tests
              </button>
              <button
                onClick={() => setFilter('published')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'published'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Published
              </button>
              <button
                onClick={() => setFilter('draft')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'draft'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Draft
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'completed'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Completed
              </button>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tests..."
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tests Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Questions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attempts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTests.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No tests found. Create your first test to get started!
                    </td>
                  </tr>
                ) : (
                  filteredTests.map((test) => (
                    <tr key={test._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{test.title}</p>
                          {test.description && (
                            <p className="text-sm text-gray-500 mt-1">{test.description.substring(0, 60)}...</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{test.duration} mins</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{test.totalQuestions}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <p className="text-gray-900">
                            {new Date(test.schedule.startDate).toLocaleDateString()}
                          </p>
                          <p className="text-gray-500">
                            to {new Date(test.schedule.endDate).toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(test)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {test.stats?.totalAttempts || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {test.status === 'draft' && (
                            <button
                              onClick={() => handlePublishTest(test._id)}
                              className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                              title="Publish Test"
                            >
                              <FiEye size={18} />
                            </button>
                          )}

                          <button
                            onClick={() => navigate(`/admin/aptitude-tests/${test._id}/analytics`)}
                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                            title="View Analytics"
                          >
                            <FiBarChart2 size={18} />
                          </button>

                          {(test.stats?.totalAttempts || 0) > 0 && (
                            <button
                              onClick={() => handleExportResults(test._id)}
                              className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                              title="Export Results"
                            >
                              <FiDownload size={18} />
                            </button>
                          )}

                          <button
                            onClick={() => navigate(`/admin/aptitude-tests/${test._id}/edit`)}
                            className="p-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200 transition-colors"
                            title="Edit Test"
                          >
                            <FiEdit2 size={18} />
                          </button>

                          <button
                            onClick={() => handleDeleteTest(test._id)}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                            title="Delete Test"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Batch Management Modal */}
        {showBatchModal && selectedTest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Manage Batches & Students</h2>
                    <p className="text-indigo-100 mt-1">{selectedTest.title}</p>
                  </div>
                  <button
                    onClick={() => setShowBatchModal(false)}
                    className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                  >
                    <FiX size={24} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingBatches ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading batches...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availableBatches.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <FiUsers size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 font-medium">No batches available</p>
                        <p className="text-sm text-gray-500 mt-2">Create batches first to assign them to tests</p>
                      </div>
                    ) : (
                      availableBatches.map((batch) => {
                        const isAssigned = testBatches.some(id => id === batch._id || id._id === batch._id);
                        const batchIdStr = batch._id.toString();

                        return (
                          <div
                            key={batch._id}
                            className={`border-2 rounded-lg p-4 transition-all ${
                              isAssigned
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 bg-white hover:border-indigo-300'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-lg font-semibold text-gray-800">{batch.batchName}</h3>
                                  {batch.batchCode && (
                                    <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded">
                                      {batch.batchCode}
                                    </span>
                                  )}
                                  {isAssigned && (
                                    <span className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded">
                                      <FiCheck size={14} />
                                      Assigned
                                    </span>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600 mb-3">
                                  <div><span className="font-medium">Course:</span> {batch.course}</div>
                                  {batch.department && <div><span className="font-medium">Department:</span> {batch.department}</div>}
                                  <div><span className="font-medium">Academic Year:</span> {batch.academicYear}</div>
                                  <div><span className="font-medium">Passout Year:</span> {batch.passoutYear}</div>
                                  <div className="col-span-2">
                                    <span className="font-medium">Students:</span>{' '}
                                    <span className={`font-bold ${batch.studentCount === 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      {batch.studentCount || 0}
                                    </span>
                                    {batch.studentCount === 0 && (
                                      <span className="ml-2 text-red-600 text-xs">⚠️ No students in this batch</span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {!isAssigned ? (
                                    <button
                                      onClick={() => handleAssignBatch(batchIdStr)}
                                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                    >
                                      Assign to Test
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleRemoveBatch(batchIdStr)}
                                      className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                      Remove from Test
                                    </button>
                                  )}

                                  {batch.studentCount === 0 && (
                                    <button
                                      onClick={() => handlePopulateStudents(batch._id)}
                                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                                    >
                                      <FiUserPlus size={16} />
                                      Auto-Add Students
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <strong>{testBatches.length}</strong> batch(es) assigned to this test
                  </div>
                  <button
                    onClick={() => {
                      setShowBatchModal(false);
                      fetchTests(); // Refresh to show updated batch counts
                    }}
                    className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AptitudeTestList;
