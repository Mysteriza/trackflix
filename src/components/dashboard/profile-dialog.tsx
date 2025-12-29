
"use client";

import { useState, useEffect, ReactNode } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, writeBatch, getDocs, collection, query, where } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Globe, Lock, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '../ui/skeleton';
import { Input } from '../ui/input';
import { cn } from '@/lib/utils';
import type { UserProfile, WatchlistVisibility } from '@/lib/types';

interface ProfileDialogProps {
  children: ReactNode;
}

export function ProfileDialog({ children }: ProfileDialogProps) {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);


  useEffect(() => {
    if (!user || !open) return;
    
    setLoading(true);
    const profileRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(profileRef, (doc) => {
      if (doc.exists()) {
        setProfile(doc.data() as UserProfile);
      } else {
         setProfile(null);
      }
      setLoading(false);
    }, (error) => {
        console.error("Error fetching profile:", error);
        setProfile(null);
        setLoading(false);
    });

    return () => unsubscribe();
    
  }, [user, open]);

  useEffect(() => {
    if (!isDeleteDialogOpen) {
      setDeleteConfirmation('');
    }
  }, [isDeleteDialogOpen]);

  const handleVisibilityChange = async (isPublic: boolean) => {
    if (!user || !profile) return;

    const newVisibility: WatchlistVisibility = isPublic ? 'public' : 'private';
    setIsSaving(true);
    try {
      const profileRef = doc(db, 'users', user.uid);
      await updateDoc(profileRef, {
        watchlistVisibility: newVisibility,
      });
      toast({
        title: 'Privacy Updated',
        description: `Your watchlist is now ${newVisibility}.`,
      });
    } catch (error) {
      console.error('Failed to update visibility:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update your privacy settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {
      // Temporarily close dialogs to prevent UI updates on deleted data
      setIsDeleteDialogOpen(false);
      setOpen(false);

      // Delete user's data (watchlist and profile)
      const batch = writeBatch(db);
      
      const watchlistQuery = query(collection(db, 'watchlist'), where('userId', '==', user.uid));
      const watchlistSnapshot = await getDocs(watchlistQuery);
      watchlistSnapshot.forEach((doc) => batch.delete(doc.ref));

      
      const userProfileRef = doc(db, 'users', user.uid);
      batch.delete(userProfileRef);

      await batch.commit();

      // Delete the user account
      await deleteUser(user);
      
      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been permanently removed.",
      });
      
      // Redirect happens after all deletion logic is complete
      router.push('/');

    } catch (error: any) {
      console.error("Error deleting account: ", error);
      let description = "An error occurred while deleting your account.";
      if (error.code === 'auth/requires-recent-login') {
        description = "This is a sensitive operation. Please log out and log back in again before deleting your account.";
      }
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: description,
      });

      // Re-enable buttons if deletion fails
      setIsDeleting(false);
    }
  };


  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your Profile</DialogTitle>
            <DialogDescription>
              Manage your public profile and privacy settings.
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : profile ? (
            <div className="py-4 space-y-6">
              <div className='space-y-2'>
                  <Label>Display Name</Label>
                  <p className='text-sm text-muted-foreground'>{profile.displayName}</p>
              </div>
              <div className='space-y-2'>
                  <Label>Email</Label>
                  <p className='text-sm text-muted-foreground'>{profile.email}</p>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="visibility-switch" className="text-base">
                    Public Watchlist
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow other users to see your watchlist.
                  </p>
                </div>
                <div className='flex items-center gap-2'>
                  {profile.watchlistVisibility === 'public' ? <Globe className="text-green-500" /> : <Lock className='text-red-500' />}
                  <Switch
                    id="visibility-switch"
                    checked={profile.watchlistVisibility === 'public'}
                    onCheckedChange={handleVisibilityChange}
                    disabled={isSaving}
                    aria-readonly
                  />
                </div>
              </div>
              <div>
                <Button variant="destructive" className='w-full' onClick={() => setIsDeleteDialogOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                </Button>
              </div>
            </div>
          ) : <p className='py-4 text-muted-foreground'>Could not load profile.</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving || isDeleting}>
              Close
            </Button>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Account Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent and cannot be undone. All your data, including your watchlist, will be permanently deleted.
              <br/><br/>
              To confirm, please type your display name: <span className='font-bold text-foreground'>{profile?.displayName}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input 
            type="text"
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            placeholder="Type your display name to confirm"
            className="my-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting || deleteConfirmation !== profile?.displayName}
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : 'Yes, delete my account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
