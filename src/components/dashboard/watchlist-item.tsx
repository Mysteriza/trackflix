
"use client";

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { GripVertical, Trash2, Move, Edit, ArrowUp, ArrowDown } from 'lucide-react';
import type { WatchlistItem, WatchlistFolder } from '@/lib/types';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { useIsMobile } from '@/hooks/use-mobile';
import { MoveToFolderDialog } from './move-to-folder-dialog';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../ui/collapsible';


interface WatchlistItemProps {
  item: WatchlistItem;
  allFolders: WatchlistFolder[];
  items: WatchlistItem[];
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  isDragging: boolean;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (id: string, updates: Partial<Omit<WatchlistItem, 'id'>>) => void;
  onDelete: (id: string) => void;
  onUpdateWatched: (item: WatchlistItem, watched: boolean) => void;
  onMoveToFolder: (itemId: string, folderId: string | null) => void;
  onMoveItem: (itemId: string, direction: 'up' | 'down') => void;
  handleDragStart: (e: React.DragEvent<HTMLDivElement>, item: WatchlistItem) => void;
  handleDragEnter: (e: React.DragEvent<HTMLDivElement>, item: WatchlistItem) => void;
  handleDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  index: number;
}

export function WatchlistItemCard({
  item,
  allFolders,
  items,
  isSelected,
  onToggleSelect,
  isDragging,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onUpdateWatched,
  onMoveToFolder,
  onMoveItem,
  handleDragStart,
  handleDragEnter,
  handleDragEnd,
  index,
}: WatchlistItemProps) {
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes || '');
  const [isD21, setIsD21] = useState(item.isD21 || false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [season, setSeason] = useState<string>((item.season ?? '').toString());
  const [episode, setEpisode] = useState<string>((item.episode ?? '').toString());
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isNoteLong = useMemo(() => (item.notes?.length || 0) > 20, [item.notes]);
  const [isNoteOpen, setIsNoteOpen] = useState(false);

  useEffect(() => {
    setSeason((item.season ?? '').toString());
    setEpisode((item.episode ?? '').toString());
  }, [item.season, item.episode]);

  const handleSaveChanges = () => {
    onUpdate(item.id, { title, notes, isD21 });
    setEditDialogOpen(false);
    toast({
      title: "Item Updated!",
      description: `Your changes for "${item.title}" have been saved.`,
    })
  };

  const handleWatchedSwitchChange = (checked: boolean) => {
    onUpdateWatched(item, checked);
  };
  
 const handleNumberInputBlur = (field: 'season' | 'episode', value: string) => {
    const num = parseInt(value, 10);
    const finalValue = !isNaN(num) && num > 0 ? num : null;
    
    // Only update if the value has actually changed
    if (finalValue !== item[field]) {
      onUpdate(item.id, { [field]: finalValue });
    }
  };
  
  return (
    <Card
      draggable={!isMobile}
      onDragStart={!isMobile ? (e) => handleDragStart(e, item) : undefined}
      onDragEnter={!isMobile ? (e) => handleDragEnter(e, item) : undefined}
      onDragEnd={!isMobile ? handleDragEnd : undefined}
      onDragOver={!isMobile ? (e) => e.preventDefault() : undefined}
      className={cn(
        "relative flex items-center p-2 sm:p-3 transition-all duration-300 group",
        isDragging ? "opacity-50 scale-95" : "opacity-100 scale-100",
        isSelected && "bg-blue-500/10 border-blue-500",
      )}
    >
      <div className="flex h-full items-center pl-1 pr-2 sm:pr-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(item.id)}
          aria-label={`Select ${item.title}`}
          className="h-5 w-5"
        />
      </div>
      {!isMobile ? (
        <div
          className={cn(
            "flex items-center self-stretch cursor-grab active:cursor-grabbing",
          )}
        >
          <div className="flex h-full items-center p-1 sm:p-2 text-muted-foreground" title="Drag to reorder">
              <GripVertical className="h-5 w-5" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col justify-center items-center px-1 sm:px-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onMoveItem(item.id, 'up')}
              disabled={isFirst}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onMoveItem(item.id, 'down')}
              disabled={isLast}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
        </div>
      )}

      <CardContent className="flex-1 p-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pl-2 pr-1">
        <div className="flex-1 min-w-0 flex items-center gap-4">
          <span className="font-semibold text-muted-foreground/80 w-6 text-center">{index + 1}.</span>
          <div className="flex-1 min-w-0">
            <p className={cn("font-semibold leading-tight break-words")}>{item.title}</p>
             {item.notes && (
              <div className="pt-1 pr-2">
                <Collapsible open={isNoteOpen} onOpenChange={setIsNoteOpen}>
                  {isNoteLong && !isNoteOpen && (
                    <CollapsibleTrigger asChild>
                      <p className="text-xs text-muted-foreground italic cursor-pointer">
                        "{item.notes.substring(0, 20)}..." <span className="underline">(more)</span>
                      </p>
                    </CollapsibleTrigger>
                  )}
                  {(isNoteLong && isNoteOpen) && (
                     <CollapsibleContent>
                        <p className="text-xs text-muted-foreground italic">"{item.notes}"</p>
                    </CollapsibleContent>
                  )}
                   {!isNoteLong && <p className="text-xs text-muted-foreground italic">"{item.notes}"</p>}
                </Collapsible>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className={cn("flex items-center gap-x-4 gap-y-2 flex-wrap min-h-[32px] justify-start")}>
            {item.isD21 && <Badge variant="destructive" className='w-fit'>D21+</Badge>}
            {item.type === 'series' && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                    <Label htmlFor={`season-${item.id}`} className={cn("text-xs transition-colors whitespace-nowrap")}>S</Label>
                    <Input
                        id={`season-${item.id}`}
                        type="number"
                        min="1"
                        className="h-8 w-16 no-spinner"
                        placeholder="1"
                        value={season}
                        onChange={(e) => setSeason(e.target.value)}
                        onBlur={(e) => handleNumberInputBlur('season', e.target.value)}
                        />
                </div>
                <div className="flex items-center gap-2">
                    <Label htmlFor={`episode-${item.id}`} className={cn("text-xs transition-colors whitespace-nowrap")}>E</Label>
                    <Input
                        id={`episode-${item.id}`}
                        type="number"
                        min="1"
                        className="h-8 w-16 no-spinner"
                        placeholder="1"
                        value={episode}
                        onChange={(e) => setEpisode(e.target.value)}
                        onBlur={(e) => handleNumberInputBlur('episode', e.target.value)}
                        />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 md:gap-2 ml-auto sm:ml-0">
               <div className="flex items-center space-x-2">
                <Switch
                  id={`watched-${item.id}`}
                  checked={item.watched}
                  onCheckedChange={handleWatchedSwitchChange}
                />
                <Label htmlFor={`watched-${item.id}`} className={cn("text-sm transition-colors")}>Watched</Label>
              </div>

              <MoveToFolderDialog
                open={moveDialogOpen}
                onOpenChange={setMoveDialogOpen}
                trigger={
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Move className="h-5 w-5 text-blue-500" />
                  </Button>
                }
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


              <Dialog open={editDialogOpen} onOpenChange={(isOpen) => {
                  setEditDialogOpen(isOpen);
                  if (isOpen) {
                      setTitle(item.title);
                      setNotes(item.notes || '');
                      setIsD21(item.isD21 || false);
                  }
              }}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-5 w-5 text-yellow-500" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Item</DialogTitle>
                    <DialogDescription>
                      Update the details for "{item.title}".
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-title">Title</Label>
                      <Input
                        id="edit-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Item title"
                      />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="edit-notes">Notes</Label>
                        <Textarea
                          id="edit-notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={4}
                          placeholder="Your notes..."
                        />
                     </div>
                    <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <Checkbox
                        id="isD21-edit"
                        checked={isD21}
                        onCheckedChange={(checked) => setIsD21(Boolean(checked))}
                      />
                      <div className="space-y-1 leading-none">
                        <Label htmlFor="isD21-edit">D21+ (Adult Content)</Label>
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                    <Button variant="outline" className='w-full sm:w-auto' onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveChanges} className='w-full sm:w-auto'>Save Changes</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-8 w-8">
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will permanently delete "{item.title}" from your watchlist. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(item.id)} className={cn(buttonVariants({ variant: "destructive" }))}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
