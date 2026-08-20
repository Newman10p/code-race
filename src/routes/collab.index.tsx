import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/collab/")({
  beforeLoad: () => {
    throw redirect({ to: "/collab/groups" });
  },
});