import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type Watchlist = {
  id: string;
  name: string;
  region: { latitude: number; longitude: number; radiusKm: number };
  enabled: boolean;
};

export function WatchlistTable({
  watchlists,
  onToggle,
}: {
  watchlists: Watchlist[];
  onToggle: (id: string, enabled: boolean) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Region</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {watchlists.map((watchlist) => (
          <TableRow key={watchlist.id}>
            <TableCell>{watchlist.name}</TableCell>
            <TableCell>
              {watchlist.region.latitude.toFixed(2)}, {watchlist.region.longitude.toFixed(2)}
            </TableCell>
            <TableCell>{watchlist.enabled ? "Enabled" : "Disabled"}</TableCell>
            <TableCell className="text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggle(watchlist.id, !watchlist.enabled)}
              >
                {watchlist.enabled ? "Disable" : "Enable"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

