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
import { cn, normalizeTitle } from '@/lib/utils';
import { useState, useRef } from 'react';
import type { WatchlistItem } from '@/lib/types';
import { ProfileDialog } from '../dashboard/profile-dialog';

export function Header() {
  const router = useRouter();
  const [user, loading] = useAuthState(auth);
  const { toast } = useToast();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<{watchlist: any[]} | null>(null);
  const [importStats, setImportStats] = useState<{watchlistCount: number, existingItems: number}>({watchlistCount: 0, existingItems: 0});

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
        const data = doc.data();
        const { id, folderId, ...cleanData } = data as any;
        return cleanData;
      });

      const dataToExport = { watchlist };
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
    if (!user || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onerror = () => {
      toast({ variant: 'destructive', title: 'Import Failed', description: 'Could not read file.' });
    };

    reader.onload = async (e) => {
      if (!e.target?.result) return;
      
      try {
        const importedData = JSON.parse(e.target.result as string);
        const { watchlist: importedWatchlist = [] } = importedData;

        if (!Array.isArray(importedWatchlist)) {
          throw new Error('Invalid backup file format - watchlist is not an array.');
        }

        const watchlistQuery = query(collection(db, 'watchlist'), where('userId', '==', user.uid));
        const watchlistSnapshot = await getDocs(watchlistQuery);

        setPendingImportData({ watchlist: importedWatchlist });
        setImportStats({
          watchlistCount: importedWatchlist.length,
          existingItems: watchlistSnapshot.size,
        });
        setIsImportDialogOpen(true);

      } catch (error) {
        toast({ variant: 'destructive', title: 'Import Failed', description: `Invalid file format: ${(error as Error).message}` });
      } finally {
        if(importInputRef.current) {
          importInputRef.current.value = '';
        }
      }
    };
    
    reader.readAsText(file);
  };

  const executeImport = async (mode: 'replace' | 'merge') => {
    if (!user || !pendingImportData) return;
    
    setIsImportDialogOpen(false);
    toast({ title: 'Importing data...', description: `Mode: ${mode}. Please wait.` });

    try {
      const batch = writeBatch(db);
      const { watchlist: importedWatchlist } = pendingImportData;

      if (mode === 'replace') {
        const watchlistQuery = query(collection(db, 'watchlist'), where('userId', '==', user.uid));
        const watchlistSnapshot = await getDocs(watchlistQuery);
        watchlistSnapshot.forEach((d) => batch.delete(d.ref));
      }

      let itemsAdded = 0;
      let itemsSkipped = 0;

      if (mode === 'merge') {
        const watchlistQuery = query(collection(db, 'watchlist'), where('userId', '==', user.uid));
        const existingSnapshot = await getDocs(watchlistQuery);
        const existingTitles = new Set(existingSnapshot.docs.map(d => normalizeTitle((d.data() as WatchlistItem).title)));

        for (const item of importedWatchlist) {
          if (existingTitles.has(normalizeTitle(item.title || ''))) {
            itemsSkipped++;
            continue;
          }
          const newItemRef = doc(collection(db, 'watchlist'));
          const { folderId, ...cleanItem } = item;
          batch.set(newItemRef, {...cleanItem, userId: user.uid});
          itemsAdded++;
        }
      } else {
        for (const item of importedWatchlist) {
          const newItemRef = doc(collection(db, 'watchlist'));
          const { folderId, ...cleanItem } = item;
          batch.set(newItemRef, {...cleanItem, userId: user.uid});
          itemsAdded++;
        }
      }

      await batch.commit();

      toast({ 
        title: 'Import Successful', 
        description: mode === 'replace' 
          ? `Imported ${itemsAdded} items.`
          : `Added ${itemsAdded} items${itemsSkipped > 0 ? `, ${itemsSkipped} duplicates skipped` : ''}.`
      });
    } catch (error) {
      console.error('Import Error:', error);
      toast({ variant: 'destructive', title: 'Import Failed', description: `Error: ${(error as Error).message}` });
    }

    setPendingImportData(null);
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
          <ThemeToggle />
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                    <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ProfileDialog>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                </ProfileDialog>
                <Link href="/social">
                  <DropdownMenuItem>
                    <Users className="mr-2 h-4 w-4" />
                    <span>Social</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleExportData}>
                  <Download className="mr-2 h-4 w-4" />
                  <span>Export Data</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => importInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  <span>Import Data</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setIsLogoutDialogOpen(true)} className="text-red-500 focus:text-red-500">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log Out</span>
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

    <AlertDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Import Data</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>File contains <strong>{importStats.watchlistCount}</strong> items.</p>
              <p>You have <strong>{importStats.existingItems}</strong> existing items.</p>
              
              <div className="bg-muted p-3 rounded-lg text-sm space-y-2">
                <p><strong>Add New Only (Recommended)</strong></p>
                <p className="text-muted-foreground">Only adds items not already in TrackFlix. Your existing data stays intact.</p>
              </div>
              
              <div className="bg-destructive/10 p-3 rounded-lg text-sm space-y-2">
                <p><strong>Replace All (Danger!)</strong></p>
                <p className="text-muted-foreground">Deletes ALL your data and replaces with file content. Use only for backup restore.</p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button onClick={() => executeImport('merge')}>
            Add New Only
          </Button>
          <AlertDialogAction onClick={() => executeImport('replace')} className={cn(buttonVariants({ variant: "destructive" }))}>
            Replace All
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <input
      type="file"
      ref={importInputRef}
      className="hidden"
      accept="application/json"
      onChange={handleImportData}
    />
    </>
  );
}
