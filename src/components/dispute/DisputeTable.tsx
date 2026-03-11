import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from './StatusBadge';
import { EvidenceScore } from './EvidenceScore';
import { Chargeback, ChargebackDispute } from '@/lib/dispute-types';
import { format } from 'date-fns';

interface DisputeTableProps {
  chargebacks: Chargeback[];
  disputes: ChargebackDispute[];
  basePath: string;
  showMerchant?: boolean;
}

export function DisputeTable({ chargebacks, disputes, basePath, showMerchant = false }: DisputeTableProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ID</TableHead>
            {showMerchant && <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Merchant</TableHead>}
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Processor</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {chargebacks.map((cb) => {
            const dispute = disputes.find(d => d.chargeback_id === cb.id);
            return (
              <TableRow
                key={cb.id}
                className="cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => navigate(`${basePath}/${cb.id}`)}
              >
                <TableCell className="font-mono text-xs text-muted-foreground">{cb.id.slice(-8)}</TableCell>
                {showMerchant && <TableCell className="text-sm font-medium">{cb.merchant_name}</TableCell>}
                <TableCell className="text-sm font-semibold">
                  {new Intl.NumberFormat('en', { style: 'currency', currency: cb.currency }).format(cb.amount)}
                </TableCell>
                <TableCell>
                  <div>
                    <span className="text-sm">{cb.reason_description}</span>
                    <span className="block text-xs text-muted-foreground font-mono">{cb.reason_code}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{cb.processor_name}</TableCell>
                <TableCell>{dispute ? <EvidenceScore score={dispute.evidence_score} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                <TableCell><StatusBadge status={cb.status} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(cb.created_at), 'MMM d, HH:mm')}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}