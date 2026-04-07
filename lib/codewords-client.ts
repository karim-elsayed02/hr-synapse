import { getUsersAction, createUserAction, updateUserAction } from "@/lib/actions/user-actions"
import { getTasksAction, createTaskAction, updateTaskAction } from "@/lib/actions/task-actions"
import { getRequestsAction, createRequestAction, updateRequestAction } from "@/lib/actions/request-actions"
import { getDocumentsAction } from "@/lib/actions/document-actions"
import {
  getAnnouncementsAction,
  createAnnouncementAction,
  markAnnouncementReadAction,
} from "@/lib/actions/announcement-actions"

// Main hook for using CodeWords API through secure server actions
// All API calls are handled server-side with no client-side environment variables
export const useCodeWords = () => {
  return {
    // User methods
    getUsers: getUsersAction,
    createUser: createUserAction,
    updateUser: updateUserAction,

    // Task methods
    getTasks: getTasksAction,
    createTask: createTaskAction,
    updateTask: updateTaskAction,

    // Request methods
    getRequests: getRequestsAction,
    createRequest: createRequestAction,
    updateRequest: updateRequestAction,

    // Document methods
    getDocuments: getDocumentsAction,

    // Announcement methods
    getAnnouncements: getAnnouncementsAction,
    createAnnouncement: createAnnouncementAction,
    markAnnouncementRead: markAnnouncementReadAction,
  }
}
