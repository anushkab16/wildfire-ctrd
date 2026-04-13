import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ExplainabilityPanelProps = {
  dominantDriver: string;
  topFactors: Array<{ name: string; value: number }>;
  changedSinceYesterday: Array<{ component: string; delta: number }>;
};

export function ExplainabilityPanel({
  dominantDriver,
  topFactors,
  changedSinceYesterday,
}: ExplainabilityPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Explainability</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">
          Dominant driver: <strong className="capitalize">{dominantDriver}</strong>
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Top factors</TableHead>
              <TableHead className="text-right">Contribution</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topFactors.map((factor) => (
              <TableRow key={factor.name}>
                <TableCell className="capitalize">{factor.name}</TableCell>
                <TableCell className="text-right">{factor.value.toFixed(4)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Changed since yesterday</TableHead>
              <TableHead className="text-right">Delta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {changedSinceYesterday.map((delta) => (
              <TableRow key={delta.component}>
                <TableCell className="capitalize">{delta.component}</TableCell>
                <TableCell className="text-right">{delta.delta.toFixed(4)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

