
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, ReactNode } from 'react';
import { PlusCircle, Loader2, Film, Tv } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { WatchlistItem } from '@/lib/types';
import { Textarea } from '../ui/textarea';


const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['movie', 'series']),
  isD21: z.boolean().default(false),
  notes: z.string().optional(),
  watched: z.boolean().default(false),
});


interface AddItemDialogProps {
  onAddItem: (item: Omit<WatchlistItem, 'id' | 'order' | 'userId' | 'folderId'>) => void;
  children?: ReactNode;
}

export function AddItemDialog({ onAddItem, children }: AddItemDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      type: 'movie',
      isD21: false,
      notes: '',
      watched: false,
    },
  });
  
  const currentType = form.watch('type');

  const resetForm = () => {
    form.reset();
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    const newItem = {
      title: values.title,
      type: values.type,
      isD21: values.isD21,
      notes: values.notes,
      watched: values.watched,
    };
    onAddItem(newItem);
    resetForm();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
            resetForm();
        }
    }}>
      <DialogTrigger asChild>
        {children ?? (
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Movie/Series
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to Watchlist</DialogTitle>
          <DialogDescription>
            Manually add a movie or series to your personal watchlist.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
             <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                    <FormControl>
                        <Input 
                          placeholder={currentType === 'movie' ? "e.g., The Matrix" : "e.g., Breaking Bad"}
                          {...field} 
                          autoComplete="off"
                        />
                    </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Recommended by a friend."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isD21"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        D21+
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="watched"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Mark as Watched
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
               <Button variant="outline" type="button" className='w-full sm:w-auto' onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting || !form.getValues('title')} className='w-full sm:w-auto'>
                 {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Item
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
