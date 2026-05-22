import { useEffect } from "react";
import { useNav } from "./store/nav";
import { useSettings } from "./store/settings";
import { DashboardScreen } from "./screens/DashboardScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { RecordScreen } from "./screens/RecordScreen";
import { StorySetupScreen } from "./screens/StorySetupScreen";
import { StoryScreen } from "./screens/StoryScreen";
import { CharactersScreen } from "./screens/CharactersScreen";
import { CharacterScreen } from "./screens/CharacterScreen";

function App() {
  const screen = useNav((s) => s.screen);
  const go = useNav((s) => s.go);
  const hasKey = useSettings((s) => s.openaiApiKey.length > 0);

  // First-run gate: no API key → force settings.
  useEffect(() => {
    if (!hasKey && screen.name !== "settings") {
      go({ name: "settings" });
    }
  }, [hasKey, screen.name, go]);

  if (!hasKey || screen.name === "settings") return <SettingsScreen />;

  switch (screen.name) {
    case "dashboard":
      return <DashboardScreen />;
    case "story-setup":
      return <StorySetupScreen storyId={screen.storyId} sessionId={screen.sessionId} />;
    case "record":
      return <RecordScreen sessionId={screen.sessionId} />;
    case "story":
      return <StoryScreen storyId={screen.storyId} />;
    case "characters":
      return <CharactersScreen />;
    case "character":
      return <CharacterScreen characterId={screen.characterId} />;
    default:
      return <DashboardScreen />;
  }
}

export default App;
