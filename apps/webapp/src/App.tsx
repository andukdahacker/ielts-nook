import { BrowserRouter, Navigate, Route, Routes } from "react-router";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast, Toaster } from "sonner";
import { ErrorBoundary } from "./core/components/common/error-boundary";
import { UnauthorizedError } from "./core/client";
import { ThemeProvider } from "./core/components/common/theme-provider";
import { AuthProvider } from "./features/auth/auth-context";
import { ForgotPasswordPage } from "./features/auth/forgot-password-page";
import { GuestRoute } from "./features/auth/guest-route";
import { LoginPage } from "./features/auth/login-page";
import { ProtectedRoute } from "./features/auth/protected-route";
import { ResetPasswordPage } from "./features/auth/reset-password-page";
import { RoleRedirect } from "./features/auth/role-redirect";
import { SignupCenterPage } from "./features/auth/signup-center-page";
import { SignupPage } from "./features/auth/signup-page";
import DashboardPage from "./features/dashboard/DashboardPage";
import { ClassesPage } from "./features/logistics/classes-page";
import { CoursesPage } from "./features/logistics/courses-page";
import { SchedulerPage } from "./features/logistics/scheduler-page";
import { TenantProvider } from "./features/tenants/tenant-context";
import { ProfilePage } from "./features/users/profile-page";
import { UsersPage } from "./features/users/users-page";
import { ExercisesPage } from "./features/exercises/exercises-page";
import { ExerciseEditor } from "./features/exercises/components/ExerciseEditor";
import { GradingQueuePage } from "./features/grading/GradingQueuePage";
import { MockTestsPage } from "./features/mock-tests/mock-tests-page";
import { MockTestEditor } from "./features/mock-tests/components/MockTestEditor";
import AssignmentsPage from "./features/assignments/assignments-page";
import { StudentsPage } from "./features/students/StudentsPage";
import { StudentFeedbackPage } from "./features/grading/student/StudentFeedbackPage";
import { SubmissionPage } from "./features/submissions/components/SubmissionPage";
import { SettingsLayout } from "./features/settings/components/SettingsLayout";
import { GeneralSettingsPage } from "./features/settings/pages/GeneralSettingsPage";
import { IntegrationsPage } from "./features/settings/pages/IntegrationsPage";
import { PrivacyPage } from "./features/settings/pages/PrivacyPage";
import { RoomsPage } from "./features/settings/pages/RoomsPage";
import { TagsSettingsPage } from "./features/settings/pages/TagsSettingsPage";
import { BillingPage } from "./features/settings/pages/BillingPage";
import { ModerationPage } from "./features/settings/pages/ModerationPage";
import { AICustomizationPage } from "./features/settings/pages/AICustomizationPage";

