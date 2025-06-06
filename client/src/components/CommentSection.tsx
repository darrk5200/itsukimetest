import React, { useState, FormEvent, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  getUserName, setUserName, getUserAvatar, setUserAvatar,
  canComment
} from '@/lib/storage';
import { Heart, Trash2, MessageSquare, Check, ChevronDown, Clock, ThumbsUp, Timer } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Import avatar images
import icon01 from '@/assets/icon_01.png';
import icon02 from '@/assets/icon_02.png';
import icon03 from '@/assets/icon_03.png';
import icon04 from '@/assets/icon_04.png';
import icon05 from '@/assets/icon_05.png';
import icon06 from '@/assets/icon_06.png';

interface CommentSectionProps {
  animeId: number;
  episodeId: number;
  className?: string;
}

interface Comment {
  id: string;
  animeId: number;
  episodeId: number;
  userName: string;
  userAvatar?: string;
  text: string;
  timestamp: string;
  likes: number;
  parentId?: string;
  isReply?: boolean;
  replies?: Comment[];
}

interface PaginationData {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

interface CommentResponse {
  comments: Comment[];
  pagination: PaginationData;
}

// Helper function to get avatar image based on avatar name
const getAvatarImage = (avatarName: string = 'icon_01') => {
  switch(avatarName) {
    case 'icon_01': return icon01;
    case 'icon_02': return icon02;
    case 'icon_03': return icon03;
    case 'icon_04': return icon04;
    case 'icon_05': return icon05;
    case 'icon_06': return icon06;
    default: return icon01;
  }
};

function CommentSectionComponent({ animeId, episodeId, className }: CommentSectionProps) {
  const [commentText, setCommentText] = useState('');
  const [userName, setUsernameState] = useState(getUserName() || '');
  const [userAvatar, setUserAvatarState] = useState(getUserAvatar());
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false); // Don't show on initial load
  const [tempUserName, setTempUserName] = useState(getUserName() || '');
  const [tempUserAvatar, setTempUserAvatar] = useState(getUserAvatar());
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'recent' | 'likes'>('recent');
  const [userLikedComments, setUserLikedComments] = useState<Record<string, boolean>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  
  // Comment cooldown state
  const [commentCooldown, setCommentCooldown] = useState(() => canComment());
  const [remainingTime, setRemainingTime] = useState(commentCooldown.remainingSeconds);
  
  // Update cooldown timer every second
  useEffect(() => {
    if (!commentCooldown.allowed) {
      const timer = setInterval(() => {
        const currentCooldown = canComment();
        setCommentCooldown(currentCooldown);
        setRemainingTime(currentCooldown.remainingSeconds);
        
        if (currentCooldown.allowed) {
          clearInterval(timer);
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [commentCooldown.allowed]);
  
  const queryClient = useQueryClient();

  // Fetch comments from the API with pagination and sorting
  const { data: commentResponse, isLoading } = useQuery<CommentResponse>({
    queryKey: [`/api/comments/${animeId}/${episodeId}`, { page, sort: sortOrder }],
    queryFn: async () => {
      const response = await apiRequest(
        `/api/comments/${animeId}/${episodeId}?page=${page}&limit=5&sort=${sortOrder}`
      );
      return response.json();
    },
    staleTime: 30000, // 30 seconds
  });
  
  // Extract comments and pagination data
  const comments = commentResponse?.comments || [];
  const pagination = commentResponse?.pagination || { 
    page: 1, 
    limit: 10, 
    totalCount: 0, 
    totalPages: 1, 
    hasMore: false 
  };
  
  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (newComment: { animeId: number; episodeId: number; userName: string; userAvatar?: string; text: string }) => {
      const response = await apiRequest(`/api/comments`, {
        method: 'POST',
        body: JSON.stringify(newComment),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the comments query to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/comments/${animeId}/${episodeId}`] });
    },
  });
  
  // Check if user has liked a comment
  const { data: likedStatusMap = {} } = useQuery<Record<string, boolean>>({
    queryKey: [`/api/comments/${animeId}/${episodeId}/likes`, userName],
    queryFn: async () => {
      if (!comments.length || !userName) return {};
      
      const result: Record<string, boolean> = {};
      
      // For each comment, check if the user has liked it
      for (const comment of comments) {
        try {
          const response = await apiRequest(`/api/comments/${comment.id}/like?userId=${encodeURIComponent(userName)}`);
          const data = await response.json();
          result[comment.id] = data.hasLiked;
        } catch (error) {
          console.error(`Error checking like status for comment ${comment.id}:`, error);
          result[comment.id] = false;
        }
      }
      
      return result;
    },
    enabled: comments.length > 0 && !!userName,
    staleTime: 60000, // 1 minute
  });
  
  // Like/unlike comment mutation
  const likeCommentMutation = useMutation({
    mutationFn: async ({ commentId, isUnlike = false }: { commentId: string, isUnlike?: boolean }) => {
      // If unliking, add a query parameter
      const endpoint = isUnlike 
        ? `/api/comments/${commentId}/unlike` 
        : `/api/comments/${commentId}/like`;
      
      const response = await apiRequest(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userName }),
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      const { commentId, isUnlike } = variables;
      
      // Update UI state immediately
      queryClient.setQueryData(
        [`/api/comments/${animeId}/${episodeId}/likes`, userName],
        (oldData: Record<string, boolean> = {}) => {
          return {
            ...oldData,
            [commentId]: !isUnlike  // Set the liked status based on the action
          };
        }
      );
      
      // Then invalidate the queries to get fresh data
      queryClient.invalidateQueries({ queryKey: [`/api/comments/${animeId}/${episodeId}`] });
    },
  });
  
  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await apiRequest(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/comments/${animeId}/${episodeId}`] });
    },
  });
  
  // Add reply mutation
  const addReplyMutation = useMutation({
    mutationFn: async ({ commentId, text }: { commentId: string, text: string }) => {
      const response = await apiRequest(`/api/comments/${commentId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          animeId,
          episodeId,
          userName,
          userAvatar,
          text,
          parentId: commentId,
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      // Clear reply text and replyingTo state after successful reply
      setReplyText('');
      setReplyingTo(null);
      
      // Invalidate the comments query to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/comments/${animeId}/${episodeId}`] });
    },
  });

