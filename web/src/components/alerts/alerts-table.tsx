import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type Alert = {
  id: string;
  level: string;
  status: string;
  createdAt: string;
  recipients: string[];
};

export function AlertsTable({
  alerts,
  onAcknowledge,
}: {
  alerts: Alert[];
  onAcknowledge: (id: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Level</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Recipients</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {alerts.map((alert) => (
          <TableRow key={alert.id}>
            <TableCell>{alert.level}</TableCell>
            <TableCell>{alert.status}</TableCell>
            <TableCell>{alert.recipients.join(", ") || "-"}</TableCell>
            <TableCell>{new Date(alert.createdAt).toLocaleString()}</TableCell>
            <TableCell className="text-right">
              {alert.status === "acknowledged" ? null : (
                <Button variant="outline" size="sm" onClick={() => onAcknowledge(alert.id)}>
                  Acknowledge
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

