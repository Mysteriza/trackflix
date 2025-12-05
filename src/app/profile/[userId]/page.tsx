
"use client";

import { useState, useEffect, useMemo, ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile, WatchlistItem, WatchlistFolder } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { User, Lock, Film, Tv, Star, Search, Folder, Maximize2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function PublicWatchedItemCard({ item }: { item: WatchlistItem }) {
  const formattedWatchedDate = item.watchedAt ? format(new Date(item.watchedAt), 'MMM d, yyyy, HH:mm') : 'N/A';
  const TypeIcon = item.type === 'movie' ? Film : Tv;

  return (
    <Card className="flex flex-col h-full overflow-hidden p-3">
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="flex items-start gap-2 mb-2">
            <TypeIcon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <h3 className="font-semibold leading-tight flex-1">{item.title}</h3>
        </div>
        
        {item.rating !== null && item.rating !== undefined ? (
          <div className="flex items-center gap-2 text-amber-400">
            <Star className="h-5 w-5 fill-current" />
            <span className="font-bold text-base text-foreground">{item.rating.toFixed(1)}/10</span>
          </div>
        ) : (
           <div className="flex items-center gap-2 text-muted-foreground">
            <Star className="h-5 w-5" />
            <span className="text-sm">No rating</span>
          </div>
        )}
        
        {item.notes && (
          <Collapsible className="mt-auto pt-2">
            <div className="relative text-xs text-muted-foreground italic">
                <p className='pr-6'>
                    <CollapsibleContent asChild>
                        <span>"{item.notes}"</span>
                    </CollapsibleContent>
                    {item.notes.length > 20 && (
                        <CollapsibleTrigger asChild>
                             <Button variant="ghost" size="icon" className="absolute -right-1 -top-1 h-6 w-6">
                                <Maximize2 className="h-3 w-3" />
                             </Button>
                        </CollapsibleTrigger>
                    )}
                    {item.notes.length <= 20 && `"${item.notes}"`}
                </p>
            </div>
          </Collapsible>
        )}

        <p className={cn("text-xs text-muted-foreground", !item.notes && "mt-auto pt-2")}>{formattedWatchedDate}</p>
      </CardContent>
    </Card>
  );
}


function PublicWatchlist({ userId }: { userId: string }) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [folders, setFolders] = useState<WatchlistFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('watched');
  const [watchedSearchTerm, setWatchedSearchTerm] = useState('');
  const [watchedSort, setWatchedSort] = useState('watchedAt_desc');

  useEffect(() => {
    setLoading(true);
    const itemsQuery = query(collection(db, 'watchlist'), where('userId', '==', userId));
    const foldersQuery = query(collection(db, 'folders'), where('userId', '==', userId));

    const unsubscribeItems = onSnapshot(itemsQuery, (snapshot) => {
      const fetchedItems: WatchlistItem[] = [];
      snapshot.forEach(doc => fetchedItems.push({ id: doc.id, ...doc.data() } as WatchlistItem));
      setItems(fetchedItems);
      setLoading(false);
    }, () => {
      setLoading(false);
      setItems([]);
      setFolders([]);
    });

    const unsubscribeFolders = onSnapshot(foldersQuery, (snapshot) => {
        const fetchedFolders: WatchlistFolder[] = [];
        snapshot.forEach(doc => fetchedFolders.push({ id: doc.id, ...doc.data() } as WatchlistFolder));
        setFolders(fetchedFolders.sort((a,b) => a.order - b.order));
    });

    return () => {
      unsubscribeItems();
      unsubscribeFolders();
    };
  }, [userId]);

  const unwatchedMovies = useMemo(() => items.filter(item => !item.watched && item.type === 'movie').sort((a,b) => a.order - b.order), [items]);
  const unwatchedSeries = useMemo(() => items.filter(item => !item.watched && item.type === 'series').sort((a,b) => a.order - b.order), [items]);
  
  const watchedItems = useMemo(() => {
    let filtered = items.filter(item => item.watched);

    if (watchedSearchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(watchedSearchTerm.toLowerCase())
      );
    }

    return filtered.sort((a, b) => {
      switch (watchedSort) {
        case 'watchedAt_asc':
          return (a.watchedAt || 0) - (b.watchedAt || 0);
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'title_desc':
          return b.title.localeCompare(a.title);
        case 'watchedAt_desc':
        default:
          return (b.watchedAt || 0) - (a.watchedAt || 0);
      }
    });
  }, [items, watchedSearchTerm, watchedSort]);


  const getCategorizedUnwatchedItems = (type: 'movie' | 'series') => {
    const relevantItems = type === 'movie' ? unwatchedMovies : unwatchedSeries;
    const itemsByFolder = folders.reduce((acc, folder) => {
      acc[folder.id] = [];
      return acc;
    }, {} as Record<string, WatchlistItem[]>);

    const standaloneItems: WatchlistItem[] = [];

    relevantItems.forEach(item => {
      if (item.folderId && itemsByFolder[item.folderId]) {
        itemsByFolder[item.folderId].push(item);
      } else {
        standaloneItems.push(item);
      }
    });
    
    Object.values(itemsByFolder).forEach(list => list.sort((a,b) => a.order - b.order));
    standaloneItems.sort((a,b) => a.order - b.order);

    return { standalone: standaloneItems, byFolder: itemsByFolder };
  };

  const getCategorizedWatchedItems = () => {
    const itemsByFolder = folders.reduce((acc, folder) => {
      acc[folder.id] = [];
      return acc;
    }, {} as Record<string, WatchlistItem[]>);

    const standaloneItems: WatchlistItem[] = [];

    watchedItems.forEach(item => {
      if(item.folderId && itemsByFolder[item.folderId]) {
        itemsByFolder[item.folderId].push(item);
      } else {
        standaloneItems.push(item);
      }
    });

    return { standalone: standaloneItems, byFolder: itemsByFolder };
  }

  const movies = useMemo(() => getCategorizedUnwatchedItems('movie'), [unwatchedMovies, folders]);
  const series = useMemo(() => getCategorizedUnwatchedItems('series'), [unwatchedSeries, folders]);
  const watchedCategorized = useMemo(() => getCategorizedWatchedItems(), [watchedItems, folders]);


  const renderUnwatchedList = (list: WatchlistItem[]) => {
    if (list.length === 0) return <p className="text-muted-foreground text-center py-4">This list is empty.</p>;

    return (
      <div className="space-y-3">
        {list.map((item, index) => (
          <Card key={item.id} className="p-3">
            <CardContent className="p-0 flex items-center gap-4">
               <span className="font-semibold text-muted-foreground/80 w-6 text-center">{index + 1}.</span>
               <p className="font-semibold flex-1">{item.title}</p>
              {item.isD21 && <Badge variant="destructive">D21+</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const renderCategorizedUnwatched = (data: ReturnType<typeof getCategorizedUnwatchedItems>) => {
    const hasStandalone = data.standalone.length > 0;
    const visibleFolders = folders.filter(folder => data.byFolder[folder.id]?.length > 0);

    if (!hasStandalone && visibleFolders.length === 0) {
      return <p className="text-muted-foreground text-center py-8">This user hasn't added anything to their watchlist yet.</p>;
    }

    return (
      <div className="space-y-8">
        {visibleFolders.length > 0 && (
          <Accordion type="multiple" className="w-full space-y-4">
            {visibleFolders.map(folder => {
              const folderItems = data.byFolder[folder.id] || [];
              return (
                <AccordionItem value={folder.id} key={folder.id} className="border rounded-lg bg-card">
                  <div className="flex items-center px-4">
                    <AccordionTrigger className="text-lg font-semibold hover:no-underline flex-1 py-3 sm:py-4">
                      <div className='flex items-center gap-2'>
                        <Folder className='text-primary'/>
                        <span className='flex-1 text-left'>{folder.name} ({folderItems.length})</span>
                      </div>
                    </AccordionTrigger>
                  </div>
                  <AccordionContent className="p-4 pt-0">
                    {renderUnwatchedList(folderItems)}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        )}

        {hasStandalone && (
          <div>
            {visibleFolders.length > 0 && <Separator className="my-8"/>}
            <h3 className="text-2xl font-bold mb-6">Standalone ({data.standalone.length})</h3>
            <p className="text-muted-foreground mb-4">Items this user wants to watch that aren't in a folder.</p>
            {renderUnwatchedList(data.standalone)}
          </div>
        )}
      </div>
    );
  }

  const renderWatchedGrid = (list: WatchlistItem[]) => {
    if (list.length === 0) return <p className="text-muted-foreground text-center py-4">No watched items here.</p>;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {list.map((item) => (
            <PublicWatchedItemCard key={item.id} item={item} />
          ))}
        </div>
    );
  };
  
  const renderCategorizedWatched = (data: ReturnType<typeof getCategorizedWatchedItems>) => {
      const hasStandalone = data.standalone.length > 0;
      const visibleFolders = folders.filter(folder => data.byFolder[folder.id]?.length > 0);

      if (!hasStandalone && visibleFolders.length === 0) {
        if (watchedSearchTerm) {
            return <p className="text-muted-foreground text-center py-8">No results found for "{watchedSearchTerm}".</p>;
        }
        return <p className="text-muted-foreground text-center py-8">This user hasn't marked anything as watched yet.</p>;
      }

      return (
        <div className="space-y-8">
          {visibleFolders.length > 0 && (
            <Accordion type="multiple" className="w-full space-y-4">
                {visibleFolders.map(folder => {
                    const folderItems = data.byFolder[folder.id] || [];
                    return (
                        <AccordionItem value={folder.id} key={folder.id} className="border rounded-lg bg-card">
                            <div className="flex items-center px-4">
                                <AccordionTrigger className="text-lg font-semibold hover:no-underline flex-1 py-3 sm:py-4">
                                    <div className='flex items-center gap-2'>
                                        <Folder className='text-primary'/>
                                        <span className='flex-1 text-left'>{folder.name} ({folderItems.length})</span>
                                    </div>
                                </AccordionTrigger>
                            </div>
                            <AccordionContent className="p-4 pt-0">
                                {renderWatchedGrid(folderItems)}
                            </AccordionContent>
                        </AccordionItem>
                    )
                })}
            </Accordion>
          )}
          {hasStandalone && (
            <div>
              {visibleFolders.length > 0 && <Separator className="my-8"/>}
              <h3 className="text-2xl font-bold mb-6">Standalone ({data.standalone.length})</h3>
              {renderWatchedGrid(data.standalone)}
            </div>
          )}
        </div>
      )
  };


  if (loading) {
    return (
      <div className="space-y-4 mt-8">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  const watchedMoviesCount = items.filter(i => i.watched && i.type === 'movie').length;
  const watchedSeriesCount = items.filter(i => i.watched && i.type === 'series').length;
  const totalWatched = watchedMoviesCount + watchedSeriesCount;

  return (
    <Tabs defaultValue="watched" className="w-full mt-8" value={activeTab} onValueChange={setActiveTab}>
      <TabsList className='mb-4 grid w-full grid-cols-3 h-auto'>
        <TabsTrigger value="watched">Watched ({totalWatched})</TabsTrigger>
        <TabsTrigger value="movies">Movies ({unwatchedMovies.length})</TabsTrigger>
        <TabsTrigger value="series">Series ({unwatchedSeries.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="watched">
        <div className="space-y-6">
            <div className='flex flex-col sm:flex-row gap-2 w-full'>
                  <div className="relative w-full sm:flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search watched list..."
                        className="pl-9"
                        value={watchedSearchTerm}
                        onChange={(e) => setWatchedSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={watchedSort} onValueChange={setWatchedSort}>
                    <SelectTrigger className='w-full sm:w-[200px]'>
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="watchedAt_desc">Watched Date (Newest)</SelectItem>
                        <SelectItem value="watchedAt_asc">Watched Date (Oldest)</SelectItem>
                        <SelectItem value="title_asc">Title (A-Z)</SelectItem>
                        <SelectItem value="title_desc">Title (Z-A)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {renderCategorizedWatched(watchedCategorized)}
        </div>
      </TabsContent>
      <TabsContent value="movies">{renderCategorizedUnwatched(movies)}</TabsContent>
      <TabsContent value="series">{renderCategorizedUnwatched(series)}</TabsContent>
    </Tabs>
  );
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [watchedStats, setWatchedStats] = useState({ movies: 0, series: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let unsubscribeProfile: () => void;
    let unsubscribeWatchlist: () => void;

    const fetchProfile = () => {
      setLoading(true);
      const userDocRef = doc(db, 'users', userId);
      unsubscribeProfile = onSnapshot(userDocRef, (userDoc) => {
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
          setError("User not found.");
          setProfile(null);
        }
        setLoading(false);
      }, (err) => {
        console.error("Error fetching user profile:", err);
        setError("Failed to load user profile.");
        setLoading(false);
      });
    };

    const fetchWatchlistStats = () => {
        const itemsQuery = query(collection(db, 'watchlist'), where('userId', '==', userId), where('watched', '==', true));
        unsubscribeWatchlist = onSnapshot(itemsQuery, (snapshot) => {
            let movies = 0;
            let series = 0;
            snapshot.forEach(doc => {
                const item = doc.data();
                if (item.type === 'movie') movies++;
                else if (item.type === 'series') series++;
            });
            setWatchedStats({ movies, series, total: movies + series });
        });
    };

    fetchProfile();
    fetchWatchlistStats();

    return () => {
        if(unsubscribeProfile) unsubscribeProfile();
        if(unsubscribeWatchlist) unsubscribeWatchlist();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="container py-8">
        <div className='flex items-center gap-6'>
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className='space-y-2'>
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-5 w-56" />
            </div>
        </div>
        <Skeleton className="h-64 w-full mt-8" />
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-red-500 py-12">{error}</p>;
  }

  if (!profile) return null;
  
  return (
    <div className="container py-8">
      <header className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-8">
        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 text-4xl relative">
          <AvatarImage src={profile.photoURL || ''} />
          <AvatarFallback>{profile.displayName.charAt(0) || <User />}</AvatarFallback>
        </Avatar>
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-bold">{profile.displayName}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">{profile.email}</p>
           <div className='mt-3 flex flex-wrap justify-center sm:justify-start items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground'>
              <span>Total Watched: <span className='font-bold text-foreground'>{watchedStats.total}</span></span>
              <span>Movies: <span className='font-bold text-foreground'>{watchedStats.movies}</span></span>
              <span>Series: <span className='font-bold text-foreground'>{watchedStats.series}</span></span>
            </div>
        </div>
      </header>
      
      <Separator />

      {profile.watchlistVisibility === 'private' ? (
         <div className="flex flex-col items-center justify-center text-center gap-4 py-20 bg-card rounded-lg mt-8 border">
            <Lock className="h-12 w-12 text-muted-foreground" />
            <h2 className="text-2xl font-bold">This Watchlist is Private</h2>
            <p className="text-muted-foreground max-w-sm">
                {profile.displayName} has chosen to keep their watchlist private.
            </p>
        </div>
      ) : (
        <PublicWatchlist userId={profile.uid} />
      )}
    </div>
  );
}
