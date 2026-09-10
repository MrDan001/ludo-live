import { notFound } from "next/navigation";
import WorldGamePage from "../WorldGamePage";
import { WORLD_ENGINES, type WorldMode } from "../engines";

export default function LudoWorldModePage({ params }: { params: { mode: string } }) {
  const mode = params.mode as WorldMode;
  if (!(mode in WORLD_ENGINES)) notFound();
  return <WorldGamePage mode={mode} />;
}
