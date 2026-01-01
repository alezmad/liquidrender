// Components
export { CommentThread } from "./components/comment-thread";
export { CommentItem } from "./components/comment-item";
export { CommentForm } from "./components/comment-form";

// Hooks
export {
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  type Comment,
  type CommentTargetType,
} from "./hooks/use-comments";