  // Handle comment submission
  const handleSubmitComment = (e: FormEvent) => {
    e.preventDefault();
    
    if (!commentText.trim()) return;
    
    // Check for comment cooldown
    const cooldownStatus = canComment();
    setCommentCooldown(cooldownStatus);
    setRemainingTime(cooldownStatus.remainingSeconds);
    
    // Don't proceed if on cooldown
    if (!cooldownStatus.allowed) {
      return;
    }
    
    // If user hasn't set their name, open the dialog
    if (!userName) {
      setIsNameDialogOpen(true);
      return;
    }
    
    // Add the comment using the mutation
    addCommentMutation.mutate({
      animeId,
      episodeId,
      userName,
      userAvatar, // Include user avatar
      text: commentText,
    });
    
    // Clear the comment text field
    setCommentText('');
  };

  // Handle like/unlike
  const handleLike = (commentId: string, isLiked: boolean) => {
    likeCommentMutation.mutate({ 
      commentId, 
      isUnlike: isLiked // If already liked, then we're unliking
    });
  };

  // Handle delete
  const handleDelete = (commentId: string) => {
    deleteCommentMutation.mutate(commentId);
  };
  
  // Handle toggling reply form visibility
  const handleToggleReply = (commentId: string) => {
    if (replyingTo === commentId) {
      // Close reply form if clicking on the same comment
      setReplyingTo(null);
      setReplyText('');
    } else {
      // Open reply form for this comment
      setReplyingTo(commentId);
      setReplyText('');
    }
  };
  
  // Handle submitting a reply
  const handleSubmitReply = (e: FormEvent, commentId: string) => {
    e.preventDefault();
    
    if (!replyText.trim()) return;
    
    // Check for comment cooldown
    const cooldownStatus = canComment();
    setCommentCooldown(cooldownStatus);
    setRemainingTime(cooldownStatus.remainingSeconds);
    
    // Don't proceed if on cooldown
    if (!cooldownStatus.allowed) {
      return;
    }
    
    // If user hasn't set their name, open the dialog
    if (!userName) {
      setIsNameDialogOpen(true);
      return;
    }
    
    // Add the reply using the mutation
    addReplyMutation.mutate({
      commentId,
      text: replyText,
    });
  };

  // Handle save username and avatar
  const handleSaveUserName = () => {
    if (tempUserName.trim()) {
      // Save username
      setUserName(tempUserName);
      setUsernameState(tempUserName);
      
      // Save avatar
      setUserAvatar(tempUserAvatar);
      setUserAvatarState(tempUserAvatar);
      
      setIsNameDialogOpen(false);
      
      // No longer automatically submitting comments when creating a profile
      // This prevents unwanted comment posting when just setting up a profile
    }
  };

