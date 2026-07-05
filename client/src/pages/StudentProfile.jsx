import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Camera,
  Mail,
  Phone,
  User as UserIcon,
  Sparkles,
  Pencil,
  Save,
  X,
} from "lucide-react";

import { API_BASE, resolveFileUrl } from "../lib/api";
import PortalLayout from "@/components/app/PortalLayout";
import { GlassPanel } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const StudentProfile = () => {
  const token = sessionStorage.getItem("authToken");
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const profileEndpoint = `${API_BASE}/student/profile`;
  const avatarEndpoint = `${API_BASE}/student/upload-avatar`;

  const { data: profileData, isLoading, isError, error } = useQuery({
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
      queryClient.invalidateQueries(["profile", "student"]);
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message ||
          "Failed to upload avatar. Please try again."
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

  const avatarUrl = profileData?.avatar
    ? resolveFileUrl(profileData.avatar)
    : null;

  return (
    <PortalLayout role="student" title="My Profile" user={profileData}>
      {isLoading ? (
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : isError ? (
        <GlassPanel className="mx-auto max-w-md text-center">
          <p className="mb-4 text-destructive">Error: {error.message}</p>
          <Button
            onClick={() =>
              queryClient.invalidateQueries(["profile", "student"])
            }
          >
            Try Again
          </Button>
        </GlassPanel>
      ) : (
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Hero banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-700 to-indigo-700 p-6 text-white shadow-lg">
            <div className="pointer-events-none absolute -right-10 -top-12 size-52 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-end">
              <div className="group relative">
                <div className="size-28 overflow-hidden rounded-full ring-4 ring-white/30 shadow-xl">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-white/20 text-3xl font-bold">
                      {(profileData?.name || "S").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <label
                  htmlFor="avatarUpload"
                  className="absolute bottom-1 right-1 flex size-8 cursor-pointer items-center justify-center rounded-full bg-white text-blue-700 shadow-md ring-2 ring-blue-700 transition-transform hover:scale-110"
                  title="Upload avatar"
                >
                  <Camera className="size-4" />
                </label>
                <input
                  type="file"
                  id="avatarUpload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                />
              </div>

              <div className="flex-1 text-center sm:pb-2 sm:text-left">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                  <Sparkles className="size-3.5" /> Student
                </span>
                <h2 className="mt-2 text-2xl font-bold">
                  {profileData?.name || "Student"}
                </h2>
                <p className="text-sm text-blue-100">{profileData?.email}</p>
              </div>

              <div className="sm:pb-2">
                {!isEditing ? (
                  <Button
                    variant="secondary"
                    className="bg-white text-blue-700 hover:bg-white/90"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="size-4" /> Edit Profile
                  </Button>
                ) : (
                  <Badge variant="warning" className="text-sm">
                    Editing…
                  </Badge>
                )}
              </div>
            </div>
            {uploadAvatarMutation.isLoading && (
              <p className="relative mt-3 text-center text-xs text-blue-100 sm:text-left">
                Uploading avatar…
              </p>
            )}
          </div>

          {/* Details form */}
          <GlassPanel>
            <form
              className="grid grid-cols-1 gap-5 sm:grid-cols-2"
              onSubmit={handleSubmit(onSubmit)}
            >
              <Field
                icon={UserIcon}
                label="Name"
                register={register("name")}
                disabled={!isEditing}
              />
              <Field
                icon={Mail}
                label="Email"
                register={register("email")}
                disabled={!isEditing}
              />
              {profileData?.phone && (
                <Field
                  icon={Phone}
                  label="Phone"
                  register={register("phone")}
                  disabled={!isEditing}
                />
              )}
              {profileData?.specialization && (
                <Field
                  icon={Sparkles}
                  label="Specialization"
                  register={register("specialization")}
                  disabled={!isEditing}
                />
              )}

              {isEditing && (
                <div className="col-span-full mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      reset(profileData);
                      setIsEditing(false);
                    }}
                  >
                    <X className="size-4" /> Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="success"
                    disabled={updateProfileMutation.isLoading}
                  >
                    <Save className="size-4" />
                    {updateProfileMutation.isLoading
                      ? "Saving…"
                      : "Save Changes"}
                  </Button>
                </div>
              )}
            </form>
          </GlassPanel>
        </div>
      )}
    </PortalLayout>
  );
};

export default StudentProfile;

const Field = ({ icon: Icon, label, register, disabled }) => (
  <div>
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </label>
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        {...register}
        disabled={disabled}
        className={`w-full rounded-lg border border-input py-2.5 pl-9 pr-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          disabled ? "bg-muted/50 text-foreground/80" : "bg-card text-foreground"
        }`}
      />
    </div>
  </div>
);
