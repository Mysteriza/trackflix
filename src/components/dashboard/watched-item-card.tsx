
"use client";

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Slider } from '../ui/slider';
import { Star, Film, Tv, Edit, Trash2, MoreVertical, RotateCcw, MessageSquare, Move, Maximize2 } from 'lucide-react';
import type { WatchlistItem, WatchlistFolder } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { buttonVariants } from '../ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Form, FormItem, FormLabel, FormControl, FormMessage, FormField } from '../ui/form';
import { MoveToFolderDialog } from './move-to-folder-dialog';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../ui/collapsible';

interface WatchedItemCardProps {
  item: WatchlistItem;
  allFolders: WatchlistFolder[];
  items: WatchlistItem[];
  isDragging: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggleSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Omit<WatchlistItem, 'id'>>) => void;
  onDelete: (id: string) => void;
  onUpdateWatched: (item: WatchlistItem, watched: boolean) => void;
  onMoveToFolder: (itemId: string, folderId: string | null) => void;
  handleDragStart: (e: React.DragEvent<HTMLDivElement>, item: WatchlistItem) => void;
  handleDragEnter: (e: React.DragEvent<HTMLDivElement>, item: WatchlistItem) => void;
  handleDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
}

const formSchema = z.object({
  type: z.enum(['movie', 'series']),
});

