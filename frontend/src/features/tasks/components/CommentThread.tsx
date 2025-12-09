import { useState, useRef, useEffect } from 'react';
import { useCreateComment, useUpdateComment, useDeleteComment, useAddReaction, useRemoveReaction } from '../hooks/useTaskMutations';
import { useAuth } from '../../auth/context/AuthContext';
import { Trash2, Edit2, Smile, Quote, CornerDownRight } from 'lucide-react';
import { ConfirmationDialog } from '../../../components/common/ConfirmationDialog';
import { getSocket, joinTaskRoom, leaveTaskRoom } from '../../../services/socket';
import { useQueryClient } from '@tanstack/react-query';
import type { TaskComment } from '../../../services/tasks';

type CommentThreadProps = {
  taskId: number;
  comments: TaskComment[];
  onTaskClick?: (taskId: number) => void;
};

type CommentCardProps = {
  taskId: number;
  comment: TaskComment;
  allComments: TaskComment[]; // Needed for quote lookup
  onReply: (commentId: number) => void;
  onQuote: (commentId: number, content: string, user: string, parentId?: number) => void;
  activeReplyId: number | null;
  quotedComment?: QuotedComment | null;
  onClearQuote?: () => void;
  onCancelReply: () => void;
  isReply?: boolean;
  replyTrigger?: number; // Signal to force focus
  onTaskClick?: (taskId: number) => void;
};

// Interface for the quoted comment state
interface QuotedComment {
  id: number;
  content: string;
  author: string;
}

const COMMON_EMOJIS = ['👍', '👎', '❤️', '🎉', '🚀', '👀', '🔥'];

// Helper to look up a comment by ID (handles nested structure)
const findCommentById = (comments: TaskComment[], id: number): TaskComment | undefined => {
  for (const comment of comments) {
    if (comment.id === id) return comment;
    if (comment.replies) {
      const found = findCommentById(comment.replies, id);
      if (found) return found;
    }
  }
  return undefined;
};

function QuoteWidget({ comment, onClick }: { comment: TaskComment; onClick?: () => void }) {
  const userName = comment.createdByUser.name || comment.createdByUser.email;
  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-3 bg-gray-50 dark:bg-white/5 border-l-4 border-primary rounded-r-lg p-3 relative group mb-3 ${onClick ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-xs text-gray-900 dark:text-white">
            {userName}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(comment.createdAt).toLocaleString()}
          </span>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 italic">
          {comment.content.replace(/^\[\[quote:\d+\]\]\s*/, '')} {/* Strip nested quotes for display */}
        </div>
      </div>
    </div>
  );
}

