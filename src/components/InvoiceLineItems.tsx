import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Currency } from '@/lib/types';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

export interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface InvoiceLineItemsProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  currency: string;
}

export function InvoiceLineItems({ items, onChange, currency }: InvoiceLineItemsProps) {
  const addItem = () => {
    onChange([...items, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Line Items</Label>
        <Button type="button" variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={addItem}>
          <Plus className="h-3 w-3" /> Add Item
        </Button>
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_60px_80px_28px] gap-2 items-end">
              <div>
                {i === 0 && <Label className="text-[10px] text-muted-foreground">Description</Label>}
                <Input
                  value={item.description}
                  onChange={(e) => updateItem(i, 'description', e.target.value)}
                  placeholder="Item description"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                {i === 0 && <Label className="text-[10px] text-muted-foreground">Qty</Label>}
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                  min={1}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                {i === 0 && <Label className="text-[10px] text-muted-foreground">Price</Label>}
                <Input
                  type="number"
                  value={item.unit_price}
                  onChange={(e) => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                  min={0}
                  step="0.01"
                  className="h-8 text-xs"
                />
              </div>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-7 p-0" onClick={() => removeItem(i)}>
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          ))}

          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">Items Total</span>
            <span className="text-sm font-medium text-foreground">{formatCurrency(total, currency)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
