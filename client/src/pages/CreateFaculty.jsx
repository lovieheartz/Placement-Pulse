import React, { useState } from "react";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const CreateFaculty = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    specialization: "",
  });
  const [avatar, setAvatar] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setAvatar(e.target.files[0]);
  };

  const createFacultyMutation = useMutation({
    mutationFn: async (data) => {
      try {
        // First get an admin to use as createdBy
        const adminRes = await axios.get("http://localhost:3001/admin/first");
        const adminId = adminRes.data.data._id;
        
        const config = {
          headers: { "Content-Type": "multipart/form-data" },
        };
        const formPayload = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          formPayload.append(key, value);
        });
        
        // Add createdBy field
        formPayload.append("createdBy", adminId);
        
        if (avatar) formPayload.append("avatar", avatar);

        const res = await axios.post("http://localhost:3001/faculty/create-faculty", formPayload, config);
        return res.data;
      } catch (error) {
        console.error("Error in createFacultyMutation:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setSuccess(data.message || "Faculty created successfully!");
      setError("");
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        specialization: "",
      });
      setAvatar(null);

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    },
    onError: (err) => {
      console.error("Faculty creation failed:", err);
      const message = err.response?.data?.message || "Failed to create faculty.";
      setError(message);
      setSuccess("");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const { name, email, phone, password, specialization } = formData;
    if (!name || !email || !phone || !password || !specialization) {
      setError("All fields are required.");
      return;
    }

    createFacultyMutation.mutate(formData);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Create Faculty</h2>
      {error && <p style={styles.error}>{error}</p>}
      {success && <p style={styles.success}>{success}</p>}

      <form onSubmit={handleSubmit} style={styles.form} encType="multipart/form-data">
        <input
          style={styles.input}
          type="text"
          name="name"
          placeholder="Faculty Name"
          value={formData.name}
          onChange={handleChange}
          autoComplete="off"
        />
        <input
          style={styles.input}
          type="email"
          name="email"
          placeholder="Faculty Email"
          value={formData.email}
          onChange={handleChange}
          autoComplete="off"
        />
        <input
          style={styles.input}
          type="tel"
          name="phone"
          placeholder="Faculty Phone (+1234567890)"
          value={formData.phone}
          onChange={handleChange}
          autoComplete="off"
        />
        <input
          style={styles.input}
          type="text"
          name="specialization"
          placeholder="Specialization"
          value={formData.specialization}
          onChange={handleChange}
          autoComplete="off"
        />
        <input
          style={styles.input}
          type="password"
          name="password"
          placeholder="Faculty Password"
          value={formData.password}
          onChange={handleChange}
          autoComplete="new-password"
        />

        {/* Avatar upload field */}
        <input
          style={{ ...styles.input, padding: "8px" }}
          type="file"
          name="avatar"
          accept="image/*"
          onChange={handleFileChange}
        />

        <button
          type="submit"
          style={styles.submitButton}
          disabled={createFacultyMutation.isPending}
        >
          {createFacultyMutation.isPending ? "Creating..." : "Create Faculty"}
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "400px",
    margin: "50px auto",
    padding: "30px",
    borderRadius: "12px",
    backgroundColor: "#f7f9fc",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.1)",
    fontFamily: "Arial, sans-serif",
  },
  heading: {
    textAlign: "center",
    color: "#333",
    marginBottom: "20px",
  },
  error: {
    color: "red",
    textAlign: "center",
    marginBottom: "10px",
  },
  success: {
    color: "green",
    textAlign: "center",
    marginBottom: "10px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "16px",
  },
  submitButton: {
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#4a90e2",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background-color 0.3s ease",
  },
};

export default CreateFaculty;
