import React, { useMemo } from 'react';
import { useVirtualList } from '@/hooks/use-virtual-list';
import { Comment } from '@/lib/types';
import { useResourceCleanup } from '@/hooks/use-resource-cleanup';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ThumbsUp, Reply, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface VirtualCommentListProps {
  comments: Comment[];
  onLike: (commentId: string) => void;
  onReply: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  isReplyList?: boolean;
  className?: string;
}

/**
 * A memory-optimized virtualized comment list
 * Only renders comments that are visible in the viewport
 */
export function VirtualCommentList({
  comments,
  onLike,
  onReply,
  onDelete,
  isReplyList = false,
  className
}: VirtualCommentListProps) {
  // Use resource cleanup to manage event listeners and timers
  const { registerCleanup } = useResourceCleanup();
  
  // Calculate a reasonable item height based on average comment length
  const avgItemHeight = useMemo(() => {
    // Estimate height based on average text length
    const avgLength = comments.reduce((sum, comment) => sum + comment.text.length, 0) / 
                     (comments.length || 1);
    
    // Base height plus extra for longer comments
    // This is an estimate - in a real app we would measure actual rendered heights
    const baseHeight = 120; // Base height with avatar, username, etc.
    const heightPerChar = 0.2; // Estimated additional height per character
    
    return Math.max(baseHeight, baseHeight + (avgLength * heightPerChar));
  }, [comments]);
  
  // Create the virtual list
  const {
    containerProps,
    innerProps,
    visibleItemsWithPositions
  } = useVirtualList({
    items: comments,
    itemHeight: avgItemHeight,
    overscan: 5, // Render extra items above and below viewport for smooth scrolling
    getKey: (comment) => comment.id
  });
  
  // Register cleanup for any resources used
  registerCleanup(() => {
    // Any cleanup needed for this component
  });

  return (
    <div {...containerProps} className={cn("h-[500px] overflow-auto", className)}>
      <div {...innerProps}>
        {visibleItemsWithPositions.map(({ item: comment, position, key }) => (
          <div
            key={key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${position}px)`,
            }}
            className={cn(
              "p-4 rounded-lg mb-3",
              isReplyList ? "bg-muted/50" : "bg-card"
            )}
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                {comment.userAvatar ? (
                  <AvatarImage src={comment.userAvatar} alt={comment.userName} />
                ) : null}
                <AvatarFallback>{comment.userName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{comment.userName}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(comment.timestamp), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                
                <p className="text-sm leading-relaxed">{comment.text}</p>
                
                <div className="flex items-center gap-3 mt-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onLike(comment.id)}
                  >
                    <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />
                    <span>{comment.likes}</span>
                  </Button>
                  
                  {!isReplyList && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => onReply(comment.id)}
                    >
                      <Reply className="h-3.5 w-3.5 mr-1.5" />
                      Reply
                    </Button>
                  )}
                  
                  {onDelete && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => onDelete(comment.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}