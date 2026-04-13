import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ForecastTabsProps = {
  forecasts: Array<{
    horizonHours: number;
    riskScore: number;
    level: string;
    interval: { low: number; high: number };
    components: Record<string, number>;
    contributions: Record<string, number>;
  }>;
};

function SimpleMetricTable({ data }: { data: Record<string, number> }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Component</TableHead>
          <TableHead className="text-right">Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Object.entries(data).map(([k, v]) => (
          <TableRow key={k}>
            <TableCell className="capitalize">{k}</TableCell>
            <TableCell className="text-right">{v.toFixed(4)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function ForecastTabs({ forecasts }: ForecastTabsProps) {
  const first = forecasts[0];
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Forecast Overview</TabsTrigger>
        <TabsTrigger value="components">Components</TabsTrigger>
        <TabsTrigger value="contributions">Contributions</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="text-sm">
        {forecasts.map((forecast) => (
          <p key={forecast.horizonHours}>
            +{forecast.horizonHours}h: score <strong>{forecast.riskScore.toFixed(3)}</strong>, level{" "}
            <strong>{forecast.level}</strong>, interval [{forecast.interval.low.toFixed(3)} -{" "}
            {forecast.interval.high.toFixed(3)}]
          </p>
        ))}
      </TabsContent>
      <TabsContent value="components">{first ? <SimpleMetricTable data={first.components} /> : null}</TabsContent>
      <TabsContent value="contributions">
        {first ? <SimpleMetricTable data={first.contributions} /> : null}
      </TabsContent>
    </Tabs>
  );
}

