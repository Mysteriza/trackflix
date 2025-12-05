
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Film, LogOut, User, Loader2, Download, Upload, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button, buttonVariants } from '../ui/button';
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
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { ThemeToggle } from '../theme-toggle';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';
import type { WatchlistItem, WatchlistFolder } from '@/lib/types';
import { ProfileDialog } from '../dashboard/profile-dialog';

export function Header() {
  const router = useRouter();
  const [user, loading] = useAuthState(auth);
  const { toast } = useToast();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const handleLogout = async () => {
    setIsLogoutDialogOpen(false);
    await signOut(auth);
    localStorage.removeItem('session_timestamp');
    router.push('/');
  };

  const handleExportData = async () => {
    if (!user) return;
    toast({ title: 'Exporting data...', description: 'Please wait.' });

    try {
      const watchlistQuery = query(collection(db, 'watchlist'), where('userId', '==', user.uid));
      const watchlistSnapshot = await getDocs(watchlistQuery);
      const watchlist = watchlistSnapshot.docs.map(doc => {
        const { id, ...data } = doc.data() as WatchlistItem;
        return data;
      });

      const foldersQuery = query(collection(db, 'folders'), where('userId', '==', user.uid));
      const foldersSnapshot = await getDocs(foldersQuery);
      const folders = foldersSnapshot.docs.map(doc => {
          const { id, ...data } = doc.data() as WatchlistFolder;
          return data;
      });

      const dataToExport = {
        watchlist,
        folders,
      };

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trackflix_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Export Successful', description: 'Your data has been downloaded.' });
    } catch (error) {
      console.error('Export Error:', error);
      toast({ variant: 'destructive', title: 'Export Failed', description: 'Could not export your data.' });
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files || !event.target.files.length === 0) return;

    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
      if (!e.target?.result) return;
      try {
        const importedData = JSON.parse(e.target.result as string);
        const { watchlist: importedWatchlist, folders: importedFolders } = importedData;

        if (!Array.isArray(importedWatchlist) || !Array.isArray(importedFolders)) {
          throw new Error('Invalid backup file format.');
        }

        toast({ title: 'Importing data...', description: 'Please wait, this may take a moment.' });

        const batch = writeBatch(db);

        // Clear existing data for user
        const watchlistQuery = query(collection(db, 'watchlist'), where('userId', '==', user.uid));
        const watchlistSnapshot = await getDocs(watchlistQuery);
        watchlistSnapshot.forEach((doc) => batch.delete(doc.ref));

        const foldersQuery = query(collection(db, 'folders'), where('userId', '==', user.uid));
        const foldersSnapshot = await getDocs(foldersQuery);
        foldersSnapshot.forEach((doc) => batch.delete(doc.ref));


        // Import Folders
        for (const folder of importedFolders) {
            const newFolderRef = doc(collection(db, 'folders'));
            batch.set(newFolderRef, {...folder, userId: user.uid });
        }
        
        // Import Watchlist Items
        for (const item of importedWatchlist) {
            const newItemRef = doc(collection(db, 'watchlist'));
            batch.set(newItemRef, {...item, userId: user.uid});
        }
        
        await batch.commit();

        toast({ title: 'Import Successful', description: 'Your data has been restored.' });
      } catch (error) {
        console.error('Import Error:', error);
        toast({ variant: 'destructive', title: 'Import Failed', description: 'Could not import data. Please check the file.' });
      } finally {
        // Reset file input
        if(importInputRef.current) {
          importInputRef.current.value = '';
        }
      }
    };
    reader.readText(file);
  };
  
  if (loading) {
    return (
     <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between">
         <Link href="/dashboard" className="flex items-center gap-2">
          <Film className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">TrackFlix</span>
        </Link>
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    </header>
    )
  }

  return (
    <>
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Film className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">TrackFlix</span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <Link href="/social" className={cn(buttonVariants({ variant: 'ghost' }), 'hidden sm:inline-flex')}>
            <Users className="mr-2 h-4 w-4" />
            Social
          </Link>
          <ThemeToggle />
          { user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.photoURL || ''} alt="User Avatar" />
                    <AvatarFallback>
                      {user?.displayName?.charAt(0) || <User />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.displayName || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ProfileDialog trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                } />
                <DropdownMenuItem onSelect={() => router.push('/social')} className="sm:hidden">
                  <Users className="mr-2 h-4 w-4" />
                  <span>Social</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportData}>
                  <Download className="mr-2 h-4 w-4" />
                  <span>Export Data</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => importInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  <span>Import Data</span>
                  <input
                    type="file"
                    ref={importInputRef}
                    className="hidden"
                    accept="application/json"
                    onChange={handleImportData}
                  />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={(e) => {
                  e.preventDefault();
                  setIsLogoutDialogOpen(true);
                }}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>

    <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
          <AlertDialogDescription>
            You will be returned to the login page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleLogout} className={cn(buttonVariants({ variant: "destructive" }))}>
            Log Out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
