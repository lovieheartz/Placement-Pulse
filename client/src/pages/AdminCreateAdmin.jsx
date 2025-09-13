import React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useForm } from "react-hook-form";


const AdminCreateAdmin = () => {
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      existingAdminEmail: "",
      existingAdminPassword: "",
    },
  });

  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  // ✅ useMutation for creating admin
  const { mutate: createAdmin, isPending: isCreating } = useMutation({
    mutationFn: async (data) => {
      const res = await axios.post(
        "http://localhost:3001/admin/create-admin",
        data,
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      return res.data;
    },
    onSuccess: (data) => {
      setSuccess(data.message || "Admin created successfully!");
      setError("");
      reset();
      setTimeout(() => navigate("/login"), 2000);
    },
    onError: (err) => {
      console.error("Create admin error:", err);
      const msg = err.response?.data?.message || "Failed to create admin.";
      setError(msg);
      setSuccess("");
    },
  });

  const onSubmit = (data) => {
    setError("");
    setSuccess("");
    createAdmin(data);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Create Admin</h2>
      {error && <p style={styles.error}>{error}</p>}
      {success && <p style={styles.success}>{success}</p>}

      <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
        {/* New Admin Fields */}
        <input
          style={styles.input}
          type="text"
          placeholder="New Admin Name"
          {...register("name", { required: "Name is required" })}
          autoComplete="off"
        />
        {errors.name && <span style={styles.errorText}>{errors.name.message}</span>}

        <input
          style={styles.input}
          type="tel"
          placeholder="New Admin Phone (+1234567890)"
          {...register("phone", { 
            required: "Phone is required",
            pattern: {
              value: /^\+?[0-9]{10,15}$/,
              message: "Please enter a valid phone number"
            }
          })}
          autoComplete="off"
        />
        {errors.phone && <span style={styles.errorText}>{errors.phone.message}</span>}

        <input
          style={styles.input}
          type="email"
          placeholder="New Admin Email"
          {...register("email", { 
            required: "Email is required",
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "Invalid email address"
            }
          })}
          autoComplete="off"
        />
        {errors.email && <span style={styles.errorText}>{errors.email.message}</span>}

        <input
          style={styles.input}
          type="password"
          placeholder="New Admin Password"
          {...register("password", { 
            required: "Password is required",
            minLength: {
              value: 8,
              message: "Password must be at least 8 characters"
            }
          })}
          autoComplete="new-password"
        />
        {errors.password && <span style={styles.errorText}>{errors.password.message}</span>}

        {/* Existing Admin Credentials */}
        <input
          style={styles.input}
          type="email"
          placeholder="Existing Admin Email"
          {...register("existingAdminEmail", { 
            required: "Existing admin email is required",
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "Invalid email address"
            }
          })}
          autoComplete="off"
        />
        {errors.existingAdminEmail && (
          <span style={styles.errorText}>{errors.existingAdminEmail.message}</span>
        )}

        <input
          style={styles.input}
          type="password"
          placeholder="Existing Admin Password"
          {...register("existingAdminPassword", { 
            required: "Existing admin password is required"
          })}
          autoComplete="new-password"
        />
        {errors.existingAdminPassword && (
          <span style={styles.errorText}>{errors.existingAdminPassword.message}</span>
        )}

        <button
          type="submit"
          style={styles.submitButton}
          disabled={isCreating}
        >
          {isCreating ? "Creating..." : "Create Admin"}
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
  errorText: {
    color: "red",
    fontSize: "14px",
    marginTop: "-10px",
    marginBottom: "5px",
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
    "&:disabled": {
      backgroundColor: "#cccccc",
      cursor: "not-allowed",
    },
  },
};

export default AdminCreateAdmin;