function App() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error instanceof UnauthorizedError) return false;
          return failureCount < 3;
        },
      },
      mutations: {
        retry: 0,
        onError: (error) => {
          if (error instanceof UnauthorizedError) {
            toast.error("Unauthenticated");
          }
        },
      },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TenantProvider>
            <ErrorBoundary>
              <BrowserRouter>
                <Routes>
                  {/* Guest Routes - Redirects to dashboard if logged in */}
                  <Route element={<GuestRoute />}>
                    <Route path="/sign-in" element={<LoginPage />} />
                    <Route path="/sign-up" element={<SignupPage />} />
                    <Route
                      path="/sign-up/center"
                      element={<SignupCenterPage />}
                    />
                    <Route
                      path="/forgot-password"
                      element={<ForgotPasswordPage />}
                    />
                    <Route
                      path="/reset-password"
                      element={<ResetPasswordPage />}
                    />
                  </Route>

                  {/* Role-based redirection at root */}
                  <Route path="/" element={<RoleRedirect />} />

                  {/* Unified Dashboard Route */}
                  <Route
                    path="/:centerId/dashboard"
                    element={
                      <ErrorBoundary>
                        <ProtectedRoute
                          allowedRoles={[
                            "OWNER",
                            "ADMIN",
                            "TEACHER",
                            "STUDENT",
                          ]}
                        >
                          <DashboardPage />
                        </ProtectedRoute>
                      </ErrorBoundary>
                    }
                  >
                    {/* Redirect old /users route to settings/users */}
                    <Route
                      path="users"
                      element={<Navigate to="settings/users" replace />}
                    />

                    {/* Settings with sub-navigation */}
                    <Route
                      path="settings"
                      element={
                        <ErrorBoundary>
                          <ProtectedRoute allowedRoles={["OWNER", "ADMIN"]}>
                            <SettingsLayout />
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    >
                      <Route index element={<GeneralSettingsPage />} />
                      <Route path="users" element={<UsersPage />} />
                      <Route path="rooms" element={<RoomsPage />} />
                      <Route path="tags" element={<TagsSettingsPage />} />
                      <Route
                        path="integrations"
                        element={<IntegrationsPage />}
                      />
                      <Route path="privacy" element={<PrivacyPage />} />
                      <Route path="compliance" element={<ModerationPage />} />
                      <Route path="ai" element={<AICustomizationPage />} />
                      <Route path="billing" element={<BillingPage />} />
                    </Route>

                    {/* Courses - accessed via Classes, kept for direct URL access */}
                    <Route
                      path="courses"
                      element={
                        <ErrorBoundary>
                          <ProtectedRoute
                            allowedRoles={["OWNER", "ADMIN", "TEACHER"]}
                          >
                            <CoursesPage />
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="classes"
                      element={
                        <ErrorBoundary>
                          <ProtectedRoute
                            allowedRoles={["OWNER", "ADMIN", "TEACHER"]}
                          >
                            <ClassesPage />
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="schedule"
                      element={
                        <ErrorBoundary>
                          <ProtectedRoute
                            allowedRoles={[
                              "OWNER",
                              "ADMIN",
                              "TEACHER",
                              "STUDENT",
                            ]}
                          >
                            <SchedulerPage />
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="exercises"
                      element={
                        <ErrorBoundary>
                          <ProtectedRoute
                            allowedRoles={["OWNER", "ADMIN", "TEACHER"]}
                          >
                            <ExercisesPage />
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="exercises/new"
                      element={
                        <ErrorBoundary>
                          <ProtectedRoute
                            allowedRoles={["OWNER", "ADMIN", "TEACHER"]}
                          >
                            <ExerciseEditor />
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="exercises/:id/edit"
                      element={
                        <ErrorBoundary>
                          <ProtectedRoute
                            allowedRoles={["OWNER", "ADMIN", "TEACHER"]}
                          >
                            <ExerciseEditor />
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="assignments"
                      element={
                        <ErrorBoundary>
                          <ProtectedRoute
                            allowedRoles={["OWNER", "TEACHER"]}
                          >
                            <AssignmentsPage />
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="mock-tests"
                      element={
                        <ErrorBoundary>
                          <ProtectedRoute
                            allowedRoles={["OWNER", "ADMIN", "TEACHER"]}
                          >
                            <MockTestsPage />
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="mock-tests/new"
                      element={
                        <ErrorBoundary>
                          <ProtectedRoute
                            allowedRoles={["OWNER", "ADMIN", "TEACHER"]}
                          >
                            <MockTestEditor />
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="mock-tests/:id/edit"
                      element={
                        <ErrorBoundary>
                          <ProtectedRoute
                            allowedRoles={["OWNER", "ADMIN", "TEACHER"]}
                          >
                            <MockTestEditor />
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="grading"
                      element={
                        <ErrorBoundary>
                          <ProtectedRoute
                            allowedRoles={["OWNER", "TEACHER"]}
                          >
                            <GradingQueuePage />
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="grading/:submissionId"
                      element={
                        <ErrorBoundary>
                          <ProtectedRoute
                            allowedRoles={["OWNER", "TEACHER"]}
                          >
                            <GradingQueuePage />
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="feedback/:submissionId"
                      element={
                        <ErrorBoundary>
                          <ProtectedRoute
                            allowedRoles={[
                              "STUDENT",
                              "TEACHER",
                              "ADMIN",
                              "OWNER",
                            ]}
                          >
                            <StudentFeedbackPage />
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="students"
                      element={
                        <ErrorBoundary>
                          <ProtectedRoute
                            allowedRoles={["OWNER", "ADMIN", "TEACHER"]}
                          >
                            <StudentsPage />
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="profile"
                      element={
                        <ErrorBoundary>
                          <ProtectedRoute
                            allowedRoles={[
                              "OWNER",
                              "ADMIN",
                              "TEACHER",
                              "STUDENT",
                            ]}
                          >
                            <ProfilePage />
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="profile/:userId"
                      element={
                        <ErrorBoundary>
                          <ProtectedRoute
                            allowedRoles={[
                              "OWNER",
                              "ADMIN",
                              "TEACHER",
                              "STUDENT",
                            ]}
                          >
                            <ProfilePage />
                          </ProtectedRoute>
                        </ErrorBoundary>
                      }
                    />
                  </Route>

                  {/* Student Submission — full-screen, no nav rail */}
                  <Route
                    path="/:centerId/assignments/:assignmentId/take"
                    element={
                      <ErrorBoundary>
                        <ProtectedRoute allowedRoles={["STUDENT"]}>
                          <SubmissionPage />
                        </ProtectedRoute>
                      </ErrorBoundary>
                    }
                  />

                  <Route path="/dashboard" element={<RoleRedirect />} />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </ErrorBoundary>
            <Toaster />
          </TenantProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export { App };
