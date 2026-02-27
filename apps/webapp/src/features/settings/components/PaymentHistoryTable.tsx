import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

interface PaymentItem {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  invoiceUrl: string | null;
  occurredAt: string;
}

interface PaymentHistoryTableProps {
  items: PaymentItem[];
  total: number;
}

const STATUS_STYLES: Record<string, string> = {
  paid: "text-green-600",
  failed: "text-red-600",
  pending: "text-yellow-600",
  refunded: "text-blue-600",
};

export function PaymentHistoryTable({ items, total }: PaymentHistoryTableProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">
        Payment History
      </h3>
      {total === 0 ? (
        <div className="border rounded-lg p-6 text-center text-muted-foreground">
          No payments yet. Billing will start after pilot.
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {new Date(item.occurredAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    ${(item.amount / 100).toFixed(2)} {item.currency}
                  </TableCell>
                  <TableCell>
                    <span className={STATUS_STYLES[item.status] ?? ""}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {item.invoiceUrl ? (
                      <a
                        href={item.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline text-sm"
                      >
                        Download
                      </a>
                    ) : (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
