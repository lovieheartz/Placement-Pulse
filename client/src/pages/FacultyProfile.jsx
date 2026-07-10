import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";
import { API_BASE } from '../config/api';
import "react-toastify/dist/ReactToastify.css";
import PortalLayout from "@/components/app/PortalLayout";
import { GlassPanel } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { resolveFileUrl } from "../lib/api";

const FacultyProfile = () => {
  const token = sessionStorage.getItem("authToken");
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const profileEndpoint = `${API_BASE}/faculty/profile`;
  const avatarEndpoint = `${API_BASE}/faculty/upload-avatar`;

  const {
    data: profileData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["profile", "faculty"],
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
    mutationFn: (data) =>
      axios.put(profileEndpoint, data, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      queryClient.invalidateQueries(["profile", "faculty"]);
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message ||
          "Failed to update profile. Please try again."
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
      queryClient.invalidateQueries(["profile", "faculty"]);
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message ||
          "Failed to upload avatar. Please try again."
      );
    },
  });

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadAvatarMutation.mutate(file);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading profile...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-2xl text-red-600 mb-4">Error: {error.message}</h2>
        <button
          onClick={() => queryClient.invalidateQueries(["profile", "faculty"])}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <PortalLayout role="faculty" title="My Profile" user={profileData || {}}>
        <ProfileContent
          profileData={profileData}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          register={register}
          handleSubmit={handleSubmit}
          onSubmit={(data) => updateProfileMutation.mutate(data)}
          handleAvatarUpload={handleAvatarUpload}
          loading={updateProfileMutation.isLoading}
          uploadingAvatar={uploadAvatarMutation.isLoading}
          reset={() => {
            reset(profileData);
            setIsEditing(false);
          }}
        />
    </PortalLayout>
  );
};

export default FacultyProfile;

const ProfileContent = ({
  profileData,
  isEditing,
  setIsEditing,
  register,
  handleSubmit,
  onSubmit,
  handleAvatarUpload,
  loading,
  uploadingAvatar,
  reset,
}) => (
  <div className="content-container px-3 py-4 w-full mx-auto max-w-2xl">
    <GlassPanel className="w-full">
      {/* Avatar Centered */}
      <div className="flex flex-col items-center mb-6">
        <Avatar avatar={profileData.avatar} />
        <p className="mt-3 text-lg font-semibold text-foreground">{profileData.name}</p>
        <Badge variant="default" className="mt-1">Faculty</Badge>
      </div>

      {/* Upload Avatar */}
      <div className="flex justify-center mb-6">
        <label
          htmlFor="avatarUpload"
          className="cursor-pointer inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          {uploadingAvatar ? "Uploading..." : "Upload Avatar"}
        </label>
        <input
          type="file"
          id="avatarUpload"
          className="hidden"
          accept="image/*"
          onChange={handleAvatarUpload}
        />
      </div>

      <form
        className="flex flex-col gap-4 max-w-md mx-auto"
        onSubmit={handleSubmit(onSubmit)}
      >
        <InputField label="Name" register={register("name")} disabled={!isEditing} />
        <InputField label="Email" register={register("email")} disabled={!isEditing} />
        <InputField label="Phone" register={register("phone")} disabled={!isEditing} />
        <InputField label="Specialization" register={register("specialization")} disabled={!isEditing} />

        <div className="flex flex-col sm:flex-row justify-between gap-2 mt-4">
          {!isEditing ? (
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          ) : (
            <Button
              variant="outline"
              type="button"
              className="w-full sm:w-auto"
              onClick={reset}
            >
              Cancel
            </Button>
          )}

          {isEditing && (
            <Button
              variant="success"
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>
      </form>
    </GlassPanel>
  </div>
);

const Avatar = ({ avatar }) => (
  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20 shadow-md">
    <img
      src={
        avatar
          ? resolveFileUrl(avatar)
          : "https://via.placeholder.com/150"
      }
      alt="Avatar"
      className="w-full h-full object-cover"
    />
  </div>
);

const InputField = ({ label, register, disabled }) => (
  <div>
    <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
    <input
      {...register}
      disabled={disabled}
      className={`w-full rounded-lg border border-input px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        disabled ? "bg-muted/40 text-muted-foreground cursor-not-allowed" : "bg-card"
      }`}
    />
  </div>
);
