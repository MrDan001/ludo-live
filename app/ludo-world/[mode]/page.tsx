import WorldGamePage, { WORLD_ENGINES } from "../WorldGamePage";
import type { WorldMode } from "../engines/types";

export default function LudoWorldModePage({ params }: { params: { mode: string } }) {
  const mode = params.mode as WorldMode;
  if (!(mode in WORLD_ENGINES)) return null;
  return <WorldGamePage mode={mode} />;
}
