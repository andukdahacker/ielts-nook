import { useRef, useState } from "react";
import { useParams } from "react-router";
import { useAuth } from "@/features/auth/auth-context";
import {
  useUser,
  useUpdateProfile,
  useChangePassword,
  useHasPassword,
  useRequestDeletion,
  useCancelDeletion,
  useUploadAvatar,
} from "./users.api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Input } from "@workspace/ui/components/input";
import { Loader2, Pencil, AlertTriangle, X, Camera } from "lucide-react";
import { toast } from "sonner";
import { ProfileEditForm } from "./components/ProfileEditForm";
import { PasswordChangeForm } from "./components/PasswordChangeForm";
import { DeleteAccountModal } from "./components/DeleteAccountModal";
import type { AuthUser } from "@workspace/types";

export function ProfilePage() {
  const { userId } = useParams<{ userId?: string }>();
  const { user: currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If userId param exists and is different from current user, fetch that user
  const isViewingOther = userId && userId !== currentUser?.id;
  const { data: fetchedUser, isLoading, error } = useUser(isViewingOther ? userId : undefined);

  // Use fetched user if viewing another user, otherwise use current user
  const displayUser = isViewingOther ? fetchedUser : currentUser;
  const isOwnProfile = !isViewingOther;

  // Mutations
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const requestDeletion = useRequestDeletion();
  const cancelDeletion = useCancelDeletion();
  const uploadAvatar = useUploadAvatar();

  // Check if user has password (for password change section)
  const { data: passwordStatus } = useHasPassword();
  const hasPassword = passwordStatus?.hasPassword ?? false;

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || "U";
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      toast.error("Image must be less than 1MB");
      return;
    }

    try {
      const promise = uploadAvatar.mutateAsync(file);
      toast.promise(promise, {
        loading: "Uploading avatar...",
        success: "Avatar uploaded successfully",
        error: "Failed to upload avatar",
      });
      await promise;
    } catch (error) {
      console.error(error);
    }

    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleProfileUpdate = async (values: {
    name?: string;
    phoneNumber?: string;
    preferredLanguage?: "en" | "vi";
    emailScheduleNotifications?: boolean;
    emailEngagementNotifications?: boolean;
    emailNotificationsPaused?: boolean;
  }) => {
    try {
      await updateProfile.mutateAsync(values);
      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    }
  };

  const handlePasswordChange = async (values: {
    currentPassword: string;
    newPassword: string;
  }) => {
    try {
      await changePassword.mutateAsync(values);
      toast.success("Password updated. Other sessions have been logged out.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to change password");
    }
  };

  const handleRequestDeletion = async () => {
    try {
      await requestDeletion.mutateAsync();
      toast.success("Account deletion scheduled. You have 7 days to cancel.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to request deletion");
    }
  };

  const handleCancelDeletion = async () => {
    try {
      await cancelDeletion.mutateAsync();
      toast.success("Account deletion cancelled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel deletion");
    }
  };

  // Calculate days remaining for deletion
  const getDeletionDaysRemaining = () => {
    if (!currentUser?.deletionRequestedAt) return null;
    const deletionDate = new Date(currentUser.deletionRequestedAt);
    deletionDate.setDate(deletionDate.getDate() + 7);
    const now = new Date();
    const diffTime = deletionDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const deletionDaysRemaining = getDeletionDaysRemaining();

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            User not found or you don&apos;t have permission to view this profile.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!displayUser) {
    return null;
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      {/* Deletion Warning Banner */}
      {isOwnProfile && currentUser?.deletionRequestedAt && deletionDaysRemaining !== null && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Account Scheduled for Deletion</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              Your account will be deleted in {deletionDaysRemaining} day
              {deletionDaysRemaining !== 1 ? "s" : ""}.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelDeletion}
              disabled={cancelDeletion.isPending}
            >
              {cancelDeletion.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Cancel Deletion
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{isOwnProfile ? "My Profile" : "User Profile"}</CardTitle>
              <CardDescription>
                {isOwnProfile
                  ? "Manage your account information"
                  : `Viewing ${displayUser.name || displayUser.email}'s profile`}
              </CardDescription>
            </div>
            {isOwnProfile && !isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isEditing ? (
            <ProfileEditForm
              user={displayUser as AuthUser}
              onSubmit={handleProfileUpdate}
              onCancel={() => setIsEditing(false)}
              isSubmitting={updateProfile.isPending}
            />
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Avatar className="h-20 w-20">
                    <AvatarImage
                      src={displayUser.avatarUrl ?? undefined}
                      alt={displayUser.name ?? "User"}
                    />
                    <AvatarFallback className="text-2xl">
                      {getInitials(displayUser.name, displayUser.email)}
                    </AvatarFallback>
                  </Avatar>
                  {isOwnProfile && (
                    <>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadAvatar.isPending}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                      >
                        {uploadAvatar.isPending ? (
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                        ) : (
                          <Camera className="h-6 w-6 text-white" />
                        )}
                      </button>
                      <Input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleAvatarUpload}
                      />
                    </>
                  )}
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold">
                    {displayUser.name || "Add your name"}
                  </h2>
                  <p className="text-muted-foreground">{displayUser.email}</p>
                  <Badge variant="secondary" className="capitalize">
                    {displayUser.role?.toLowerCase()}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p>{displayUser.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p>{displayUser.name || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone Number</p>
                  <p>{(displayUser as AuthUser).phoneNumber || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Preferred Language
                  </p>
                  <p>
                    {(displayUser as AuthUser).preferredLanguage === "vi"
                      ? "Vietnamese"
                      : "English"}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Notification Preferences
                  </p>
                  {(displayUser as AuthUser).emailNotificationsPaused && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                      All notifications paused
                    </p>
                  )}
                  <div className={`text-sm space-y-1${(displayUser as AuthUser).emailNotificationsPaused ? " opacity-50" : ""}`}>
                    <p>
                      Schedule changes:{" "}
                      {(displayUser as AuthUser).emailScheduleNotifications !== false
                        ? "On"
                        : "Off"}
                    </p>
                    <p>
                      Achievements & streaks:{" "}
                      {(displayUser as AuthUser).emailEngagementNotifications !== false
                        ? "On"
                        : "Off"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Role</p>
                  <p className="capitalize">{displayUser.role?.toLowerCase()}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Password Change Section - Only for own profile */}
      {isOwnProfile && (
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your password to keep your account secure</CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordChangeForm
              onSubmit={handlePasswordChange}
              isSubmitting={changePassword.isPending}
              hasPassword={hasPassword}
            />
          </CardContent>
        </Card>
      )}

      {/* Delete Account Section - Only for own profile and non-owners */}
      {isOwnProfile && currentUser?.role !== "OWNER" && !currentUser?.deletionRequestedAt && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Once you delete your account, there is no going back. Your profile, class
              enrollments, and all associated data will be permanently removed after a 7-day
              grace period.
            </p>
            <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>
              Delete My Account
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Account Modal */}
      <DeleteAccountModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        onConfirm={handleRequestDeletion}
        isSubmitting={requestDeletion.isPending}
      />
    </div>
  );
}
