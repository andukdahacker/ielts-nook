import client from "@/core/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AddStudentToClassInput,
  ClassSchedule,
  ClassStudent,
  Course,
  CreateClassInput,
  CreateClassScheduleInput,
  CreateCourseInput,
  UpdateClassInput,
  UpdateClassScheduleInput,
  UpdateCourseInput,
} from "@workspace/types";

export const useCourses = (centerId?: string | null) => {
  const queryClient = useQueryClient();

  const coursesQuery = useQuery({
    queryKey: ["courses", centerId],
    queryFn: async () => {
      const { data, error } = await client.GET("/api/v1/logistics/courses/");
      if (error) throw error;
      return data.data as Course[];
    },
    enabled: !!centerId,
  });

  const createCourseMutation = useMutation({
    mutationFn: async (input: CreateCourseInput) => {
      const { data, error } = await client.POST("/api/v1/logistics/courses/", {
        body: input,
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses", centerId] });
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateCourseInput;
    }) => {
      const { data, error } = await client.PATCH(
        "/api/v1/logistics/courses/{id}",
        {
          params: { path: { id } },
          body: input,
        },
      );
      if (error) throw error;
      return data.data as Course;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses", centerId] });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE("/api/v1/logistics/courses/{id}", {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses", centerId] });
    },
  });

  return {
    courses: coursesQuery.data ?? [],
    isLoading: coursesQuery.isLoading,
    createCourse: createCourseMutation.mutateAsync,
    updateCourse: updateCourseMutation.mutateAsync,
    deleteCourse: deleteCourseMutation.mutateAsync,
  };
};

export const useClasses = (centerId?: string) => {
  const queryClient = useQueryClient();

  const classesQuery = useQuery({
    queryKey: ["classes", centerId],
    queryFn: async () => {
      const { data, error } = await client.GET("/api/v1/logistics/classes/");
      if (error) throw error;
      return data.data;
    },
    enabled: !!centerId,
  });

  const createClassMutation = useMutation({
    mutationFn: async (input: CreateClassInput) => {
      const { data, error } = await client.POST("/api/v1/logistics/classes/", {
        body: input,
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes", centerId] });
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateClassInput;
    }) => {
      const { data, error } = await client.PATCH(
        "/api/v1/logistics/classes/{id}",
        {
          params: { path: { id } },
          body: input,
        },
      );
      if (error) throw error;
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes", centerId] });
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE("/api/v1/logistics/classes/{id}", {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes", centerId] });
    },
  });

  return {
    classes: classesQuery.data ?? [],
    isLoading: classesQuery.isLoading,
    createClass: createClassMutation.mutateAsync,
    updateClass: updateClassMutation.mutateAsync,
    deleteClass: deleteClassMutation.mutateAsync,
  };
};

export const useRoster = (classId?: string, centerId?: string) => {
  const queryClient = useQueryClient();

  const rosterQuery = useQuery({
    queryKey: ["roster", classId],
    queryFn: async () => {
      const { data, error } = await client.GET(
        "/api/v1/logistics/classes/{id}/students",
        {
          params: { path: { id: classId! } },
        },
      );
      if (error) throw error;
      return data.data as ClassStudent[];
    },
    enabled: !!classId,
  });

  const addStudentMutation = useMutation({
    mutationFn: async (input: AddStudentToClassInput) => {
      const { error } = await client.POST(
        "/api/v1/logistics/classes/{id}/students",
        {
          params: { path: { id: classId! } },
          body: input,
        },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roster", classId] });
      queryClient.invalidateQueries({ queryKey: ["classes", centerId] });
    },
  });

  const removeStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await client.DELETE(
        "/api/v1/logistics/classes/{id}/students/{studentId}",
        {
          params: { path: { id: classId!, studentId } },
        },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roster", classId] });
      queryClient.invalidateQueries({ queryKey: ["classes", centerId] });
    },
  });

  return {
    roster: rosterQuery.data ?? [],
    isLoading: rosterQuery.isLoading,
    addStudent: addStudentMutation.mutateAsync,
    removeStudent: removeStudentMutation.mutateAsync,
  };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useSchedules = (classId?: string, _centerId?: string) => {
  const queryClient = useQueryClient();

  const schedulesQuery = useQuery({
    queryKey: ["schedules", classId],
    queryFn: async () => {
      const { data, error } = await client.GET("/api/v1/logistics/schedules/", {
        params: { query: { classId } },
      });
      if (error) throw error;
      return data?.data as ClassSchedule[];
    },
    enabled: !!classId,
  });

  // The create-schedule mutation resolves with the FULL response envelope:
  //   { data: ClassSchedule, message, generatedCount, sessions, conflicts }
  // (See `CreateScheduleResponseSchema` on the backend.)
  // Callers that only need the schedule should read `.data` from the result;
  // callers that want to surface conflict warnings to the user can read
  // `.conflicts.length` and `.generatedCount`.
  const createScheduleMutation = useMutation({
    mutationFn: async (input: CreateClassScheduleInput) => {
      const { data, error } = await client.POST(
        "/api/v1/logistics/schedules/",
        {
          body: input,
        },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules", classId] });
      // Sessions are now auto-generated by the backend on schedule create
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateClassScheduleInput;
    }) => {
      const { data, error } = await client.PATCH(
        "/api/v1/logistics/schedules/{id}",
        {
          params: { path: { id } },
          body: input,
        },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules", classId] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE(
        "/api/v1/logistics/schedules/{id}",
        {
          params: { path: { id } },
        },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules", classId] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });

  const previewScheduleUpdate = async (scheduleId: string) => {
    const { data, error } = await client.GET(
      "/api/v1/logistics/schedules/{id}/preview-update",
      {
        params: { path: { id: scheduleId } },
      },
    );
    if (error) throw error;
    return data?.data;
  };

  return {
    schedules: schedulesQuery.data ?? [],
    isLoading: schedulesQuery.isLoading,
    createSchedule: createScheduleMutation.mutateAsync,
    updateSchedule: updateScheduleMutation.mutateAsync,
    deleteSchedule: deleteScheduleMutation.mutateAsync,
    previewScheduleUpdate,
    isCreating: createScheduleMutation.isPending,
    isUpdating: updateScheduleMutation.isPending,
    isDeleting: deleteScheduleMutation.isPending,
  };
};
