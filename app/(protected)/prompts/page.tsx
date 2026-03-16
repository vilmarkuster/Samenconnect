import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

const MOCK_PROMPTS = [
  { id: 1, name: "Daily standup summary", category: "Meetings" },
  { id: 2, name: "Bug triage assistant", category: "Engineering" },
  { id: 3, name: "Customer reply draft", category: "Support" }
];

export default function PromptsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Prompt Library"
        description="Centralize and version the prompts your agents and workflows use."
        children={<Button>Create prompt</Button>}
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Input
              placeholder="Search prompts…"
              className="md:max-w-xs"
              autoComplete="off"
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Import
              </Button>
              <Button variant="outline" size="sm">
                Export
              </Button>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_PROMPTS.map((prompt) => (
                <TableRow key={prompt.id}>
                  <TableCell className="font-medium text-slate-900">{prompt.name}</TableCell>
                  <TableCell className="text-slate-600">{prompt.category}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