export function WatchedItemCard({
  item,
  allFolders,
  items,
  isDragging,
  isSelected,
  isSelectionMode,
  onToggleSelect,
  onUpdate,
  onDelete,
  onUpdateWatched,
  onMoveToFolder,
  handleDragStart,
  handleDragEnter,
  handleDragEnd,
}: WatchedItemCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  
  const [title, setTitle] = useState(item.title);
  const [isD21, setIsD21] = useState(item.isD21 || false);
  
  const [rating, setRating] = useState(item.rating ?? 5);
  const [notes, setNotes] = useState(item.notes || '');

  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isNoteLong = useMemo(() => (item.notes?.length || 0) > 20, [item.notes]);
  const [isNoteOpen, setIsNoteOpen] = useState(false);

  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: item.type,
    },
  });

  const formattedWatchedDate = item.watchedAt
    ? format(new Date(item.watchedAt), 'MMM d, yyyy, HH:mm')
    : 'N/A';

  const handleEditSaveChanges = () => {
    const type = form.getValues('type');
    onUpdate(item.id, { title, isD21, type });
    setEditDialogOpen(false);
    toast({
      title: "Item Updated!",
      description: `Your changes for "${item.title}" have been saved.`,
    })
  };
  
  const handleRatingSaveChanges = () => {
    onUpdate(item.id, { rating, notes });
    setRateDialogOpen(false);
    toast({
      title: "Rating Updated!",
      description: `Your rating for "${item.title}" has been saved.`,
    })
  };

  const handleUnwatch = () => {
    onUpdateWatched(item, false);
  }

  const handleDelete = () => {
    onDelete(item.id);
  }

  const TypeIcon = item.type === 'movie' ? Film : Tv;

  return (
    <>
    <Card
      draggable={!isMobile}
      onDragStart={(e) => handleDragStart(e, item)}
      onDragEnter={(e) => handleDragEnter(e, item)}
      onDragEnd={handleDragEnd}
      onDragOver={(e) => !isMobile && e.preventDefault()}
      className={cn(
        "flex flex-col h-full overflow-hidden transition-all duration-300 group p-3 relative",
        isDragging ? "opacity-50 scale-95" : "opacity-100 scale-100",
        isSelected && "bg-blue-500/10 border-blue-500"
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggleSelect(item.id)}
        aria-label={`Select ${item.title}`}
        className={cn(
          "absolute top-2 left-2 z-10 h-5 w-5 transition-opacity",
          isSelectionMode ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
        )}
      />
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-2 mb-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
                <div className="pl-7 flex items-center">
                    <TypeIcon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                </div>
                <h3 className="font-semibold leading-tight flex-1">{item.title}</h3>
            </div>
            <div className='flex items-center gap-1'>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-80 group-hover:opacity-100">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditDialogOpen(true)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setMoveDialogOpen(true)}>
                          <Move className="mr-2 h-4 w-4" /> Move to Folder
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={handleUnwatch}>
                            <RotateCcw className="mr-2 h-4 w-4" /> Move to Watchlist
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setDeleteDialogOpen(true)} className="text-red-500 focus:text-red-500">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>

        <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-400">
            <Star className="h-5 w-5 fill-current" />
            <span className="font-bold text-base text-foreground">{item.rating?.toFixed(1) ?? 'N/A'}</span>
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-80 group-hover:opacity-100"
                onClick={() => setRateDialogOpen(true)}
            >
                <MessageSquare className="h-4 w-4" />
                <span className="sr-only">Rate and Review</span>
            </Button>
        </div>
        
        {item.notes && (
          <div className="mt-auto pt-2">
            <Collapsible open={isNoteOpen} onOpenChange={setIsNoteOpen}>
              <CollapsibleContent>
                <p className="text-xs text-muted-foreground italic">"{item.notes}"</p>
              </CollapsibleContent>
              {!isNoteOpen && isNoteLong && (
                <CollapsibleTrigger asChild>
                  <p className="text-xs text-muted-foreground italic cursor-pointer">
                    "{item.notes.substring(0, 20)}..." <span className="underline">(more)</span>
                  </p>
                </CollapsibleTrigger>
              )}
              {!isNoteLong && <p className="text-xs text-muted-foreground italic">"{item.notes}"</p>}
            </Collapsible>
          </div>
        )}

        <p className={cn("text-xs text-muted-foreground", !item.notes && "mt-auto pt-2")}>
            {formattedWatchedDate}
        </p>
      </CardContent>
    </Card>

    {/* Edit Dialog */}
    <Dialog open={editDialogOpen} onOpenChange={(isOpen) => {
        setEditDialogOpen(isOpen);
        if (isOpen) {
            setTitle(item.title);
            setIsD21(item.isD21 || false);
            form.setValue('type', item.type);
        }
    }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit "{item.title}"</DialogTitle>
            <DialogDescription>
              Update the details for this item.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={(e) => { e.preventDefault(); handleEditSaveChanges(); }} className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="movie" />
                          </FormControl>
                          <FormLabel className="font-normal flex items-center gap-2"><Film className="h-4 w-4"/> Movie</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="series" />
                          </FormControl>
                          <FormLabel className="font-normal flex items-center gap-2"><Tv className="h-4 w-4"/> Series</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <Checkbox id="isD21-edit" checked={isD21} onCheckedChange={(checked) => setIsD21(Boolean(checked))} />
                  <div className="space-y-1 leading-none">
                  <Label htmlFor="isD21-edit">D21+ (Adult Content)</Label>
                  </div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
    </Dialog>
    
    {/* Rate/Review Dialog */}
    <Dialog open={rateDialogOpen} onOpenChange={(isOpen) => {
        setRateDialogOpen(isOpen);
        if (isOpen) {
            setRating(item.rating ?? 5);
            setNotes(item.notes || '');
        }
    }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate & Review "{item.title}"</DialogTitle>
            <DialogDescription>
              Give your personal rating and add some notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <Label htmlFor="edit-rating">Your Rating</Label>
                    <span className="font-bold text-lg text-primary">{rating.toFixed(1)}</span>
                </div>
                <Slider
                    id="edit-rating"
                    min={0}
                    max={10}
                    step={0.1}
                    value={[rating]}
                    onValueChange={(value) => setRating(value[0])}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes (Optional)</Label>
                <Textarea id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRatingSaveChanges}>Save Rating</Button>
          </DialogFooter>
        </DialogContent>
    </Dialog>
    
    <MoveToFolderDialog
      open={moveDialogOpen}
      onOpenChange={setMoveDialogOpen}
      itemType={item.type}
      isWatched={item.watched}
      allFolders={allFolders}
      allItems={items}
      currentFolderId={item.folderId}
      onMove={(folderId) => {
        onMoveToFolder(item.id, folderId);
        setMoveDialogOpen(false);
      }}
    />


    {/* Delete Dialog */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete "{item.title}" from your history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({ variant: "destructive" }))}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

    