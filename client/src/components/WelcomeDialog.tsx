import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import welcomeImageSrc from '../assets/itsuki.png';

const WELCOME_SHOWN_KEY = 'animestream_welcome_shown';

export function WelcomeDialog() {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    // Check if the welcome dialog has been shown before
    const hasSeenWelcome = localStorage.getItem(WELCOME_SHOWN_KEY);
    
    if (!hasSeenWelcome) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Save to localStorage to prevent showing again
    localStorage.setItem(WELCOME_SHOWN_KEY, 'true');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[650px] md:max-w-[700px] p-0 overflow-hidden">
        {/* Smaller close button without circular outline */}
        <DialogClose 
          className="absolute right-4 top-4 z-10 bg-background/80 p-1 hover:bg-background transition-colors" 
          onClick={handleClose}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Close</span>
        </DialogClose>
        
        <div className="flex flex-col md:flex-row">
          {/* Image section - only visible on tablets and above */}
          <div className="hidden md:block md:w-1/2 bg-primary/10">
            <img 
              src={welcomeImageSrc} 
              alt="Welcome to AnimeStream" 
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Content section */}
          <div className="p-6 w-full md:w-1/2">
            {/* Image for mobile only - appears at the top */}
            <div className="block md:hidden w-full h-48 rounded-lg overflow-hidden bg-primary/10 mb-4">
              <img 
                src={welcomeImageSrc} 
                alt="Welcome to AnimeStream" 
                className="w-full h-full object-cover"
              />
            </div>
            
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Welcome to AnimeStream!</DialogTitle>
              <DialogDescription className="text-base">
                Your new favorite platform for watching anime anytime, anywhere.
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4 text-sm text-muted-foreground">
              <p>Explore our vast library of anime series, keep track of your watch history, and discover new titles tailored to your preferences.</p>
              <p className="mt-2">Get started by browsing popular series or search for your favorites!</p>
            </div>
            
            <DialogFooter className="mt-6">
              <Button onClick={handleClose} className="w-full">Get Started</Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}