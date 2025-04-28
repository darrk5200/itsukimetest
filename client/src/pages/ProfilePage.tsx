import { useState, useEffect } from "react";
import { 
  Avatar, 
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { 
  Check, 
  ChevronLeft, 
  History, 
  User as UserIcon, 
  MessageSquare, 
  Bell,
  Moon,
  Sun
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { getUserName, setUserName, getUserAvatar, setUserAvatar, getTheme, setTheme } from "@/lib/storage";

// Import avatar icons
import icon01 from "@/assets/icon_01.png";
import icon02 from "@/assets/icon_02.png";
import icon03 from "@/assets/icon_03.png";
import icon04 from "@/assets/icon_04.png";
import icon05 from "@/assets/icon_05.png";
import icon06 from "@/assets/icon_06.png";

export default function ProfilePage() {
  const [userName, setUserNameState] = useState(getUserName());
  const [userAvatar, setUserAvatarState] = useState(getUserAvatar() || 'icon_01');
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>(getTheme());
  const { toast } = useToast();
  
  // Initialize theme when component mounts
  useEffect(() => {
    // Apply theme class to the body
    if (currentTheme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [currentTheme]);

  // Get avatar image source based on the avatar name
  const getAvatarImage = (avatarName: string | undefined) => {
    if (!avatarName) return icon01;
    switch (avatarName) {
      case 'icon_01': return icon01;
      case 'icon_02': return icon02;
      case 'icon_03': return icon03;
      case 'icon_04': return icon04;
      case 'icon_05': return icon05;
      case 'icon_06': return icon06;
      default: return icon01;
    }
  };

  const handleSaveProfile = () => {
    if (userName.trim()) {
      // Save to storage
      setUserName(userName);
      setUserAvatar(userAvatar);
      
      // Show success toast
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    }
  };
  
  // Handle theme toggle
  const handleThemeToggle = (isChecked: boolean) => {
    const newTheme = isChecked ? 'light' : 'dark';
    setCurrentTheme(newTheme);
    setTheme(newTheme);
    
    toast({
      title: `${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} theme activated`,
      description: `Application theme has been switched to ${newTheme} mode.`,
    });
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center mb-8">
        <Link href="/" className="mr-4">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Your Profile</h1>
      </div>
      
      <div className="grid gap-8 md:grid-cols-3">
        {/* Profile card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>
              Update your display name and avatar that will be shown with your comments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current profile preview */}
            <div className="flex flex-col items-center mb-6 sm:flex-row sm:items-start sm:mb-0">
              <Avatar className="h-24 w-24">
                <AvatarImage 
                  src={getAvatarImage(userAvatar)} 
                  alt={userName || "User"}
                />
                <AvatarFallback>
                  {userName ? userName.charAt(0).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
              
              <div className="mt-4 text-center sm:mt-0 sm:ml-6 sm:text-left">
                <h3 className="text-lg font-medium">
                  {userName ? userName : "Set your display name"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This is how other users will see you
                </p>
              </div>
            </div>
            
            {/* Display name input */}
            <div>
              <Label htmlFor="name" className="text-right mb-2 block">
                Your Name <span className="text-xs text-muted-foreground">(max 16 characters, letters and numbers only)</span>
              </Label>
              <Input
                id="name"
                value={userName}
                onChange={(e) => {
                  // Only allow letters and numbers, max 16 characters
                  const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
                  setUserNameState(value);
                }}
                placeholder="Enter your display name"
                maxLength={16}
              />
            </div>
            
            {/* Avatar selection */}
            <div>
              <Label className="text-right mb-4 block">
                Choose Avatar
              </Label>
              
              <RadioGroup 
                value={userAvatar} 
                onValueChange={setUserAvatarState}
                className="grid grid-cols-3 sm:grid-cols-6 gap-4"
              >
                <div className="flex items-center justify-center">
                  <RadioGroupItem value="icon_01" id="profile_avatar_1" className="sr-only" />
                  <Label 
                    htmlFor="profile_avatar_1" 
                    className={`cursor-pointer rounded-full overflow-hidden border-2 transition-all ${userAvatar === 'icon_01' ? 'border-primary scale-110' : 'border-transparent hover:border-muted'}`}
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
                  <RadioGroupItem value="icon_02" id="profile_avatar_2" className="sr-only" />
                  <Label 
                    htmlFor="profile_avatar_2" 
                    className={`cursor-pointer rounded-full overflow-hidden border-2 transition-all ${userAvatar === 'icon_02' ? 'border-primary scale-110' : 'border-transparent hover:border-muted'}`}
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
                  <RadioGroupItem value="icon_03" id="profile_avatar_3" className="sr-only" />
                  <Label 
                    htmlFor="profile_avatar_3" 
                    className={`cursor-pointer rounded-full overflow-hidden border-2 transition-all ${userAvatar === 'icon_03' ? 'border-primary scale-110' : 'border-transparent hover:border-muted'}`}
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
                  <RadioGroupItem value="icon_04" id="profile_avatar_4" className="sr-only" />
                  <Label 
                    htmlFor="profile_avatar_4" 
                    className={`cursor-pointer rounded-full overflow-hidden border-2 transition-all ${userAvatar === 'icon_04' ? 'border-primary scale-110' : 'border-transparent hover:border-muted'}`}
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
                  <RadioGroupItem value="icon_05" id="profile_avatar_5" className="sr-only" />
                  <Label 
                    htmlFor="profile_avatar_5" 
                    className={`cursor-pointer rounded-full overflow-hidden border-2 transition-all ${userAvatar === 'icon_05' ? 'border-primary scale-110' : 'border-transparent hover:border-muted'}`}
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
                  <RadioGroupItem value="icon_06" id="profile_avatar_6" className="sr-only" />
                  <Label 
                    htmlFor="profile_avatar_6" 
                    className={`cursor-pointer rounded-full overflow-hidden border-2 transition-all ${userAvatar === 'icon_06' ? 'border-primary scale-110' : 'border-transparent hover:border-muted'}`}
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
            
            <Button 
              onClick={handleSaveProfile} 
              className="w-full mt-6" 
              disabled={!userName.trim()}
            >
              <Check className="h-4 w-4 mr-2" />
              Save Profile
            </Button>
          </CardContent>
        </Card>
        
        {/* Sidebar */}
        <div className="space-y-4">
          {/* Theme Toggle Card */}
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Change how ItsukiMe looks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {currentTheme === 'dark' ? (
                    <Moon className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Sun className="h-5 w-5 text-yellow-500" />
                  )}
                  <Label htmlFor="theme-mode" className="font-medium">
                    {currentTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </Label>
                </div>
                <Switch
                  id="theme-mode"
                  checked={currentTheme === 'light'}
                  onCheckedChange={handleThemeToggle}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Account Card */}
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="ghost" className="w-full justify-start" disabled>
                <UserIcon className="h-4 w-4 mr-2" />
                Profile Settings
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/history">
                  <History className="h-4 w-4 mr-2" />
                  Watch History
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/watchlater">
                  <Bell className="h-4 w-4 mr-2" />
                  Bookmarks
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/comments">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Your Comments
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}