"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

type Task = {
  id: number;
  name: string;
  workflow: string;
  status: "Queued" | "Running" | "Completed" | "Failed";
};

const INITIAL_TASKS: Task[] = [
  { id: 1, name: "Run daily metrics digest", workflow: "Weekly metrics digest", status: "Completed" },
  { id: 2, name: "Triage new inbox batch", workflow: "Inbox Triage Agent", status: "Running" },
  { id: 3, name: "Generate customer reply draft", workflow: "Customer reply draft", status: "Queued" }
];

function statusVariant(s: Task["status"]) {
  switch (s) {
    case "Completed": return "success";
    case "Failed": return "destructive";
    case "Running": return "warning";
    default: return "secondary";
  }
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);

  function runMockTask() {
    const nextId = tasks.length ? tasks[tasks.length - 1].id + 1 : 1;
    setTasks((prev) => [
      ...prev,
      { id: nextId, name: "Ad-hoc test run", workflow: "New lead intake", status: "Queued" }
    ]);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Task Runner"
        description="Inspect and manually trigger workflow runs across your automations."
        children={<Button onClick={runMockTask}>Run test task</Button>}
      />

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Workflow</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-medium text-slate-900">{task.name}</TableCell>
                <TableCell className="text-slate-600">{task.workflow}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(task.status)}>{task.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    View logs
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
