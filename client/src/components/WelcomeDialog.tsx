import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import welcomeImageSrc from '../assets/itsuki.png';

const WELCOME_SHOWN_KEY = 'itsukime_welcome_shown';

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

  // Handler to prevent dialog closing by clicking outside
  const handleOpenChange = (open: boolean) => {
    // Only allow dialog to be closed through the Get Started button
    if (open === false) return;
    setIsOpen(open);
  };

  return (
    // We've removed the X button globally, and we're preventing 
    // closing via backdrop click with our handleOpenChange function
    <Dialog 
      open={isOpen} 
      onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[650px] md:max-w-[700px] p-0 overflow-hidden">
        
        <div className="flex flex-col md:flex-row">
          {/* Image section - only visible on tablets and above */}
          <div className="hidden md:block md:w-1/2 bg-primary/10">
            <img 
              src={welcomeImageSrc} 
              alt="Welcome to Itsukime" 
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Content section */}
          <div className="p-6 w-full md:w-1/2">
            {/* Image for mobile only - appears at the top left corner taking 1/4 of the screen */}
            <div className="block md:hidden w-1/4 h-24 float-left rounded-lg overflow-hidden bg-primary/10 mr-4 mb-2">
              <img 
                src={welcomeImageSrc} 
                alt="Welcome to Itsukime" 
                className="w-full h-full object-cover object-center"
              />
            </div>
            
            <DialogHeader className="md:text-left">
              <DialogTitle className="text-2xl font-bold md:text-left">Welcome to Itsukime!</DialogTitle>
              <DialogDescription className="text-base md:text-left">
                Your new favorite platform for watching anime anytime, anywhere.
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4 text-sm text-muted-foreground md:text-left clear-right">
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