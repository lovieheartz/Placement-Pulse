import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const FacultyManagement = () => {
  const [faculty, setFaculty] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    fetchFaculty();
  }, []);

  const fetchFaculty = async () => {
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch('http://localhost:3001/admin/managed-faculty', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setFaculty(data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch faculty');
    }
  };

  const createFaculty = async (data) => {
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch('http://localhost:3001/admin/create-faculty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (response.ok) {
        toast.success('Faculty created successfully');
        setShowCreateForm(false);
        reset();
        fetchFaculty();
      } else {
        toast.error(result.message || 'Failed to create faculty');
      }
    } catch (error) {
      toast.error('Failed to create faculty');
    }
  };

  return (
    <div style={styles.container}>
      <ToastContainer />
      <h2>Faculty Management</h2>
      
      <button 
        onClick={() => setShowCreateForm(!showCreateForm)}
        style={styles.button}
      >
        {showCreateForm ? 'Cancel' : 'Add New Faculty'}
      </button>

      {showCreateForm && (
        <div style={styles.formContainer}>
          <h3>Create New Faculty</h3>
          <form onSubmit={handleSubmit(createFaculty)} style={styles.form}>
            <input
              style={styles.input}
              type="text"
              placeholder="Full Name"
              {...register('name', { required: 'Name is required' })}
            />
            {errors.name && <p style={styles.error}>{errors.name.message}</p>}

            <input
              style={styles.input}
              type="email"
              placeholder="Email Address"
              {...register('email', { required: 'Email is required' })}
            />
            {errors.email && <p style={styles.error}>{errors.email.message}</p>}

            <input
              style={styles.input}
              type="tel"
              placeholder="Phone Number (+91XXXXXXXXXX)"
              {...register('phone', { required: 'Phone is required' })}
            />
            {errors.phone && <p style={styles.error}>{errors.phone.message}</p>}

            <input
              style={styles.input}
              type="text"
              placeholder="Specialization"
              {...register('specialization', { required: 'Specialization is required' })}
            />
            {errors.specialization && <p style={styles.error}>{errors.specialization.message}</p>}

            <input
              style={styles.input}
              type="password"
              placeholder="Password"
              {...register('password', { required: 'Password is required' })}
            />
            {errors.password && <p style={styles.error}>{errors.password.message}</p>}

            <button type="submit" style={styles.submitButton}>
              Create Faculty
            </button>
          </form>
        </div>
      )}

      <div style={styles.facultyList}>
        <h3>Managed Faculty ({faculty.length})</h3>
        {faculty.map((f) => (
          <div key={f._id} style={styles.facultyCard}>
            <h4>{f.name}</h4>
            <p>Email: {f.email}</p>
            <p>Phone: {f.phone}</p>
            <p>Specialization: {f.specialization}</p>
            <p>Created: {new Date(f.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '20px auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#4a90e2',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginBottom: '20px',
  },
  formContainer: {
    backgroundColor: '#f9f9f9',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  input: {
    padding: '12px',
    borderRadius: '5px',
    border: '1px solid #ccc',
    fontSize: '16px',
  },
  submitButton: {
    padding: '12px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  error: {
    color: 'red',
    fontSize: '14px',
    marginTop: '-10px',
  },
  facultyList: {
    marginTop: '30px',
  },
  facultyCard: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    marginBottom: '10px',
    borderRadius: '5px',
    border: '1px solid #dee2e6',
  },
};

export default FacultyManagement;