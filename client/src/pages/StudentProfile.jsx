import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Footer from "../components/StudentFooter";
import Header from "../components/StudentHeader";
import Sidebar from "../components/StudentSidebar";

const StudentProfile = () => {
  const token = sessionStorage.getItem("authToken");
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const profileEndpoint = `http://localhost:3001/student/profile`;
  const avatarEndpoint = `http://localhost:3001/student/upload-avatar`;

  const {
    data: profileData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["profile", "student"],
    queryFn: async () => {
      const res = await axios.get(profileEndpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data;
    },
    enabled: !!token,
  });

  const { register, reset, handleSubmit } = useForm();

  useEffect(() => {
    if (profileData) reset(profileData);
  }, [profileData, reset]);

  const updateProfileMutation = useMutation({
    mutationFn: async (formData) => {
      return axios.put(profileEndpoint, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      queryClient.invalidateQueries(["profile", "student"]);
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message || "Failed to update profile. Please try again."
      );
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append("avatar", file);
      return axios.post(avatarEndpoint, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
    },
    onSuccess: () => {
      toast.success("Avatar uploaded successfully!");
      queryClient.invalidateQueries(["profile", "student"]);
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message || "Failed to upload avatar. Please try again."
      );
    },
  });

  const onSubmit = (formData) => {
    updateProfileMutation.mutate(formData);
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadAvatarMutation.mutate(file);
    }
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading profile...</div>
      </div>
    );

  if (isError)
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-2xl text-red-600 mb-4">Error: {error.message}</h2>
        <button
          onClick={() => queryClient.invalidateQueries(["profile", "student"])}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Try Again
        </button>
      </div>
    );

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main">
        <Header user={profileData} />
        <div className="content-container px-3 py-4 w-full mx-auto max-w-full">
          <div className="bg-white rounded-xl shadow-sm px-6 py-6 w-full">

            {/* Avatar Centered */}
            <div className="flex justify-center mb-6">
              <Avatar avatar={profileData.avatar} />
            </div>

            {/* Avatar Upload */}
            <div className="flex justify-center mb-6">
              <label
                htmlFor="avatarUpload"
                className="cursor-pointer inline-flex items-center px-4 py-2 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 text-sm"
              >
                {uploadAvatarMutation.isLoading ? "Uploading..." : "Upload Avatar"}
              </label>
              <input
                type="file"
                id="avatarUpload"
                className="hidden"
                accept="image/*"
                onChange={handleAvatarUpload}
              />
            </div>

            {/* Form */}
            <form
              className="flex flex-col gap-4 max-w-md mx-auto"
              onSubmit={handleSubmit(onSubmit)}
            >
              <InputField
                label="Name"
                register={register("name")}
                disabled={!isEditing}
              />
              <InputField
                label="Email"
                register={register("email")}
                disabled={!isEditing}
              />
              {profileData?.phone && (
                <InputField
                  label="Phone"
                  register={register("phone")}
                  disabled={!isEditing}
                />
              )}
              {profileData?.specialization && (
                <InputField
                  label="Specialization"
                  register={register("specialization")}
                  disabled={!isEditing}
                />
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-between gap-2 mt-4">
                {!isEditing ? (
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full sm:w-auto"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsEditing(true);
                    }}
                  >
                    Edit
                  </button>
                ) : (
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 w-full sm:w-auto"
                    onClick={() => {
                      reset(profileData);
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </button>
                )}

                {isEditing && (
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 w-full sm:w-auto"
                  >
                    {updateProfileMutation.isLoading ? "Saving..." : "Save Changes"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default StudentProfile;

const Avatar = ({ avatar }) => (
  <div className="w-24 h-24 rounded-full overflow-hidden border border-gray-300">
    <img
      src={
        avatar
          ? `http://localhost:3001${avatar}`
          : "https://via.placeholder.com/150"
      }
      alt="Avatar"
      className="w-full h-full object-cover"
    />
  </div>
);

const InputField = ({ label, register, disabled }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <input
      {...register}
      disabled={disabled}
      className={`w-full border px-3 py-2 rounded ${
        disabled ? "bg-gray-100" : "bg-white"
      }`}
    />
  </div>
);
