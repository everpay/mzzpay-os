import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { BarChart3, FileText, TrendingUp, Users, Scale, Landmark } from 'lucide-react';

export default function Reports() {
  const navigate = useNavigate();
  const cards = [
    { title: 'Transaction Overview', description: 'Revenue, methods, volume.', icon: BarChart3, link: '/analytics' },
    { title: 'Customer Analytics', description: 'Acquisition, retention, LTV.', icon: Users, link: '/customers' },
    { title: 'Settlement Reports', description: 'Batch breakdowns, fee analysis.', icon: Landmark, link: '/settlements' },
    { title: 'Reconciliation', description: 'Variance analysis, matching.', icon: Scale, link: '/reconciliation' },
    { title: 'Subscription MRR/ARR', description: 'Recurring revenue, churn.', icon: TrendingUp, link: '/subscriptions' },
    { title: 'Refund Activity', description: 'Refund history and trends.', icon: FileText, link: '/refunds' },
  ];
  return (
    <AppLayout>
      <div className="space-y-6">
        <div><h1 className="font-heading text-2xl font-bold">Reports</h1><p className="text-sm text-muted-foreground mt-1">View and analyze your business data</p></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map(c => (
            <Card key={c.title} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(c.link)}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><c.icon className="h-5 w-5 text-primary" /></div>
                  <div><CardTitle className="text-lg">{c.title}</CardTitle><CardDescription>{c.description}</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent><Button variant="outline" size="sm" className="rounded-full">View Report →</Button></CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
