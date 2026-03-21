import React, { useState, useCallback } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, Trash2 } from 'lucide-react';

export interface CommentData {
  id: string;
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  isLiked?: boolean;
  replies?: CommentData[];
  isOwner?: boolean;
  isSystem?: boolean;
}

interface CommentSectionProps {
  comments: CommentData[];
  onAddComment: (content: string) => void;
  onLike: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  currentUserId: string;
  currentUserName: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  comments,
  onAddComment,
  onLike,
  onDelete,
  currentUserId,
  currentUserName,
}) => {
  const [commentText, setCommentText] = useState('');

  const handleAddComment = useCallback(() => {
    if (commentText.trim()) {
      onAddComment(commentText);
      setCommentText('');
    }
  }, [commentText, onAddComment]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleAddComment();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src="https://github.com/shadcn.png" alt={currentUserName} />
          <AvatarFallback>{currentUserName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <Button onClick={handleAddComment}>Post</Button>
      </div>

      <div>
        {comments.map((comment) => (
          <Comment
            key={comment.id}
            comment={comment}
            onLike={onLike}
            onDelete={onDelete}
            isOwner={comment.user.id === currentUserId}
          />
        ))}
      </div>
    </div>
  );
};

interface CommentProps {
  comment: CommentData;
  onLike: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  isOwner: boolean;
}

const Comment: React.FC<CommentProps> = ({ comment, onLike, onDelete, isOwner }) => {
  const [isLiked, setIsLiked] = useState(comment.isLiked || false);

  const handleLike = () => {
    onLike(comment.id);
    setIsLiked(!isLiked);
  };

  return (
    <div className={`mb-4 ${comment.isSystem ? 'system-message' : ''}`}>
      <div className="flex items-start space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.user.avatarUrl || "https://github.com/shadcn.png"} alt={comment.user.name} />
          <AvatarFallback className="bg-brand-purple text-white">{comment.user.name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="space-y-1">
            <div className="text-sm font-bold">{comment.user.name}</div>
            <p className="text-sm text-gray-800">{comment.content}</p>
          </div>
          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
            <span>{new Date(comment.timestamp).toLocaleDateString()}</span>
            <button className="flex items-center space-x-1 hover:text-gray-700" onClick={handleLike}>
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              <span>{comment.likes} Likes</span>
            </button>
            {isOwner && (
              <button className="flex items-center space-x-1 hover:text-gray-700" onClick={() => onDelete(comment.id)}>
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentSection;
