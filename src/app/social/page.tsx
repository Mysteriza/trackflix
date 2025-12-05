"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search, User, Eye, Lock } from 'lucide-react';
import type { UserProfile } from '@/lib/types';

function UserCard({ user }: { user: UserProfile }) {
    return (
        <Link href={`/profile/${user.uid}`} className="h-full">
            <Card className="p-4 hover:bg-accent transition-colors flex flex-col h-full">
                <CardContent className="p-0 flex flex-col flex-1">
                    <div className="flex items-center gap-4 mb-4">
                        <Avatar className='relative h-12 w-12'>
                            <AvatarImage src={user.photoURL || ''} alt={user.displayName} />
                            <AvatarFallback>
                                {user.displayName?.charAt(0) || <User />}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <p className="font-semibold truncate">{user.displayName}</p>
                            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        </div>
                    </div>
                    <div className="flex-1 mt-auto space-y-3">
                         <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {user.watchlistVisibility === 'public' ? <Eye className="h-4 w-4 text-green-500" /> : <Lock className="h-4 w-4 text-red-500" />}
                            <span>{user.watchlistVisibility === 'public' ? 'Public' : 'Private'} Watchlist</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}


export default function SocialPage() {
    const [currentUser, loadingAuth] = useAuthState(auth);
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasSearched, setHasSearched] = useState(false);

    const fetchAllUsers = async () => {
        setLoading(true);
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, orderBy('displayName_lowercase'), limit(50));
            const querySnapshot = await getDocs(q);
            const users: UserProfile[] = [];
            querySnapshot.forEach((doc) => {
                // Filter out the current user
                if (doc.id !== currentUser?.uid) {
                    users.push(doc.data() as UserProfile);
                }
            });
            setResults(users);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!loadingAuth && currentUser) {
            fetchAllUsers();
        } else if (!loadingAuth && !currentUser) {
            // Handle case where user is not logged in, maybe redirect or show a message
            setLoading(false);
        }
    }, [currentUser, loadingAuth]);

    const handleSearch = async (e?: React.FormEvent<HTMLFormElement>) => {
        if (e) e.preventDefault();
        if (!searchTerm.trim()) {
            fetchAllUsers();
            setHasSearched(false);
            return;
        }

        setLoading(true);
        setHasSearched(true);
        try {
            const usersRef = collection(db, 'users');
            const q = query(
                usersRef,
                orderBy('displayName_lowercase'),
                where('displayName_lowercase', '>=', searchTerm.toLowerCase()),
                where('displayName_lowercase', '<=', searchTerm.toLowerCase() + '\uf8ff'),
                limit(20)
            );

            const querySnapshot = await getDocs(q);
            const foundUsers: UserProfile[] = [];
            querySnapshot.forEach((doc) => {
                // Filter out the current user from search results
                if (doc.id !== currentUser?.uid) {
                    foundUsers.push(doc.data() as UserProfile);
                }
            });
            setResults(foundUsers);
        } catch (error) {
            console.error("Error searching users: ", error);
        } finally {
            setLoading(false);
        }
    };

    if (loadingAuth) {
        return (
             <div className="container py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            </div>
        )
    }

    return (
        <div className="container py-8">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    Find Other Users
                </h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    Search for friends and see their public watchlists.
                </p>
            </div>

            <form onSubmit={handleSearch} className="flex w-full max-w-lg mx-auto items-center space-x-2 mb-12">
                <Input
                    type="search"
                    placeholder="Search by display name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    <span className="hidden sm:inline ml-2">Search</span>
                </Button>
            </form>

            {loading ? (
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                </div>
            ) : results.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {results.map((user) => (
                        <UserCard user={user} key={user.uid} />
                    ))}
                </div>
            ) : (
                <p className="text-center text-muted-foreground py-10">
                    {hasSearched ? `No users found for "${searchTerm}".` : 'No other users found.'}
                </p>
            )}
        </div>
    );
}
