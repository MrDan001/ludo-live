import { notFound } from "next/navigation";
import WorldMatch from "../WorldMatch";
import { WORLD_MODES, type WorldMode } from "../world-data";

export default function LudoWorldModePage({ params }: { params: { mode: string } }) {
  const mode = params.mode as WorldMode;
  if (!WORLD_MODES.some(function (item) { return item.id === mode; })) notFound();
  return <WorldMatch mode={mode} />;
}