  // Load more comments handler
  const handleLoadMore = () => {
    if (pagination.hasMore) {
      setPage(prevPage => prevPage + 1);
      // Load 10 more comments
      queryClient.fetchQuery({
        queryKey: [`/api/comments/${animeId}/${episodeId}`, { page: page + 1, sort: sortOrder }],
        queryFn: async () => {
          const response = await apiRequest(
            `/api/comments/${animeId}/${episodeId}?page=${page + 1}&limit=10&sort=${sortOrder}`
          );
          return response.json();
        }
      });
    }
  };
  
  // Change sort order handler
  const handleSortChange = (newSortOrder: 'recent' | 'likes') => {
    if (sortOrder !== newSortOrder) {
      setSortOrder(newSortOrder);
      setPage(1); // Reset to first page when changing sort order
    }
  };

  return (
    <div className={className}>
      {/* Comments header - responsive layout */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-2">
        <h2 className="text-xl font-bold flex items-center">
          <MessageSquare className="mr-2 h-5 w-5" />
          Comments ({pagination.totalCount})
        </h2>
        
        {/* Sort controls - stacks on mobile, inline on desktop */}
        <div className="flex items-center gap-2 mt-2 md:mt-0">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <div className="flex gap-1">
            <Button
              variant={sortOrder === 'recent' ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleSortChange('recent')}
              className="h-8 px-3"
            >
              <Clock className="h-4 w-4 mr-1" />
              Newest
            </Button>
            <Button
              variant={sortOrder === 'likes' ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleSortChange('likes')}
              className="h-8 px-3"
            >
              <ThumbsUp className="h-4 w-4 mr-1" />
              Most Liked
            </Button>
          </div>
        </div>
      </div>
      
      {/* Comment form */}
      <form onSubmit={handleSubmitComment} className="mb-6">
        <div className="space-y-2">
          <Textarea 
            placeholder="Share your thoughts about this episode..."
            value={commentText}
            onChange={(e) => {
              // Update comment text with max length of 600
              setCommentText(e.target.value.slice(0, 600));
              
              // If user starts typing and doesn't have a username, show profile dialog
              if (e.target.value.trim() !== '' && !userName) {
                setIsNameDialogOpen(true);
              }
            }}
            className="mb-1 border-2 border-blue-400 focus-visible:ring-1 focus-visible:ring-blue-500"
            disabled={addCommentMutation.isPending || !commentCooldown.allowed}
            maxLength={600}
          />
          <div className="text-xs text-right text-muted-foreground">
            {commentText.length}/600 characters
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          {/* Cooldown message */}
          {!commentCooldown.allowed && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center text-sm text-yellow-500">
                    <Timer className="h-4 w-4 mr-1" />
                    <span>
                      Please wait {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')} before commenting again
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>You can comment once every 5 minutes</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <div className={!commentCooldown.allowed ? 'ml-auto' : ''}>
            <Button 
              type="submit" 
              disabled={addCommentMutation.isPending || !commentCooldown.allowed}
            >
              {addCommentMutation.isPending ? "Posting..." : "Post Comment"}
            </Button>
          </div>
        </div>
      </form>
      
      {/* Comments list */}
      <div className="space-y-4">
        {isLoading ? (
          // Loading state
          <Card>
            <CardContent className="p-4 text-center text-muted-foreground">
              Loading comments...
            </CardContent>
          </Card>
        ) : comments.length === 0 ? (
          // Empty state
          <Card>
            <CardContent className="p-4 text-center text-muted-foreground">
              Be the first to comment on this episode!
            </CardContent>
          </Card>
        ) : (
          // Comments list
          <>
            {comments.map(comment => {
              const hasLiked = likedStatusMap[comment.id] || false;
              
              return (
                <Card key={comment.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        {/* User avatar */}
                        <Avatar className="h-10 w-10 border">
                          <AvatarImage 
                            src={getAvatarImage(comment.userAvatar)} 
                            alt={comment.userName}
                          />
                          <AvatarFallback>{comment.userName.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        
                        <div>
                          <div className="font-medium">{comment.userName}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(comment.timestamp), 'MMM d, yyyy h:mm a')}
                          </div>
                        </div>
                      </div>
                      
                      {comment.userName === userName && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(comment.id)}
                          className="h-8 w-8 p-0"
                          disabled={deleteCommentMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      )}
                    </div>
                    
                    <p className="my-3">{comment.text}</p>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant={hasLiked ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => handleLike(comment.id, hasLiked)}
                        className={`h-8 px-2 ${hasLiked ? 'text-sky-400' : 'text-muted-foreground hover:text-sky-400'}`}
                        disabled={likeCommentMutation.isPending}
                        title={hasLiked ? "Click to unlike this comment" : "Like this comment"}
                      >
                        <Heart className={`h-4 w-4 mr-1 ${hasLiked ? 'fill-sky-400' : ''}`} />
                        {comment.likes}
                      </Button>
                      
                      <Button
                        variant={replyingTo === comment.id ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => handleToggleReply(comment.id)}
                        className="h-8 px-2 text-muted-foreground hover:text-primary"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Reply
                      </Button>
                    </div>
                    
                    {/* Reply form */}
                    {replyingTo === comment.id && (
                      <div className="mt-3 pl-8 border-l-2 border-muted">
                        <form onSubmit={(e) => handleSubmitReply(e, comment.id)} className="space-y-2">
                          <Textarea
                            placeholder={`Reply to ${comment.userName}...`}
                            value={replyText}
                            onChange={(e) => {
                              // Update reply text with max length of 300
                              setReplyText(e.target.value.slice(0, 300));
                              
                              // If user starts typing and doesn't have a username, show profile dialog
                              if (e.target.value.trim() !== '' && !userName) {
                                setIsNameDialogOpen(true);
                              }
                            }}
                            className="mb-1 text-sm border-2 border-blue-400 focus-visible:ring-1 focus-visible:ring-blue-500"
                            disabled={addReplyMutation.isPending || !commentCooldown.allowed}
                            maxLength={300}
                          />
                          <div className="text-xs text-right text-muted-foreground">
                            {replyText.length}/300 characters
                          </div>
                          <div className="flex justify-between items-center">
                            {!commentCooldown.allowed && (
                              <div className="flex items-center text-xs text-yellow-500">
                                <Timer className="h-3 w-3 mr-1" />
                                <span>
                                  Please wait {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')} before commenting again
                                </span>
                              </div>
                            )}
                            <div className="flex gap-2 ml-auto">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyText('');
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                size="sm"
                                disabled={addReplyMutation.isPending || !commentCooldown.allowed || !replyText.trim()}
                              >
                                {addReplyMutation.isPending ? "Posting..." : "Post Reply"}
                              </Button>
                            </div>
                          </div>
                        </form>
                      </div>
                    )}
                    
                    {/* Render replies if any exist */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-4 pl-8 space-y-3 border-l-2 border-muted">
                        {comment.replies.map(reply => {
                          const hasLikedReply = likedStatusMap[reply.id] || false;
                          
                          return (
                            <div key={reply.id} className="relative">
                              <div className="flex justify-between items-start">
                                <div className="flex items-start gap-3">
                                  {/* Reply user avatar */}
                                  <Avatar className="h-8 w-8 border">
                                    <AvatarImage 
                                      src={getAvatarImage(reply.userAvatar)} 
                                      alt={reply.userName}
                                    />
                                    <AvatarFallback>{reply.userName.charAt(0).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  
                                  <div>
                                    <div className="font-medium text-sm">{reply.userName}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {format(new Date(reply.timestamp), 'MMM d, yyyy h:mm a')}
                                    </div>
                                  </div>
                                </div>
                                
                                {reply.userName === userName && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(reply.id)}
                                    className="h-7 w-7 p-0"
                                    disabled={deleteCommentMutation.isPending}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                )}
                              </div>
                              
                              <p className="my-2 text-sm">{reply.text}</p>
                              
                              <div className="flex items-center gap-1">
                                <Button
                                  variant={hasLikedReply ? "secondary" : "ghost"}
                                  size="sm"
                                  onClick={() => handleLike(reply.id, hasLikedReply)}
                                  className={`h-6 px-2 text-xs ${hasLikedReply ? 'text-sky-400' : 'text-muted-foreground hover:text-sky-400'}`}
                                  disabled={likeCommentMutation.isPending}
                                  title={hasLikedReply ? "Click to unlike this reply" : "Like this reply"}
                                >
                                  <Heart className={`h-3 w-3 mr-1 ${hasLikedReply ? 'fill-sky-400' : ''}`} />
                                  {reply.likes}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            
            {/* Load more button */}
            {pagination.hasMore && (
              <div className="flex justify-center mt-6">
                <Button 
                  variant="outline" 
                  onClick={handleLoadMore} 
                  className="w-full md:w-auto"
                >
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Load More Comments
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Username and avatar dialog */}
      <Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Your Profile</DialogTitle>
            <DialogDescription>
              Choose a display name and avatar to use with your comments.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Display name input */}
            <div>
              <Label htmlFor="name" className="text-right">
                Your Name <span className="text-xs text-muted-foreground">(max 16 characters, letters and numbers only)</span>
              </Label>
              <Input
                id="name"
                value={tempUserName}
                onChange={(e) => {
                  // Only allow letters and numbers, max 16 characters
                  const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
                  setTempUserName(value);
                }}
                placeholder="Enter your display name"
                className="mt-2"
                maxLength={16}
              />
            </div>
            
            {/* Avatar selection */}
            <div>
              <Label className="text-right mb-2 block">
                Choose Avatar
              </Label>
              
              <RadioGroup 
                value={tempUserAvatar} 
                onValueChange={setTempUserAvatar}
                className="grid grid-cols-3 gap-4"
              >
                <div className="flex items-center justify-center">
                  <RadioGroupItem value="icon_01" id="avatar_1" className="sr-only" />
                  <Label 
                    htmlFor="avatar_1" 
                    className={`cursor-pointer rounded-full overflow-hidden border-2 transition-all ${tempUserAvatar === 'icon_01' ? 'border-primary scale-110' : 'border-transparent hover:border-muted'}`}
                  >
                    <Avatar className="h-16 w-16">
                      <AvatarImage 
                        src={icon01} 
                        alt="Avatar 1"
                      />
                    </Avatar>
                  </Label>
                </div>
                
                <div className="flex items-center justify-center">
                  <RadioGroupItem value="icon_02" id="avatar_2" className="sr-only" />
                  <Label 
                    htmlFor="avatar_2" 
                    className={`cursor-pointer rounded-full overflow-hidden border-2 transition-all ${tempUserAvatar === 'icon_02' ? 'border-primary scale-110' : 'border-transparent hover:border-muted'}`}
                  >
                    <Avatar className="h-16 w-16">
                      <AvatarImage 
                        src={icon02} 
                        alt="Avatar 2"
                      />
                    </Avatar>
                  </Label>
                </div>
                
                <div className="flex items-center justify-center">
                  <RadioGroupItem value="icon_03" id="avatar_3" className="sr-only" />
                  <Label 
                    htmlFor="avatar_3" 
                    className={`cursor-pointer rounded-full overflow-hidden border-2 transition-all ${tempUserAvatar === 'icon_03' ? 'border-primary scale-110' : 'border-transparent hover:border-muted'}`}
                  >
                    <Avatar className="h-16 w-16">
                      <AvatarImage 
                        src={icon03} 
                        alt="Avatar 3"
                      />
                    </Avatar>
                  </Label>
                </div>
                
                <div className="flex items-center justify-center">
                  <RadioGroupItem value="icon_04" id="avatar_4" className="sr-only" />
                  <Label 
                    htmlFor="avatar_4" 
                    className={`cursor-pointer rounded-full overflow-hidden border-2 transition-all ${tempUserAvatar === 'icon_04' ? 'border-primary scale-110' : 'border-transparent hover:border-muted'}`}
                  >
                    <Avatar className="h-16 w-16">
                      <AvatarImage 
                        src={icon04} 
                        alt="Avatar 4"
                      />
                    </Avatar>
                  </Label>
                </div>
                
                <div className="flex items-center justify-center">
                  <RadioGroupItem value="icon_05" id="avatar_5" className="sr-only" />
                  <Label 
                    htmlFor="avatar_5" 
                    className={`cursor-pointer rounded-full overflow-hidden border-2 transition-all ${tempUserAvatar === 'icon_05' ? 'border-primary scale-110' : 'border-transparent hover:border-muted'}`}
                  >
                    <Avatar className="h-16 w-16">
                      <AvatarImage 
                        src={icon05} 
                        alt="Avatar 5"
                      />
                    </Avatar>
                  </Label>
                </div>
                
                <div className="flex items-center justify-center">
                  <RadioGroupItem value="icon_06" id="avatar_6" className="sr-only" />
                  <Label 
                    htmlFor="avatar_6" 
                    className={`cursor-pointer rounded-full overflow-hidden border-2 transition-all ${tempUserAvatar === 'icon_06' ? 'border-primary scale-110' : 'border-transparent hover:border-muted'}`}
                  >
                    <Avatar className="h-16 w-16">
                      <AvatarImage 
                        src={icon06} 
                        alt="Avatar 6"
                      />
                    </Avatar>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={handleSaveUserName} className="w-full md:w-auto" disabled={!tempUserName.trim()}>
              <Check className="h-4 w-4 mr-2" />
              Save Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Prevent unnecessary re-renders
const commentSectionPropsAreEqual = (prevProps: CommentSectionProps, nextProps: CommentSectionProps): boolean => {
  return prevProps.animeId === nextProps.animeId && 
         prevProps.episodeId === nextProps.episodeId &&
         prevProps.className === nextProps.className;
};

// Export memoized component
export const CommentSection = React.memo(CommentSectionComponent, commentSectionPropsAreEqual);