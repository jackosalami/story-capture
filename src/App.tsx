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
import { WalkthroughScreen } from "./screens/WalkthroughScreen";
import { TopicLibraryScreen } from "./screens/TopicLibraryScreen";
import { KidsDashboardScreen } from "./screens/KidsDashboardScreen";
import { NewKidStoryScreen } from "./screens/NewKidStoryScreen";
import { KidStoryScreen } from "./screens/KidStoryScreen";
import { KidCharactersScreen } from "./screens/KidCharactersScreen";
import { KidCharacterScreen } from "./screens/KidCharacterScreen";

function App() {
  const screen = useNav((s) => s.screen);
  const go = useNav((s) => s.go);
  const hasKey = useSettings((s) => s.openaiApiKey.length > 0);
  const hasSeenWalkthrough = useSettings((s) => s.hasSeenWalkthrough);

  useEffect(() => {
    if (!hasKey && screen.name !== "settings") {
      go({ name: "settings" });
    } else if (
      hasKey &&
      !hasSeenWalkthrough &&
      screen.name !== "walkthrough" &&
      screen.name !== "settings"
    ) {
      go({ name: "walkthrough" });
    }
  }, [hasKey, hasSeenWalkthrough, screen.name, go]);

  if (!hasKey || screen.name === "settings") return <SettingsScreen />;
  if (screen.name === "walkthrough") return <WalkthroughScreen />;

  switch (screen.name) {
    case "dashboard":
      return <DashboardScreen />;
    case "topics":
      return <TopicLibraryScreen />;
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
    case "kids-dashboard":
      return <KidsDashboardScreen />;
    case "kids-new":
      return <NewKidStoryScreen />;
    case "kids-story":
      return <KidStoryScreen kidStoryId={screen.kidStoryId} />;
    case "kids-characters":
      return <KidCharactersScreen />;
    case "kids-character":
      return <KidCharacterScreen kidCharacterId={screen.kidCharacterId} />;
    default:
      return <DashboardScreen />;
  }
}

export default App;
