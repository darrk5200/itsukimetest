import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { MessageSquare, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { getUserName } from '@/lib/storage';

interface UserComment {
  id: string;
  animeId: number;
  episodeId: number;
  animeName: string;
  episodeNumber: number;
  text: string;
  timestamp: string;
  likes: number;
}

export default function CommentsPage() {
  const [comments, setComments] = useState<UserComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const userName = getUserName();

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check if user is logged in
        if (!userName) {
          setError("Please set your username in Profile Settings to view your comments");
          setLoading(false);
          return;
        }
        
        // Fetch comments from API
        const response = await fetch(`/api/user/${encodeURIComponent(userName)}/comments`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch comments');
        }
        
        const data = await response.json();
        setComments(data);
      } catch (err) {
        console.error('Error fetching comments:', err);
        setError('Failed to load your comments. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchComments();
  }, [userName]);

  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userName }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      // Remove the deleted comment from state
      setComments(comments.filter(comment => comment.id !== commentId));
      
      toast({
        title: "Comment deleted",
        description: "Your comment has been successfully deleted.",
      });
    } catch (err) {
      console.error('Error deleting comment:', err);
      toast({
        title: "Error",
        description: "Failed to delete comment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getFormattedDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Your Comments</h1>
        <p className="text-muted-foreground mt-1">
          View and manage all comments you've made across the platform
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          <span className="ml-3">Loading your comments...</span>
        </div>
      ) : error ? (
        <Alert variant="destructive" className="my-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : comments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-medium mb-2">No Comments Yet</h2>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              You haven't made any comments yet. Start interacting with episodes to see your comments here.
            </p>
            <Button asChild>
              <Link href="/">Browse Anime</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Comments ({comments.length})</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="px-6 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <Link href={`/anime/${comment.animeId}/episode/${comment.episodeId}`}>
                          <h3 className="text-base font-medium hover:text-primary cursor-pointer">
                            {comment.animeName} - Episode {comment.episodeNumber}
                          </h3>
                        </Link>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getFormattedDate(comment.timestamp)} • {comment.likes} likes
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete your comment.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteComment(comment.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <p className="mt-2 text-sm">{comment.text}</p>
                    <div className="flex justify-end mt-2">
                      <Button variant="link" size="sm" asChild className="h-6">
                        <Link href={`/anime/${comment.animeId}/episode/${comment.episodeId}`}>
                          <span className="flex items-center">
                            View in episode
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </span>
                        </Link>
                      </Button>
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}