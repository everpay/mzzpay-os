import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import { enrichWithTapix } from '@/lib/tapix';
import {
  Search, MoreHorizontal, Eye, Pencil, UserCircle, CreditCard,
  MapPin, Package, ShieldCheck, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { CardBrandBadge } from '@/components/CardBrandBadge';

interface Customer {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  billing_address: any;
  merchant_id: string;
  created_at: string;
  updated_at: string;
}

function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: merchant } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
      if (!merchant) throw new Error('Merchant not found');
      const { data, error } = await supabase.from('customers').select('*').eq('merchant_id', merchant.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data as Customer[];
    },
  });
}

function useCustomerPaymentMethods(customerId: string | null) {
  return useQuery({
    queryKey: ['customer-payment-methods', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase.from('payment_methods').select('*').eq('customer_id', customerId!);
      if (error) throw error;
      return data;
    },
  });
}

export default function Customers() {
  const { data: customers = [], isLoading } = useCustomers();
  const { data: transactions = [] } = useTransactions();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: '', last_name: '', email: '',
    billing_street: '', billing_city: '', billing_state: '', billing_zip: '', billing_country: '',
    shipping_street: '', shipping_city: '', shipping_state: '', shipping_zip: '', shipping_country: '',
  });
  const [enrichingTx, setEnrichingTx] = useState<string | null>(null);
  const [enrichedData, setEnrichedData] = useState<Record<string, any>>({});

  const { data: paymentMethods = [] } = useCustomerPaymentMethods(selectedCustomer?.id ?? editCustomer?.id ?? null);

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(c =>
      c.email.toLowerCase().includes(q) ||
      (c.first_name || '').toLowerCase().includes(q) ||
      (c.last_name || '').toLowerCase().includes(q)
    );
  }, [customers, search]);

  const customerTransactions = useMemo(() => {
    if (!selectedCustomer) return [];
    return transactions.filter(tx => tx.customer_email === selectedCustomer.email);
  }, [selectedCustomer, transactions]);

  const openEdit = (c: Customer) => {
    const billing = c.billing_address || {};
    const shipping = (c.billing_address as any)?.shipping || {};
    setEditForm({
      first_name: c.first_name || '', last_name: c.last_name || '', email: c.email,
      billing_street: billing.street || '', billing_city: billing.city || '',
      billing_state: billing.state || '', billing_zip: billing.zip || '', billing_country: billing.country || '',
      shipping_street: shipping.street || '', shipping_city: shipping.city || '',
      shipping_state: shipping.state || '', shipping_zip: shipping.zip || '', shipping_country: shipping.country || '',
    });
    setEditCustomer(c);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editCustomer) return;
      const { error } = await supabase.from('customers').update({
        first_name: editForm.first_name || null,
        last_name: editForm.last_name || null,
        email: editForm.email,
        billing_address: {
          street: editForm.billing_street, city: editForm.billing_city,
          state: editForm.billing_state, zip: editForm.billing_zip, country: editForm.billing_country,
          shipping: {
            street: editForm.shipping_street, city: editForm.shipping_city,
            state: editForm.shipping_state, zip: editForm.shipping_zip, country: editForm.shipping_country,
          },
        },
      }).eq('id', editCustomer.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Customer updated');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setEditCustomer(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleEnrich = async (txId: string, cardLast4?: string) => {
    if (!cardLast4) { toast.error('No card data available'); return; }
    setEnrichingTx(txId);
    try {
      const res = await enrichWithTapix(cardLast4);
      if (res.success && res.enrichment) {
        setEnrichedData(prev => ({ ...prev, [txId]: res.enrichment }));
        toast.success('Transaction enriched with Tapix');
      } else {
        toast.error(res.error || 'Enrichment failed');
      }
    } catch {
      toast.error('Enrichment failed');
    }
    setEnrichingTx(null);
  };

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your customer records and payment history</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 rounded-xl border border-border bg-card">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <UserCircle className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{search ? 'No customers match your search' : 'No customers yet'}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden md:table-cell">Location</TableHead>
                  <TableHead className="hidden md:table-cell">Created</TableHead>
                  <TableHead className="w-[60px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => {
                  const addr = c.billing_address as any;
                  return (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium text-foreground">
                        {c.first_name || c.last_name ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.email}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {addr?.city ? `${addr.city}, ${addr.country || ''}` : '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {format(new Date(c.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedCustomer(c)} className="gap-2">
                              <Eye className="h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(c)} className="gap-2">
                              <Pencil className="h-4 w-4" /> Edit Customer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* View Customer Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-primary" />
              {selectedCustomer?.first_name || selectedCustomer?.last_name
                ? `${selectedCustomer?.first_name || ''} ${selectedCustomer?.last_name || ''}`.trim()
                : selectedCustomer?.email}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="details" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex-1 gap-1.5"><UserCircle className="h-3.5 w-3.5" /> Details</TabsTrigger>
              <TabsTrigger value="purchases" className="flex-1 gap-1.5"><Package className="h-3.5 w-3.5" /> Purchases</TabsTrigger>
              <TabsTrigger value="cards" className="flex-1 gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Cards</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-muted-foreground">Email</Label><p className="text-sm font-medium text-foreground">{selectedCustomer?.email}</p></div>
                <div><Label className="text-xs text-muted-foreground">Created</Label><p className="text-sm font-medium text-foreground">{selectedCustomer ? format(new Date(selectedCustomer.created_at), 'PPP') : ''}</p></div>
              </div>
              {(() => {
                const addr = selectedCustomer?.billing_address as any;
                const ship = addr?.shipping;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Billing Address</CardTitle></CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        {addr?.street ? (<>{addr.street}<br />{addr.city}, {addr.state} {addr.zip}<br />{addr.country}</>) : 'Not set'}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Shipping Address</CardTitle></CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        {ship?.street ? (<>{ship.street}<br />{ship.city}, {ship.state} {ship.zip}<br />{ship.country}</>) : 'Not set'}
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}
            </TabsContent>

            <TabsContent value="purchases" className="mt-4">
              {customerTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No purchase history</div>
              ) : (
                <div className="space-y-3">
                  {customerTransactions.map(tx => (
                    <Card key={tx.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{formatCurrency(tx.amount, tx.currency)}</span>
                            <Badge variant={tx.status === 'completed' ? 'default' : tx.status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">
                              {tx.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(tx.created_at), 'PPP p')} · {tx.provider}
                            {tx.description && ` · ${tx.description}`}
                          </p>
                          {enrichedData[tx.id] && (
                            <div className="mt-1 flex flex-wrap gap-2">
                              {enrichedData[tx.id].merchant_name && <Badge variant="outline" className="text-xs">🏪 {enrichedData[tx.id].merchant_name}</Badge>}
                              {enrichedData[tx.id].category && <Badge variant="outline" className="text-xs">📂 {enrichedData[tx.id].category}</Badge>}
                              {enrichedData[tx.id].processor && <Badge variant="outline" className="text-xs">⚡ {enrichedData[tx.id].processor}</Badge>}
                              {enrichedData[tx.id].location?.city && <Badge variant="outline" className="text-xs">📍 {enrichedData[tx.id].location.city}, {enrichedData[tx.id].location.country}</Badge>}
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleEnrich(tx.id, tx.provider_ref?.slice(-4))} disabled={enrichingTx === tx.id} className="gap-1.5 text-xs">
                          {enrichingTx === tx.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                          Enrich
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="cards" className="mt-4">
              {paymentMethods.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No saved cards</div>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map(pm => (
                    <Card key={pm.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardBrandBadge brand={pm.card_brand || 'unknown'} />
                          <div>
                            <p className="font-medium text-foreground">•••• {pm.card_last4}</p>
                            <p className="text-xs text-muted-foreground">
                              Exp {pm.exp_month}/{pm.exp_year}
                              {pm.is_default && <Badge variant="secondary" className="ml-2 text-[10px]">Default</Badge>}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs gap-1">
                          <ShieldCheck className="h-3 w-3" /> VGS Vaulted
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={!!editCustomer} onOpenChange={() => setEditCustomer(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" /> Edit Customer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First Name</Label><Input value={editForm.first_name} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} /></div>
              <div><Label>Last Name</Label><Input value={editForm.last_name} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} /></div>
            </div>
            <div><Label>Email</Label><Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>

            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3"><MapPin className="h-4 w-4 text-primary" /> Billing Address</h4>
              <div className="space-y-3">
                <div><Label>Street</Label><Input value={editForm.billing_street} onChange={e => setEditForm(f => ({ ...f, billing_street: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>City</Label><Input value={editForm.billing_city} onChange={e => setEditForm(f => ({ ...f, billing_city: e.target.value }))} /></div>
                  <div><Label>State</Label><Input value={editForm.billing_state} onChange={e => setEditForm(f => ({ ...f, billing_state: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>ZIP</Label><Input value={editForm.billing_zip} onChange={e => setEditForm(f => ({ ...f, billing_zip: e.target.value }))} /></div>
                  <div><Label>Country</Label><Input value={editForm.billing_country} onChange={e => setEditForm(f => ({ ...f, billing_country: e.target.value }))} /></div>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3"><MapPin className="h-4 w-4 text-primary" /> Shipping Address</h4>
              <div className="space-y-3">
                <div><Label>Street</Label><Input value={editForm.shipping_street} onChange={e => setEditForm(f => ({ ...f, shipping_street: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>City</Label><Input value={editForm.shipping_city} onChange={e => setEditForm(f => ({ ...f, shipping_city: e.target.value }))} /></div>
                  <div><Label>State</Label><Input value={editForm.shipping_state} onChange={e => setEditForm(f => ({ ...f, shipping_state: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>ZIP</Label><Input value={editForm.shipping_zip} onChange={e => setEditForm(f => ({ ...f, shipping_zip: e.target.value }))} /></div>
                  <div><Label>Country</Label><Input value={editForm.shipping_country} onChange={e => setEditForm(f => ({ ...f, shipping_country: e.target.value }))} /></div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditCustomer(null)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
