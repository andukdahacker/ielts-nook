import { NoDataResponse } from "../../types/response";
import ClassService from "./class.service";
import { CreateClassInput } from "./dto/create_class.input";
import { CreateClassResponse } from "./dto/create_class.response";
import { DeleteClassInput } from "./dto/delete_class.input";
import { GetClassInput } from "./dto/get_class.input";
import { GetClassResponse } from "./dto/get_class.response";
import { GetClassListInput } from "./dto/get_class_list.input";
import { GetClassListResponse } from "./dto/get_class_list.response";
import { GetClassListByUserInput } from "./dto/get_class_list_by_user.input";
import { GetClassMemberInput } from "./dto/get_class_member.input";
import { GetClassMemberResponse } from "./dto/get_class_member.response";
import { UpdateClassInput } from "./dto/update_class.input";
import { UpdateClassResponse } from "./dto/update_class.response";

class ClassController {
  constructor(private readonly classService: ClassService) {}

  async getClassMember(
    input: GetClassMemberInput,
  ): Promise<GetClassMemberResponse> {
    const classMember = await this.classService.getClassMember(input);

    if (!classMember) {
      throw new Error("Cannot find class member");
    }

    return {
      data: {
        classMember: classMember,
        assignments: classMember.assignments.map((e) => {
          return {
            assignment: e,
            exercise: e.exercise,
            submission: e.submission,
          };
        }),
        user: classMember.user,
      },
      message: "Get class member successfully",
    };
  }

  async createClass(input: CreateClassInput): Promise<CreateClassResponse> {
    const klass = await this.classService.createClass(input);

    return {
      data: {
        class: klass,
      },
      message: "Created class successfully",
    };
  }

  async getClass(input: GetClassInput): Promise<GetClassResponse> {
    const klass = await this.classService.getClassById(input);

    if (!klass) {
      throw new Error("Class is not found");
    }

    const classMembers = klass.classMembers.map((classMember) => {
      return {
        user: classMember.user,
        assignments: classMember.assignments.map((assignment) => {
          return {
            assignment: assignment,
            submission: assignment.submission,
            exercise: assignment.exercise,
          };
        }),
      };
    });

    return {
      data: {
        class: klass,
        classMembers,
      },
      message: "Get class successfully",
    };
  }

  async updateClass(input: UpdateClassInput): Promise<UpdateClassResponse> {
    const klass = await this.classService.updateClass(input);

    return {
      data: {
        class: klass,
      },
      message: "Updated class successfully",
    };
  }

  async deleteClass(input: DeleteClassInput): Promise<NoDataResponse> {
    await this.classService.deleteClass(input);

    return {
      message: "Deleted class successfully",
    };
  }

  async getClassList(input: GetClassListInput): Promise<GetClassListResponse> {
    const klasses = await this.classService.getClassList(input);

    const transformed = klasses.map((e) => {
      return {
        class: e,
        members: e.classMembers.map((classMember) => classMember.user),
      };
    });

    if (klasses.length < input.take) {
      return {
        data: {
          nodes: transformed,
          pageInfo: {
            hasNextPage: false,
          },
        },
        message: "Get class list successfully",
      };
    }

    const cursor = klasses[klasses.length - 1]!.id;

    const nextCall = await this.classService.getClassList({ ...input, cursor });

    if (nextCall.length == 0) {
      return {
        data: {
          nodes: transformed,
          pageInfo: {
            hasNextPage: false,
          },
        },
        message: "Get class list successfully",
      };
    }

    return {
      data: {
        nodes: transformed,
        pageInfo: {
          hasNextPage: true,
          cursor,
        },
      },
      message: "Get class list successfully",
    };
  }

  async getClassListByUser(
    input: GetClassListByUserInput,
  ): Promise<GetClassListResponse> {
    const klasses = await this.classService.getClassListByUser(input);

    const transformed = klasses.map((e) => {
      return {
        class: e,
        members: e.classMembers.map((classMember) => classMember.user),
      };
    });

    if (klasses.length < input.take) {
      return {
        data: {
          nodes: transformed,
          pageInfo: {
            hasNextPage: false,
          },
        },
        message: "Get class list successfully",
      };
    }

    const cursor = klasses[klasses.length - 1]!.id;

    const nextCall = await this.classService.getClassListByUser({
      ...input,
      cursor,
    });

    if (nextCall.length == 0) {
      return {
        data: {
          nodes: transformed,
          pageInfo: {
            hasNextPage: false,
          },
        },
        message: "Get class list successfully",
      };
    }

    return {
      data: {
        nodes: transformed,
        pageInfo: {
          hasNextPage: true,
          cursor,
        },
      },
      message: "Get class list successfully",
    };
  }
}

export default ClassController;
