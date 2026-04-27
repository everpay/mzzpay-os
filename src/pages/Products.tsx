import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, TrendingUp, AlertTriangle, ShoppingCart, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notifyError, notifySuccess } from '@/lib/error-toast';
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/TablePagination';

export default function Products() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', stock: '0', category: '', product_type: 'physical', sku: '', image_url: '' });
  const [busy, setBusy] = useState(false);

  const { data: products = [], isLoading } = useQuery({ queryKey: ['products'], enabled: !!user, queryFn: async () => {
    const { data: m } = await supabase.from('merchants').select('id').eq('user_id', user!.id).single();
    if (!m) return [];
    const { data } = await supabase.from('products').select('*').eq('merchant_id', m.id).order('created_at', { ascending: false });
    return data || [];
  } });

  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  const total = products.length;
  const value = products.reduce((s, p) => s + Number(p.price) * p.stock, 0);
  const low = products.filter(p => p.stock > 0 && p.stock <= 5).length;
  const out = products.filter(p => p.stock <= 0).length;

  const openNew = () => { setEditing(null); setForm({ name: '', description: '', price: '', stock: '0', category: '', product_type: 'physical', sku: '', image_url: '' }); setOpen(true); };
  const openEdit = (p: any) => { setEditing(p); setForm({ name: p.name, description: p.description || '', price: String(p.price), stock: String(p.stock), category: p.category || '', product_type: p.product_type || 'physical', sku: p.sku || '', image_url: p.image_url || '' }); setOpen(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user) return; setBusy(true);
    try {
      const { data: m } = await supabase.from('merchants').select('id').eq('user_id', user.id).single(); if (!m) throw new Error('No merchant');
      const payload = { merchant_id: m.id, name: form.name, description: form.description, price: parseFloat(form.price), stock: parseInt(form.stock) || 0, category: form.category, product_type: form.product_type, sku: form.sku, image_url: form.image_url || null };
      const { error } = editing ? await supabase.from('products').update(payload).eq('id', editing.id) : await supabase.from('products').insert(payload);
      if (error) throw error;
      notifySuccess(editing ? 'Updated' : 'Created'); setOpen(false); qc.invalidateQueries({ queryKey: ['products'] });
    } catch (err: any) { notifyError(err.message); } finally { setBusy(false); }
  };
  const del = async (id: string) => { const { error } = await supabase.from('products').delete().eq('id', id); if (error) notifyError(error.message); else { notifySuccess('Deleted'); qc.invalidateQueries({ queryKey: ['products'] }); } };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div><h1 className="font-heading text-2xl font-bold">Products</h1><p className="text-sm text-muted-foreground">Manage your product inventory</p></div>
          <Button className="rounded-full" onClick={openNew}><Plus className="mr-2 h-4 w-4" />Add Product</Button>
        </div>
        <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-10 rounded-2xl" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Total Products</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{total}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Inventory Value</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">${value.toFixed(2)}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Low Stock</CardTitle><AlertTriangle className="h-4 w-4 text-warning" /></CardHeader><CardContent><div className="text-2xl font-bold">{low}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Out of Stock</CardTitle><ShoppingCart className="h-4 w-4 text-destructive" /></CardHeader><CardContent><div className="text-2xl font-bold">{out}</div></CardContent></Card>
        </div>
        {isLoading ? <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card> : filtered.length === 0 ? <Card><CardContent className="flex flex-col items-center justify-center py-12"><Package className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">{search ? 'No matches' : 'No products yet'}</p></CardContent></Card> : (
          <ProductGrid products={filtered} openEdit={openEdit} del={del} />
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle>{editing ? 'Edit Product' : 'New Product'}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div><Label>Name</Label><Input className="rounded-2xl" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
            <div><Label>Description</Label><Textarea className="rounded-2xl" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Price</Label><Input className="rounded-2xl" type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required /></div><div><Label>Stock</Label><Input className="rounded-2xl" type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} /></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Category</Label><Input className="rounded-2xl" value={form.category} onChange={e => setForm({...form, category: e.target.value})} /></div><div><Label>Type</Label><Select value={form.product_type} onValueChange={v => setForm({...form, product_type: v})}><SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="physical">Physical</SelectItem><SelectItem value="digital">Digital</SelectItem><SelectItem value="subscription">Subscription</SelectItem></SelectContent></Select></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>SKU</Label><Input className="rounded-2xl" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} /></div><div><Label>Image URL</Label><Input className="rounded-2xl" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} /></div></div>
            <Button type="submit" className="w-full rounded-full" disabled={busy}>{busy ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
