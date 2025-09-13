import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { AuthContext } from '../context/AuthContext';
import './Dashboard.css';

const EditFaculty = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [avatar, setAvatar] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm();

  const toggleDropdown = () => setDropdownOpen(!isDropdownOpen);

  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        const { data } = await axios.get(`http://localhost:3001/faculty/${id}`);
        if (data.success && data.data) {
          reset(data.data);
        } else {
          toast.error('Invalid faculty data');
        }
      } catch (err) {
        toast.error('❌ Failed to fetch faculty');
      }
    };
    fetchFaculty();
  }, [id, reset]);

  const handleAvatarChange = (e) => {
    setAvatar(e.target.files[0]);
  };

  const onSubmit = async (formData) => {
    try {
      const form = new FormData();
      for (const key in formData) {
        form.append(key, formData[key]);
      }
      if (avatar) {
        form.append('avatar', avatar);
      }

      await axios.put(`http://localhost:3001/faculty/update/${id}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('✅ Faculty updated successfully');
      navigate('/admin/faculty');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || '❌ Failed to update faculty';
      toast.error(msg);
    }
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <h1 style={styles.heading}>You are not logged in</h1>
        <p style={styles.subheading}>Please login to access your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main">
        <Header
          user={user}
          toggleDropdown={toggleDropdown}
          isDropdownOpen={isDropdownOpen}
          handleLogout={() => {
            logout();
            navigate('/login', { replace: true });
          }}
          navigate={navigate}
        />

        <div className="form-container">
          <div className="form-wrapper">
            <h2 className="form-heading">Edit Faculty</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="faculty-form" encType="multipart/form-data">
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Faculty Name"
                  {...register('name', { required: 'Name is required' })}
                />
                {errors.name && <p className="error-text">{errors.name.message}</p>}
              </div>

              <div className="form-group">
                <input
                  type="email"
                  placeholder="Faculty Email"
                  {...register('email', { required: 'Email is required' })}
                />
                {errors.email && <p className="error-text">{errors.email.message}</p>}
              </div>

              <div className="form-group">
                <input
                  type="tel"
                  placeholder="Faculty Phone"
                  {...register('phone', { required: 'Phone is required' })}
                />
                {errors.phone && <p className="error-text">{errors.phone.message}</p>}
              </div>

              <div className="form-group">
                <input
                  type="text"
                  placeholder="Specialization"
                  {...register('specialization', { required: 'Specialization is required' })}
                />
                {errors.specialization && <p className="error-text">{errors.specialization.message}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="avatar" className="block text-sm font-medium text-gray-700">
                  Upload New Profile Image (optional)
                </label>
                <input
                  type="file"
                  id="avatar"
                  name="avatar"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => navigate('/admin/faculty')}
                  className="text-blue-600 hover:text-blue-800 px-4 py-2"
                  type="button"
                >
                  ← Back to Faculty List
                </button>
                <button type="submit" className="submit-button" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f0f4f8',
    padding: '20px',
  },
  heading: {
    fontSize: '32px',
    color: '#333',
    marginBottom: '10px',
    textAlign: 'center',
  },
  subheading: {
    fontSize: '18px',
    color: '#666',
    marginBottom: '30px',
    textAlign: 'center',
  },
};

export default EditFaculty;
