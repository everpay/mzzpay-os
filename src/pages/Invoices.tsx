import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Send, Copy, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { Currency } from '@/lib/types';
import { InvoiceLineItems, LineItem } from '@/components/InvoiceLineItems';

export default function Invoices() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: merchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!merchant) throw new Error('Merchant not found');

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Auto-calculate amount from line items
  const itemsTotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const handleLineItemsChange = (items: LineItem[]) => {
    setLineItems(items);
    if (items.length > 0) {
      const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      setAmount(total.toFixed(2));
    }
  };

  const handleCreate = async () => {
    if (!amount || !customerEmail) {
      toast.error('Amount and email are required');
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: merchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!merchant) throw new Error('Merchant not found');

      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

      const { error } = await supabase.from('invoices').insert({
        merchant_id: merchant.id,
        customer_email: customerEmail,
        customer_name: customerName,
        amount: parseFloat(amount),
        currency,
        description,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        notes,
        invoice_number: invoiceNumber,
        status: 'draft',
        items: lineItems.length > 0 ? lineItems as any : null,
      });

      if (error) throw error;

      toast.success('Invoice created');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowCreate(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error('Failed to create invoice');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSend = async (invoiceId: string) => {
    try {
      // Get the invoice data for the email
      const inv = invoices?.find((i: any) => i.id === invoiceId);
      if (!inv) throw new Error('Invoice not found');

      const { error } = await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoiceId);

      if (error) throw error;

      // Send email notification with payment link
      const paymentUrl = `${window.location.origin}/pay/${invoiceId}`;
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          type: 'invoice_sent',
          to: inv.customer_email,
          data: {
            invoice_number: inv.invoice_number,
            amount: inv.amount,
            currency: inv.currency,
            customer_name: inv.customer_name,
            description: inv.description,
            due_date: inv.due_date,
            payment_url: paymentUrl,
            items: inv.items,
          },
        },
      });

      toast.success('Invoice sent with payment link emailed to customer');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (err) {
      console.error(err);
      toast.error('Failed to send invoice');
    }
  };

  const getPaymentUrl = (invoiceId: string) => `${window.location.origin}/pay/${invoiceId}`;

  const copyPaymentLink = (invoiceId: string) => {
    navigator.clipboard.writeText(getPaymentUrl(invoiceId));
    toast.success('Payment link copied');
  };

  const resetForm = () => {
    setCustomerEmail('');
    setCustomerName('');
    setAmount('');
    setCurrency('USD');
    setDescription('');
    setDueDate('');
    setNotes('');
    setLineItems([]);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'sent': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'overdue': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'draft': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create and manage payment invoices</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Create Invoice</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Customer Name</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Customer Email *</Label>
                  <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="john@example.com" required />
                </div>
              </div>

              <InvoiceLineItems items={lineItems} onChange={handleLineItemsChange} currency={currency} />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Total Amount *</Label>
                  <Input
                    type="number" value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00" min="0.01" step="0.01" required
                    className={lineItems.length > 0 ? 'bg-muted' : ''}
                    readOnly={lineItems.length > 0}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Currency</Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="BRL">BRL</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Invoice for..." rows={2} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Due Date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." rows={2} />
              </div>
              <Button className="w-full gap-2" onClick={handleCreate} disabled={isCreating}>
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Invoice
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : !invoices?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">No Invoices Yet</p>
            <p className="text-sm text-muted-foreground">Create your first invoice to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv: any) => (
            <Card key={inv.id} className="hover:border-primary/20 transition-colors">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{inv.invoice_number}</p>
                      <Badge className={statusColor(inv.status)}>{inv.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {inv.customer_name || inv.customer_email} · {formatCurrency(inv.amount, inv.currency)}
                      {Array.isArray(inv.items) && inv.items.length > 0 && ` · ${inv.items.length} item${inv.items.length > 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {inv.status === 'draft' && (
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => handleSend(inv.id)}>
                      <Send className="h-3 w-3" /> Send
                    </Button>
                  )}
                  {['sent', 'overdue'].includes(inv.status) && (
                    <>
                      <Button variant="ghost" size="sm" className="gap-1" onClick={() => copyPaymentLink(inv.id)}>
                        <Copy className="h-3 w-3" /> Copy Link
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1" onClick={() => window.open(getPaymentUrl(inv.id), '_blank')}>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
