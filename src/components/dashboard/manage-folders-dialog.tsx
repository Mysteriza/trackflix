"use client";

import { useState, useEffect, ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Folder, Edit, Trash2, Loader2, FolderCog, X } from 'lucide-react';
import { WatchlistFolder } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface ManageFoldersDialogProps {
  allFolders: WatchlistFolder[];
  itemsCountMap: Record<string, number>; // Map folderId ke jumlah item
  onEditFolder: (folderId: string, newName: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onBulkDeleteFolders: (folderIds: string[]) => Promise<void>;
  trigger?: ReactNode;
}

const editFormSchema = z.object({
  name: z.string().min(1, 'Folder name is required'),
});

export function ManageFoldersDialog({
  allFolders,
  itemsCountMap,
  onEditFolder,
  onDeleteFolder,
  onBulkDeleteFolders,
  trigger
}: ManageFoldersDialogProps) {
  const [open, setOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<WatchlistFolder | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<WatchlistFolder | null>(null);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const editForm = useForm<z.infer<typeof editFormSchema>>({
    resolver: zodResolver(editFormSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (folderToEdit) {
      editForm.reset({ name: folderToEdit.name });
    }
  }, [folderToEdit, editForm]);

  // Reset selection when main dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedFolderIds([]);
      setIsProcessing(false);
    }
  }, [open]);

  const handleEditClick = (folder: WatchlistFolder) => {
    setFolderToEdit(folder);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (folder: WatchlistFolder) => {
    setFolderToDelete(folder);
    setIsDeleteDialogOpen(true);
  };

  const handleBulkDeleteClick = () => {
    if (selectedFolderIds.length > 0) {
      setIsBulkDeleteDialogOpen(true);
    } else {
      toast({
        variant: "destructive",
        title: "No Folders Selected",
        description: "Please select at least one folder to delete.",
      });
    }
  };

  const executeEdit = async (values: z.infer<typeof editFormSchema>) => {
    if (!folderToEdit) return;
    const trimmedName = values.name.trim();
    if (trimmedName.toLowerCase() !== folderToEdit.name.toLowerCase() && allFolders.some(f => f.id !== folderToEdit.id && f.name.toLowerCase() === trimmedName.toLowerCase())) {
        toast({
            variant: "destructive",
            title: "Folder Already Exists",
            description: `A folder named "${trimmedName}" already exists.`,
        });
        return;
    }
    setIsProcessing(true);
    try {
        await onEditFolder(folderToEdit.id, trimmedName);
        setIsEditDialogOpen(false);
        setFolderToEdit(null);
    } finally {
        setIsProcessing(false);
    }
  };

  const executeDelete = async () => {
    if (!folderToDelete) return;
    setIsProcessing(true);
    try {
        await onDeleteFolder(folderToDelete.id);
        setIsDeleteDialogOpen(false);
        setFolderToDelete(null);
        setSelectedFolderIds(prev => prev.filter(id => id !== folderToDelete.id)); // Hapus dari seleksi jika terhapus
    } finally {
        setIsProcessing(false);
    }
  };

  const executeBulkDelete = async () => {
    if (selectedFolderIds.length === 0) return;
    setIsProcessing(true);
    try {
        await onBulkDeleteFolders(selectedFolderIds);
        setIsBulkDeleteDialogOpen(false);
        setSelectedFolderIds([]); // Kosongkan seleksi setelah hapus
    } finally {
        setIsProcessing(false);
    }
  };

  const toggleSelectFolder = (folderId: string) => {
    setSelectedFolderIds(prev =>
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedFolderIds(checked ? allFolders.map(f => f.id) : []);
  };

  const isAllSelected = allFolders.length > 0 && selectedFolderIds.length === allFolders.length;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline">
              <FolderCog className="mr-2 h-4 w-4" /> Manage Folders
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-xl h-[90vh] sm:h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Folders</DialogTitle>
            <DialogDescription>
              View, rename, and delete your folders here. Empty folders are also shown.
            </DialogDescription>
          </DialogHeader>

          {allFolders.length > 0 && (
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all-folders"
                  checked={isAllSelected}
                  onCheckedChange={toggleSelectAll}
                />
                <Label htmlFor="select-all-folders" className="text-sm font-medium">
                  Select All ({selectedFolderIds.length}/{allFolders.length})
                </Label>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDeleteClick}
                disabled={selectedFolderIds.length === 0 || isProcessing}
              >
                 {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete Selected
              </Button>
            </div>
          )}

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="py-4 space-y-2">
              {allFolders.length === 0 ? (
                <p className="text-center text-muted-foreground pt-10">You haven't created any folders yet.</p>
              ) : (
                allFolders.map(folder => {
                  const itemCount = itemsCountMap[folder.id] || 0;
                  return (
                    <Card key={folder.id} className={cn("p-2 sm:p-3 transition-colors", selectedFolderIds.includes(folder.id) && "bg-muted/50 border-primary")}>
                      <CardContent className="p-0 flex items-center justify-between gap-2 sm:gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Checkbox
                            id={`select-folder-${folder.id}`}
                            checked={selectedFolderIds.includes(folder.id)}
                            onCheckedChange={() => toggleSelectFolder(folder.id)}
                            className="shrink-0"
                          />
                          <Folder className="h-5 w-5 text-primary shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{folder.name}</p>
                            <p className="text-xs text-muted-foreground">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center shrink-0">
                           <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/10"
                              onClick={() => handleEditClick(folder)}
                              disabled={isProcessing}
                            >
                              <Edit className="h-4 w-4" />
                           </Button>
                           <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                              onClick={() => handleDeleteClick(folder)}
                              disabled={isProcessing}
                            >
                              <Trash2 className="h-4 w-4" />
                           </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
           <DialogFooter className="mt-auto pt-4 border-t">
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Folder Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Enter a new name for the "{folderToEdit?.name}" folder.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(executeEdit)} className="space-y-8 py-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Folder Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsEditDialogOpen(false)} disabled={isProcessing}>Cancel</Button>
                <Button type="submit" disabled={isProcessing || !editForm.formState.isValid || editForm.getValues("name") === folderToEdit?.name}>
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Single Folder Alert */}
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{folderToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? Items inside will be moved to your standalone list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} disabled={isProcessing} className={cn(buttonVariants({ variant: "destructive" }))}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Folders Alert */}
       <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedFolderIds.length} Folders?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? Items inside these folders will be moved to your standalone list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeBulkDelete} disabled={isProcessing} className={cn(buttonVariants({ variant: "destructive" }))}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Selected Folders
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}