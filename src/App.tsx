import { useEffect } from "react";
import { useNav, workspaceOf } from "./store/nav";
import { useSettings } from "./store/settings";
import { DashboardScreen } from "./screens/DashboardScreen";
import { BookDetailScreen } from "./screens/BookDetailScreen";
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
import { BookshelfScreen } from "./screens/BookshelfScreen";
import { BookReaderScreen } from "./screens/BookReaderScreen";

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

  useEffect(() => {
    document.body.dataset.workspace = workspaceOf(screen);
  }, [screen]);

  if (!hasKey || screen.name === "settings") return <SettingsScreen />;
  if (screen.name === "walkthrough") return <WalkthroughScreen />;

  switch (screen.name) {
    case "dashboard":
      return <DashboardScreen />;
    case "book":
      return <BookDetailScreen bookId={screen.bookId} />;
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
    case "kids-shelf":
      return <BookshelfScreen />;
    case "kids-book":
      return <BookReaderScreen kidStoryId={screen.kidStoryId} />;
    default:
      return <DashboardScreen />;
  }
}

export default App;