function CommentContent({ content, allComments, onTaskClick }: { content: string; allComments: TaskComment[]; onTaskClick?: (taskId: number) => void }) {

  // Regex to check for [[quote:ID]] at the start
  const quoteMatch = content.match(/^\[\[quote:(\d+)\]\]\s*(.*)/s);

  let quotedCommentId: number | null = null;
  let displayContent = content;

  if (quoteMatch) {
    quotedCommentId = parseInt(quoteMatch[1]);
    displayContent = quoteMatch[2];
  }

  const quotedComment = quotedCommentId ? findCommentById(allComments, quotedCommentId) : undefined;

  const handleQuoteClick = () => {
    if (quotedCommentId) {
      const element = document.getElementById(`comment-${quotedCommentId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a temporary highlight class
        element.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-white', 'dark:ring-offset-[#1C252E]');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-white', 'dark:ring-offset-[#1C252E]');
        }, 2000);
      }
    }
  };

  // Remaining linkify logic
  const parts = displayContent.split(/(#\d+)/g);

  return (
    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap space-y-2">
      {quotedComment && (
        <QuoteWidget comment={quotedComment} onClick={handleQuoteClick} />
      )}
      {/* If looking for a quote that's missing (deleted/not loaded), maybe show small text? */}
      {quotedCommentId && !quotedComment && (
        <div className="text-xs text-gray-400 italic mb-2">
          Quoted message unavailable
        </div>
      )}

      <div>
        {parts.map((part, i) => {
          // Linkify task IDs logic
          if (part.match(/^#\d+$/)) {
            const taskId = part.substring(1);
            return (
              <button
                key={i}
                onClick={() => onTaskClick?.(parseInt(taskId))}
                className="text-primary hover:underline font-medium"
              >
                {part}
              </button>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
    </div>
  );
}

function CommentForm({
  taskId,
  parentId,
  onCancel,
  onSuccess,
  quotedComment,
  onClearQuote,
  placeholder,
  autoFocus,
  focusTrigger
}: {
  taskId: number,
  parentId?: number,
  onCancel?: () => void,
  onSuccess?: () => void,
  quotedComment?: QuotedComment | null,
  onClearQuote?: () => void,
  placeholder?: string,
  autoFocus?: boolean,
  focusTrigger?: number
}) {
  const [content, setContent] = useState('');
  const createComment = useCreateComment();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus logic
  useEffect(() => {
    if ((quotedComment || autoFocus) && textareaRef.current) {
      // Simple hack to ensure focus works even if already focused
      textareaRef.current.focus();
    }
  }, [quotedComment, autoFocus, focusTrigger]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim()) return;

    let finalContent = content;

    // Prepend quote reference tag
    if (quotedComment) {
      finalContent = `[[quote:${quotedComment.id}]]\n${content}`;
    }

    try {
      await createComment.mutateAsync({
        taskId,
        content: finalContent,
        parentId
      });
      setContent('');
      onClearQuote?.();
      onSuccess?.();
      // Reset height after submit
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'; // Reset to default
      }
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape' && onCancel) {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="space-y-3">
      {/* Quote Banner Preview */}
      {quotedComment && (
        <div className="flex items-start gap-3 bg-gray-50 dark:bg-white/5 border-l-4 border-primary rounded-r-lg p-3 relative group">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-xs text-gray-900 dark:text-white">
                {quotedComment.author}
              </span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 italic">
              {quotedComment.content}
            </div>
          </div>
          <button
            onClick={onClearQuote}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || (quotedComment ? "Type your message..." : "Write a comment...")}
            className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-700/50 rounded-lg bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-0 focus:ring-2 focus:ring-primary/50 resize-none overflow-hidden min-h-[44px]"
            rows={1}
          />
        </div>
        <div className="flex items-center gap-2 pb-1">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!content.trim() || createComment.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-50 transition-colors h-[40px]"
          >
            {createComment.isPending ? 'Posting...' : parentId ? 'Reply' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}

function CommentCard({
  taskId,
  comment,
  allComments,
  onReply,
  onQuote,
  activeReplyId,
  quotedComment,
  onClearQuote,
  onCancelReply,
  isReply = false,
  replyTrigger,
  onTaskClick
}: CommentCardProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRepliesExpanded, setIsRepliesExpanded] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();

  const isOwner = user?.id === comment.createdBy;
  const canEdit = isOwner;
  const canDelete = isOwner;
  const isReplying = activeReplyId === comment.id;
  const userName = comment.createdByUser.name || comment.createdByUser.email;

  // Auto-focus edit textarea when editing starts
  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.focus();
      // Move cursor to end of text
      const length = editTextareaRef.current.value.length;
      editTextareaRef.current.setSelectionRange(length, length);
    }
  }, [isEditing]);

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(comment.content);
  };

  const handleUpdate = async () => {
    if (!editContent.trim()) return;
    await updateComment.mutateAsync({
      taskId,
      commentId: comment.id,
      content: editContent,
    });
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleDelete = async () => {
    await deleteComment.mutateAsync({ taskId, commentId: comment.id });
    setDeleteConfirmOpen(false);
  };

  const handleReaction = async (emoji: string) => {
    const existingReaction = comment.reactions?.find(
      (r) => r.emoji === emoji && r.userId === user?.id
    );

    if (existingReaction) {
      await removeReaction.mutateAsync({ taskId, commentId: comment.id, emoji });
    } else {
      await addReaction.mutateAsync({ taskId, commentId: comment.id, emoji });
    }
    setShowEmojiPicker(false);
  };

  const groupedReactions = comment.reactions?.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, typeof comment.reactions>);

  return (
    <div
      id={`comment-${comment.id}`}
      className="flex gap-3 group transition-all duration-300 rounded-lg p-1 -m-1"
    >
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white flex items-center justify-center text-sm font-medium shadow-sm">
          {userName?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm text-gray-900 dark:text-white">
            {userName}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(comment.createdAt).toLocaleString(undefined, {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
            {comment.isEdited && ' (edited)'}
          </span>
        </div>

        <div className={`
          relative group-hover:bg-gray-50 dark:group-hover:bg-white/5 rounded-lg px-2 -ml-2 py-1 transition-colors
        `}>
          {isEditing ? (
            <div className="space-y-2 p-2">
              <textarea
                ref={editTextareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleEditKeyDown}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700/50 rounded-lg bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 resize-y"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleUpdate}
                  disabled={updateComment.isPending}
                  className="px-3 py-1 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="py-1">
                <CommentContent content={comment.content} allComments={allComments} onTaskClick={onTaskClick} />
              </div>

              {/* Actions that appear on hover */}
              <div className="absolute top-0 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-[#1C252E]/80 rounded-lg p-1 backdrop-blur-sm shadow-sm border border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => onQuote(comment.id, comment.content, userName, comment.parentId)}
                  className="p-1.5 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors rounded hover:bg-gray-100 dark:hover:bg-white/10"
                  title="Quote"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                {!isReply && (
                  <button
                    onClick={() => {
                      onReply(comment.id);
                      if (comment.replies && comment.replies.length > 0) {
                        setIsRepliesExpanded(true);
                      }
                    }}
                    className="p-1.5 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors rounded hover:bg-gray-100 dark:hover:bg-white/10"
                    title="Reply"
                  >
                    <CornerDownRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="relative">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1.5 text-gray-500 hover:text-yellow-500 dark:text-gray-400 dark:hover:text-yellow-500 transition-colors rounded hover:bg-gray-100 dark:hover:bg-white/10"
                    title="Add Reaction"
                  >
                    <Smile className="w-3.5 h-3.5" />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg shadow-lg p-2 flex gap-1 z-10 w-max">
                      {COMMON_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(emoji)}
                          className="w-7 h-7 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors text-lg flex items-center justify-center"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {canEdit && (
                  <>
                    <div className="w-px h-3 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-white/10"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => setDeleteConfirmOpen(true)}
                        className="p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded hover:bg-gray-100 dark:hover:bg-white/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Reactions List */}
        {groupedReactions && Object.keys(groupedReactions).length > 0 && (
          <div className="flex items-center gap-1.5 mt-1 pl-1">
            {Object.entries(groupedReactions).map(([emoji, reactions]) => {
              const hasReacted = reactions.some((r) => r.userId === user?.id);
              return (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full transition-colors border ${hasReacted
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'bg-transparent text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                >
                  <span>{emoji}</span>
                  {reactions.length > 1 && <span>{reactions.length}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Reply Count & Action */}
        <div className="mt-1 flex justify-end">
          {comment.replies && comment.replies.length > 0 ? (
            <button
              onClick={() => {
                const willExpand = !isRepliesExpanded;
                setIsRepliesExpanded(willExpand);
                if (!willExpand) {
                  onCancelReply(); // Clear any reply state if we're collapsing
                }
              }}
              className="group flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors mr-1"
            >
              <span className="text-[10px] opacity-70 group-hover:opacity-100 transition-opacity">
                {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-gray-400 group-hover:text-primary transition-colors"
                style={{ transform: `rotate(${isRepliesExpanded ? '180deg' : '0deg'}) transition: transform 0.2s` }}
              >
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : !isReply && (
            <button
              onClick={() => {
                onReply(comment.id);
                if (comment.replies && comment.replies.length > 0) {
                  setIsRepliesExpanded(true);
                }
              }}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Reply
            </button>
          )}
        </div>

        {/* Inline Reply Form (when replying to a specific comment) */}
        {isReplying && !isRepliesExpanded && (
          <div className="mt-3">
            <CommentForm
              taskId={taskId}
              parentId={comment.id}
              onCancel={onCancelReply}
              onSuccess={() => {
                onCancelReply();
                setIsRepliesExpanded(true);
              }}
              quotedComment={quotedComment}
              onClearQuote={onClearQuote}
              autoFocus // Always autofocus the inline editor
            />
          </div>
        )}

        {/* Replies List */}
        {isRepliesExpanded && comment.replies && (
          <div className="mt-3 space-y-4 pl-4 border-l-2 border-gray-100 dark:border-gray-800">
            {/* Discussion Style: Editor at Top */}
            <div className="pb-3 border-b border-gray-100 dark:border-gray-800/50 mb-3">
              <CommentForm
                taskId={taskId}
                parentId={comment.id}
                onSuccess={() => {
                  // Optional: scroll to bottom or just refresh
                }}
                quotedComment={activeReplyId === comment.id ? quotedComment : null}
                onClearQuote={onClearQuote}
                autoFocus={activeReplyId === comment.id} // Focus if this thread is the active reply target
                focusTrigger={replyTrigger}
              />
            </div>

            {comment.replies.map((reply) => (
              <CommentCard
                key={reply.id}
                taskId={taskId}
                comment={reply}
                allComments={allComments}
                onReply={onReply}
                onQuote={onQuote}
                activeReplyId={activeReplyId}
                quotedComment={null}
                onClearQuote={onClearQuote}
                onCancelReply={onCancelReply}
                isReply={true}
                onTaskClick={onTaskClick}
              />
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={handleDelete}
          title="Delete Comment"
          message="Are you sure you want to delete this comment? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          isLoading={deleteComment.isPending}
        />
      </div>
    </div>
  );
}

export function CommentThread({ taskId, comments, onTaskClick }: CommentThreadProps) {
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [quotedComment, setQuotedComment] = useState<QuotedComment | null>(null);
  const [replyTrigger, setReplyTrigger] = useState(0);
  const mainFormRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Join task room for real-time updates
  useEffect(() => {
    joinTaskRoom(taskId);
    
    const socket = getSocket();
    if (!socket) return;

    // Listen for comment created event
    const handleCommentCreated = (newComment: TaskComment) => {
      queryClient.setQueryData(['task', taskId], (oldData: any) => {
        if (!oldData) return oldData;
        
        // Add new comment to the task's comments array
        const updatedComments = [...(oldData.comments || []), newComment];
        return {
          ...oldData,
          comments: updatedComments,
        };
      });
    };

    // Listen for comment updated event
    const handleCommentUpdated = (updatedComment: TaskComment) => {
      queryClient.setQueryData(['task', taskId], (oldData: any) => {
        if (!oldData) return oldData;
        
        const updatedComments = (oldData.comments || []).map((c: TaskComment) => {
          if (c.id === updatedComment.id) {
            return updatedComment;
          }
          // Also update in replies if it's a reply
          if (c.replies) {
            const updatedReplies = c.replies.map((r: TaskComment) =>
              r.id === updatedComment.id ? updatedComment : r
            );
            return { ...c, replies: updatedReplies };
          }
          return c;
        });
        
        return {
          ...oldData,
          comments: updatedComments,
        };
      });
    };

    // Listen for comment deleted event
    const handleCommentDeleted = ({ commentId }: { commentId: number; taskId: number }) => {
      queryClient.setQueryData(['task', taskId], (oldData: any) => {
        if (!oldData) return oldData;
        
        const updatedComments = (oldData.comments || []).map((c: TaskComment) => {
          if (c.id === commentId) {
            return { ...c, deleted: true };
          }
          // Also mark deleted in replies if it's a reply
          if (c.replies) {
            const updatedReplies = c.replies.map((r: TaskComment) =>
              r.id === commentId ? { ...r, deleted: true } : r
            );
            return { ...c, replies: updatedReplies };
          }
          return c;
        });
        
        return {
          ...oldData,
          comments: updatedComments,
        };
      });
    };

    // Listen for reaction added event
    const handleReactionAdded = ({ commentId, reaction }: { commentId: number; taskId: number; reaction: any }) => {
      queryClient.setQueryData(['task', taskId], (oldData: any) => {
        if (!oldData) return oldData;
        
        const updatedComments = (oldData.comments || []).map((c: TaskComment) => {
          if (c.id === commentId) {
            const existingReactions = c.reactions || [];
            // Check if reaction already exists (avoid duplicates)
            const reactionExists = existingReactions.some(
              (r: any) => r.emoji === reaction.emoji && r.userId === reaction.userId
            );
            if (!reactionExists) {
              return { ...c, reactions: [...existingReactions, reaction] };
            }
          }
          // Also update in replies if it's a reply
          if (c.replies) {
            const updatedReplies = c.replies.map((r: TaskComment) => {
              if (r.id === commentId) {
                const existingReactions = r.reactions || [];
                const reactionExists = existingReactions.some(
                  (reac: any) => reac.emoji === reaction.emoji && reac.userId === reaction.userId
                );
                if (!reactionExists) {
                  return { ...r, reactions: [...existingReactions, reaction] };
                }
              }
              return r;
            });
            return { ...c, replies: updatedReplies };
          }
          return c;
        });
        
        return {
          ...oldData,
          comments: updatedComments,
        };
      });
    };

    // Listen for reaction removed event
    const handleReactionRemoved = ({ commentId, emoji, userId }: { commentId: number; taskId: number; emoji: string; userId: string }) => {
      queryClient.setQueryData(['task', taskId], (oldData: any) => {
        if (!oldData) return oldData;
        
        const updatedComments = (oldData.comments || []).map((c: TaskComment) => {
          if (c.id === commentId) {
            const updatedReactions = (c.reactions || []).filter(
              (r: any) => !(r.emoji === emoji && r.userId === userId)
            );
            return { ...c, reactions: updatedReactions };
          }
          // Also update in replies if it's a reply
          if (c.replies) {
            const updatedReplies = c.replies.map((r: TaskComment) => {
              if (r.id === commentId) {
                const updatedReactions = (r.reactions || []).filter(
                  (reac: any) => !(reac.emoji === emoji && reac.userId === userId)
                );
                return { ...r, reactions: updatedReactions };
              }
              return r;
            });
            return { ...c, replies: updatedReplies };
          }
          return c;
        });
        
        return {
          ...oldData,
          comments: updatedComments,
        };
      });
    };

    socket.on('comment:created', handleCommentCreated);
    socket.on('comment:updated', handleCommentUpdated);
    socket.on('comment:deleted', handleCommentDeleted);
    socket.on('reaction:added', handleReactionAdded);
    socket.on('reaction:removed', handleReactionRemoved);

    return () => {
      socket.off('comment:created', handleCommentCreated);
      socket.off('comment:updated', handleCommentUpdated);
      socket.off('comment:deleted', handleCommentDeleted);
      socket.off('reaction:added', handleReactionAdded);
      socket.off('reaction:removed', handleReactionRemoved);
      leaveTaskRoom(taskId);
    };
  }, [taskId, queryClient]);

  // Process comments: filter top-level, sort them, and sort their replies (immutably)
  const sortedComments = [...comments]
    .filter((c) => !c.parentId && !c.deleted)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(comment => ({
      ...comment,
      replies: comment.replies
        ? [...comment.replies]
          .filter(r => !r.deleted)
          // Sort replies DESCENDING (Newest First) per user request
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : []
    }));

  const handleReply = (commentId: number) => {
    setActiveReplyId(commentId);
    setQuotedComment(null);
    setReplyTrigger(prev => prev + 1); // Trigger focus
  };

  const handleQuote = (commentId: number, content: string, user: string, parentId?: number) => {
    // Strip any existing quote tag from the content to prevent nesting clutter
    const cleanContent = content.replace(/^\[\[quote:\d+\]\]\s*/, '').trim();

    // If it's a quote from a reply (has parentId), we want to reply to THAT thread.
    // So we set activeReplyId to the parentId.
    if (parentId) {
      setActiveReplyId(parentId);
      setQuotedComment({ id: commentId, content: cleanContent, author: user });
      setReplyTrigger(prev => prev + 1); // Trigger focus
      // We don't scroll to main form here; the specific card's form will render and focus.
    } else {
      // If it's a top-level comment (no parentId), we treat it as a new thread (top-level).
      setActiveReplyId(null);
      setQuotedComment({ id: commentId, content: cleanContent, author: user });
      // Scroll to the main form
      if (mainFormRef.current) {
        mainFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          Discussion
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
            {comments.filter(c => !c.deleted).length}
          </span>
        </h3>
      </div>

      {/* Main Comment Form (New Thread) - Only receives quote if activeReplyId is null */}
      <div ref={mainFormRef} className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-4 shadow-sm scroll-mt-20">
        <CommentForm
          taskId={taskId}
          quotedComment={activeReplyId === null ? quotedComment : null}
          onClearQuote={() => setQuotedComment(null)}
        />
      </div>

      {/* Comments List */}
      <div className="space-y-6">
        {sortedComments.length > 0 ? (
          sortedComments.map((comment) => (
            <CommentCard
              key={comment.id}
              taskId={taskId}
              comment={comment}
              allComments={comments}
              onReply={handleReply}
              onQuote={handleQuote}
              activeReplyId={activeReplyId}
              // If activeReplyId matches this comment, it gets the quote (for its reply form).
              quotedComment={activeReplyId === comment.id ? quotedComment : null}
              onClearQuote={() => setQuotedComment(null)}
              onCancelReply={() => {
                setActiveReplyId(null);
                setQuotedComment(null);
              }}
              replyTrigger={replyTrigger}
              onTaskClick={onTaskClick}
            />
          ))
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8 italic">
            No comments yet. Start the conversation!
          </p>
        )}
      </div>
    </div>
  );
}
