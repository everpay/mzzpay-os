import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface TablePaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  from: number;
  to: number;
  canPrev: boolean;
  canNext: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  label?: string;
  className?: string;
}

const DEFAULT_OPTIONS = [10, 25, 50, 100];

export function TablePagination({
  page,
  pageCount,
  pageSize,
  total,
  from,
  to,
  canPrev,
  canNext,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_OPTIONS,
  label = 'rows',
  className = '',
}: TablePaginationProps) {
  if (total === 0) return null;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 px-1 py-3 text-xs text-muted-foreground ${className}`}>
      <div>
        Showing <span className="font-medium text-foreground">{from.toLocaleString()}</span>–
        <span className="font-medium text-foreground">{to.toLocaleString()}</span> of{' '}
        <span className="font-medium text-foreground">{total.toLocaleString()}</span> {label}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-8 w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={!canPrev}
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page - 1)}
            disabled={!canPrev}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-foreground tabular-nums">
            Page <span className="font-medium">{page}</span> of {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page + 1)}
            disabled={!canNext}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(pageCount)}
            disabled={!canNext}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
