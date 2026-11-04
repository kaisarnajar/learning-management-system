"use client";

import { useState, useTransition } from "react";
import { Heart, MessageCircle, Share2, MoreVertical, Edit2, Trash2, User as UserIcon } from "lucide-react";
import Image from "next/image";
import { toggleLike, addComment, deleteComment, editComment, loadMoreComments } from "./actions";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { useToast } from "@/components/shared/ToastProvider";

type User = {
  name: string | null;
  image: string | null;
};

type Comment = {
  id: string;
  content: string;
  createdAt: Date;
  userId: string;
  user: User;
};

type BlogEngagementProps = {
  blogPostId: string;
  initialLikeCount: number;
  initialHasLiked: boolean;
  initialComments: Comment[];
  /** Total comment count on the post; more than initialComments.length means more pages. */
  totalComments: number;
  currentUserId?: string;
  isAdmin: boolean;
};

export function BlogEngagement({
  blogPostId,
  initialLikeCount,
  initialHasLiked,
  initialComments,
  totalComments,
  currentUserId,
  isAdmin,
}: BlogEngagementProps) {
  const { addToast } = useToast();
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [hasLiked, setHasLiked] = useState(initialHasLiked);
  const [isPendingLike, startTransitionLike] = useTransition();

  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [commentTotal, setCommentTotal] = useState(totalComments);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  async function handleLoadMore() {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await loadMoreComments(blogPostId, comments.length);
      if (res.error || !res.comments) {
        addToast(res.error ?? "Failed to load comments", "error");
        return;
      }
      const known = new Set(comments.map((c) => c.id));
      const fresh = res.comments.filter((c) => !known.has(c.id));
      setComments((prev) => [...prev, ...fresh]);
      if (fresh.length === 0) setCommentTotal(comments.length);
    } finally {
      setIsLoadingMore(false);
    }
  }
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState("");

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const handleLike = () => {
    if (!currentUserId) {
      window.location.href = `/login?callbackUrl=/blog/${blogPostId}`;
      return;
    }

    setHasLiked(!hasLiked);
    setLikeCount(hasLiked ? likeCount - 1 : likeCount + 1);

    startTransitionLike(async () => {
      const res = await toggleLike(blogPostId);
      if (res?.error) {
        setHasLiked(hasLiked);
        setLikeCount(hasLiked ? likeCount : likeCount - 1);
        addToast(res.error, "error");
      }
    });
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          url,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        addToast("Link copied to clipboard.", "success");
      } catch {
        addToast("Could not copy the link.", "error");
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) {
      window.location.href = `/login?callbackUrl=/blog/${blogPostId}`;
      return;
    }

    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    setCommentError("");

    const res = await addComment(blogPostId, newComment);
    setIsSubmittingComment(false);

    if (res?.error) {
      setCommentError(res.error);
    } else if (res?.comment) {
      setComments([res.comment as unknown as Comment, ...comments]);
      setCommentTotal((total) => total + 1);
      setNewComment("");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setOpenMenuId(null);
    const originalComments = [...comments];
    setComments(comments.filter((c) => c.id !== commentId));
    setCommentTotal((total) => Math.max(0, total - 1));

    const res = await deleteComment(commentId);
    if (res?.error) {
      setComments(originalComments);
      addToast(res.error, "error");
    }
  };

  const startEditComment = (comment: Comment) => {
    setOpenMenuId(null);
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    const originalComments = [...comments];
    setComments(
      comments.map((c) =>
        c.id === commentId ? { ...c, content: editContent.trim() } : c
      )
    );
    setEditingCommentId(null);

    const res = await editComment(commentId, editContent);
    if (res?.error) {
      setComments(originalComments);
      addToast(res.error, "error");
    }
  };

  const toggleMenu = (commentId: string) => {
    setOpenMenuId(openMenuId === commentId ? null : commentId);
  };

  return (
    <div className="mt-12 border-t border-border pt-8">
      {/* Action Buttons */}
      <div className="flex items-center space-x-6 mb-10">
        <button
          onClick={handleLike}
          disabled={isPendingLike}
          className={`flex items-center space-x-2 text-sm font-medium transition-colors ${
            hasLiked ? "text-red-500 hover:text-red-600" : "text-muted hover:text-foreground"
          }`}
        >
          <Heart className={`h-5 w-5 ${hasLiked ? "fill-current" : ""}`} />
          <span>{likeCount} {likeCount === 1 ? "Like" : "Likes"}</span>
        </button>

        <div className="flex items-center space-x-2 text-sm font-medium text-muted">
          <MessageCircle className="h-5 w-5" />
          <span>{commentTotal} {commentTotal === 1 ? "Comment" : "Comments"}</span>
        </div>

        <button
          onClick={handleShare}
          className="flex items-center space-x-2 text-sm font-medium text-muted hover:text-foreground transition-colors ml-auto"
        >
          <Share2 className="h-5 w-5" />
          <span>Share</span>
        </button>
      </div>

      {/* Comment Section */}
      <div className="space-y-8">
        <h3 className="text-xl font-semibold text-foreground">Comments</h3>

        {/* Comment Form */}
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              <UserIcon className="h-6 w-6 text-foreground/50" />
            </div>
          </div>
          <form onSubmit={handleAddComment} className="flex-1">
            <textarea maxLength={2000}
              aria-label="Add a comment"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={currentUserId ? "Add a comment..." : "Sign in to add a comment..."}
              disabled={isSubmittingComment}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold min-h-[80px]"
            />
            {commentError && <p className="mt-1 text-sm text-red-500">{commentError}</p>}
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingComment || !newComment.trim()}
                className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-white hover:bg-gold/90 focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-50"
              >
                {isSubmittingComment ? "Posting..." : "Post Comment"}
              </button>
            </div>
          </form>
        </div>

        {/* Comment List */}
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} id={`comment-${comment.id}`} className="flex items-start space-x-4 scroll-mt-24">
              <div className="flex-shrink-0">
                {comment.user.image ? (
                  <Image
                    src={comment.user.image}
                    alt={comment.user.name || "User"}
                    width={40}
                    height={40}
                    className="rounded-full object-cover h-10 w-10"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium text-foreground uppercase">
                      {comment.user.name?.charAt(0) || "?"}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-foreground">
                      {comment.user.name || "User"}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(comment.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Menu for edit/delete */}
                  {(comment.userId === currentUserId || isAdmin) && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => toggleMenu(comment.id)}
                        aria-label="Comment actions"
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === comment.id}
                        className="p-1 text-muted hover:text-foreground rounded-full hover:bg-muted/50"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {openMenuId === comment.id && (
                        <div className="absolute right-0 top-full mt-1 w-32 rounded-md border border-border bg-background shadow-lg z-10 py-1">
                          {comment.userId === currentUserId && (
                            <button
                              onClick={() => startEditComment(comment)}
                              className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-muted"
                            >
                              <Edit2 className="mr-2 h-4 w-4" /> Edit
                            </button>
                          )}
                          <ConfirmationModal
                            title="Delete comment"
                            description="Are you sure you want to delete this comment? This cannot be undone."
                            actionLabel="Delete"
                            onConfirm={() => handleDeleteComment(comment.id)}
                            trigger={
                              <button
                                type="button"
                                className="flex w-full items-center px-4 py-2 text-sm text-red-500 hover:bg-red-500/10"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </button>
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {editingCommentId === comment.id ? (
                  <div className="mt-2">
                    <textarea maxLength={2000}
                      aria-label="Edit comment"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold min-h-[60px]"
                    />
                    <div className="mt-2 flex justify-end space-x-2">
                      <button
                        onClick={() => setEditingCommentId(null)}
                        className="rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground hover:bg-muted/50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(comment.id)}
                        disabled={!editContent.trim()}
                        className="rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-white hover:bg-gold/90 disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">{comment.content}</p>
                )}
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-sm text-muted text-center py-4">No comments yet. Be the first to share your thoughts!</p>
          )}
          {comments.length < commentTotal && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent-muted/40 disabled:opacity-60"
              >
                {isLoadingMore ? "Loading…" : `Load more comments (${commentTotal - comments.length} more)`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
