import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
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
  MapPin, Package, ShieldCheck, RefreshCw, Plus,
} from 'lucide-react';

import { CardBrandBadge } from '@/components/CardBrandBadge';
import { notifyError, notifySuccess } from '@/lib/error-toast';

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

const emptyForm = {
  first_name: '', last_name: '', email: '',
  billing_street: '', billing_city: '', billing_state: '', billing_zip: '', billing_country: '',
  shipping_street: '', shipping_city: '', shipping_state: '', shipping_zip: '', shipping_country: '',
};

export default function Customers() {
  const { data: customers = [], isLoading } = useCustomers();
  const { data: transactions = [] } = useTransactions();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [enrichingTx, setEnrichingTx] = useState<string | null>(null);
  const [enrichedData, setEnrichedData] = useState<Record<string, any>>({});

  const activeCustomerId = viewCustomer?.id ?? editCustomer?.id ?? null;
  const { data: paymentMethods = [] } = useCustomerPaymentMethods(activeCustomerId);

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
    if (!viewCustomer) return [];
    return transactions.filter(tx => tx.customer_email === viewCustomer.email);
  }, [viewCustomer, transactions]);

  const openEdit = (c: Customer) => {
    const billing = c.billing_address || {};
    const shipping = billing?.shipping || {};
    setEditForm({
      first_name: c.first_name || '', last_name: c.last_name || '', email: c.email,
      billing_street: billing.street || '', billing_city: billing.city || '',
      billing_state: billing.state || '', billing_zip: billing.zip || '', billing_country: billing.country || '',
      shipping_street: shipping.street || '', shipping_city: shipping.city || '',
      shipping_state: shipping.state || '', shipping_zip: shipping.zip || '', shipping_country: shipping.country || '',
    });
    setEditCustomer(c);
  };

  const openAdd = () => {
    setEditForm({ ...emptyForm });
    setShowAddModal(true);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editCustomer) return;
      const { error } = await supabase.from('customers').update({
        first_name: editForm.first_name || null,
        last_name: editForm.last_name || null,
        email: editForm.email,
        billing_address: buildAddress(),
      }).eq('id', editCustomer.id);
      if (error) throw error;
    },
    onSuccess: () => {
      notifySuccess('Customer updated');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setEditCustomer(null);
    },
    onError: (e: Error) => notifyError(e.message),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: merchant } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
      if (!merchant) throw new Error('Merchant not found');
      const { error } = await supabase.from('customers').insert({
        merchant_id: merchant.id,
        email: editForm.email,
        first_name: editForm.first_name || null,
        last_name: editForm.last_name || null,
        billing_address: buildAddress(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      notifySuccess('Customer created');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowAddModal(false);
    },
    onError: (e: Error) => notifyError(e.message),
  });

  const buildAddress = () => ({
    street: editForm.billing_street, city: editForm.billing_city,
    state: editForm.billing_state, zip: editForm.billing_zip, country: editForm.billing_country,
    shipping: {
      street: editForm.shipping_street, city: editForm.shipping_city,
      state: editForm.shipping_state, zip: editForm.shipping_zip, country: editForm.shipping_country,
    },
  });

  const handleEnrich = async (txId: string, cardLast4?: string) => {
    if (!cardLast4) { notifyError('No card data available'); return; }
    setEnrichingTx(txId);
    try {
      const res = await enrichWithTapix(cardLast4);
      if (res.success && res.enrichment) {
        setEnrichedData(prev => ({ ...prev, [txId]: res.enrichment }));
        notifySuccess('Transaction enriched with Tapix');
      } else {
        notifyError(res.error || 'Enrichment failed');
      }
    } catch {
      notifyError('Enrichment failed');
    }
    setEnrichingTx(null);
  };

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditForm(f => ({ ...f, [key]: e.target.value }));

  const renderFormFields = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">First Name</Label><Input value={editForm.first_name} onChange={f('first_name')} placeholder="John" /></div>
        <div><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Name</Label><Input value={editForm.last_name} onChange={f('last_name')} placeholder="Doe" /></div>
      </div>
      <div><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</Label><Input value={editForm.email} onChange={f('email')} placeholder="john@example.com" type="email" /></div>

      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3"><MapPin className="h-4 w-4 text-primary" /> Billing Address</h4>
        <div className="space-y-3">
          <div><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Street</Label><Input value={editForm.billing_street} onChange={f('billing_street')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">City</Label><Input value={editForm.billing_city} onChange={f('billing_city')} /></div>
            <div><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">State</Label><Input value={editForm.billing_state} onChange={f('billing_state')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ZIP</Label><Input value={editForm.billing_zip} onChange={f('billing_zip')} /></div>
            <div><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Country</Label><Input value={editForm.billing_country} onChange={f('billing_country')} /></div>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3"><MapPin className="h-4 w-4 text-primary" /> Shipping Address</h4>
        <div className="space-y-3">
          <div><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Street</Label><Input value={editForm.shipping_street} onChange={f('shipping_street')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">City</Label><Input value={editForm.shipping_city} onChange={f('shipping_city')} /></div>
            <div><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">State</Label><Input value={editForm.shipping_state} onChange={f('shipping_state')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ZIP</Label><Input value={editForm.shipping_zip} onChange={f('shipping_zip')} /></div>
            <div><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Country</Label><Input value={editForm.shipping_country} onChange={f('shipping_country')} /></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your customer records and payment history</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button onClick={openAdd} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Add Customer
          </Button>
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
            <p className="text-muted-foreground font-medium">{search ? 'No customers match your search' : 'No customers yet'}</p>
            <Button onClick={openAdd} variant="outline" className="mt-4 gap-2">
              <Plus className="h-4 w-4" /> Add your first customer
            </Button>
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
                      <TableCell className="font-semibold text-foreground">
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
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewCustomer(c)} className="gap-2">
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

      {/* View Customer — Side Drawer */}
      <Sheet open={!!viewCustomer} onOpenChange={() => setViewCustomer(null)}>
        <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-primary" />
              {viewCustomer?.first_name || viewCustomer?.last_name
                ? `${viewCustomer?.first_name || ''} ${viewCustomer?.last_name || ''}`.trim()
                : viewCustomer?.email}
            </SheetTitle>
            <SheetDescription>{viewCustomer?.email}</SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="details" className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex-1 gap-1.5"><UserCircle className="h-3.5 w-3.5" /> Details</TabsTrigger>
              <TabsTrigger value="purchases" className="flex-1 gap-1.5"><Package className="h-3.5 w-3.5" /> Purchases</TabsTrigger>
              <TabsTrigger value="cards" className="flex-1 gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Cards</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</Label><p className="text-sm font-semibold text-foreground">{viewCustomer?.email}</p></div>
                <div><Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created</Label><p className="text-sm font-semibold text-foreground">{viewCustomer ? format(new Date(viewCustomer.created_at), 'PPP') : ''}</p></div>
              </div>
              {(() => {
                const addr = viewCustomer?.billing_address as any;
                const ship = addr?.shipping;
                return (
                  <div className="grid grid-cols-1 gap-4">
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
                            <span className="font-semibold text-foreground">{formatCurrency(tx.amount, tx.currency)}</span>
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
                            <p className="font-semibold text-foreground">•••• {pm.card_last4}</p>
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
        </SheetContent>
      </Sheet>

      {/* Edit Customer — Modal */}
      <Dialog open={!!editCustomer} onOpenChange={() => setEditCustomer(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" /> Edit Customer
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2">{renderFormFields()}</div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditCustomer(null)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Customer — Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Add Customer
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2">{renderFormFields()}</div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !editForm.email}>
              {createMutation.isPending ? 'Creating...' : 'Create Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
