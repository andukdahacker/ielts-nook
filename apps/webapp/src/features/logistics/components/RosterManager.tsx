import client from "@/core/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Loader2, Search, UserMinus, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRoster } from "../hooks/use-logistics";

interface RosterManagerProps {
  classId: string;
  centerId: string;
}

export function RosterManager({ classId, centerId }: RosterManagerProps) {
  const {
    roster,
    isLoading: isRosterLoading,
    addStudent,
    removeStudent,
  } = useRoster(classId, centerId);
  const [search, setSearch] = useState("");

  const availableStudentsQuery = useQuery({
    queryKey: ["available-students", centerId, search],
    queryFn: async () => {
      const { data, error } = await client.GET(
        "/api/v1/logistics/classes/available-students",
        {
          params: { query: { search } },
        },
      );
      if (error) throw error;
      return data.data;
    },
    enabled: !!centerId,
  });

  const handleAdd = async (studentId: string) => {
    try {
      await addStudent({ studentId });
      toast.success("Student added to class");
    } catch {
      toast.error("Failed to add student");
    }
  };

  const handleRemove = async (studentId: string) => {
    try {
      await removeStudent(studentId);
      toast.success("Student removed from class");
    } catch {
      toast.error("Failed to remove student");
    }
  };

  const isStudentInClass = (studentId: string) => {
    return roster.some((item) => item.studentId === studentId);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Class Roster</h3>
            <Badge variant="secondary">{roster.length} Students</Badge>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isRosterLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      <Loader2 className="mx-auto size-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : roster.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No students in this class.
                    </TableCell>
                  </TableRow>
                ) : (
                  roster.map((item) => (
                    <TableRow key={item.studentId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {item.student?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.student?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleRemove(item.studentId)}
                        >
                          <UserMinus className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Add Students</h3>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableStudentsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      <Loader2 className="mx-auto size-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : (availableStudentsQuery.data || []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No students found.
                    </TableCell>
                  </TableRow>
                ) : (
                  availableStudentsQuery.data?.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {student.name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {student.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isStudentInClass(student.id)}
                          onClick={() => handleAdd(student.id)}
                        >
                          <UserPlus className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
