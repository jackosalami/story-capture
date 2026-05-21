import { useEffect } from "react";
import { useNav } from "./store/nav";
import { useSettings } from "./store/settings";
import { DashboardScreen } from "./screens/DashboardScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { RecordScreen } from "./screens/RecordScreen";
import { SessionScreen } from "./screens/SessionScreen";

function App() {
  const screen = useNav((s) => s.screen);
  const go = useNav((s) => s.go);
  const hasKey = useSettings((s) => s.openaiApiKey.length > 0);

  // First-run gate: no API key → force settings screen.
  useEffect(() => {
    if (!hasKey && screen.name !== "settings") {
      go({ name: "settings" });
    }
  }, [hasKey, screen.name, go]);

  if (!hasKey || screen.name === "settings") return <SettingsScreen />;
  if (screen.name === "dashboard") return <DashboardScreen />;
  if (screen.name === "record") return <RecordScreen sessionId={screen.sessionId} />;
  if (screen.name === "session") return <SessionScreen sessionId={screen.sessionId} />;
  return <DashboardScreen />;
}

export default App;
