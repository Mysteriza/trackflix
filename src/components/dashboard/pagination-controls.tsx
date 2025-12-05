
"use client";

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PaginationControlsProps {
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  itemsPerPageOptions: number[];
}

export function PaginationControls({
  currentPage,
  pageCount,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  itemsPerPageOptions,
}: PaginationControlsProps) {

  const handleItemsPerPageChange = (value: string) => {
    onItemsPerPageChange(Number(value));
    onPageChange(1); // Reset to first page
  };

  return (
    <div className="flex items-center justify-between px-2 pt-4">
      <div className="flex-1 text-sm text-muted-foreground">
        Page {currentPage} of {pageCount}
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        {itemsPerPageOptions.length > 1 && (
            <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
                value={`${itemsPerPage}`}
                onValueChange={handleItemsPerPageChange}
            >
                <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={itemsPerPage} />
                </SelectTrigger>
                <SelectContent side="top">
                {itemsPerPageOptions.map((option) => (
                    <SelectItem key={option} value={`${option}`}>
                    {option}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
            </div>
        )}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= pageCount}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
