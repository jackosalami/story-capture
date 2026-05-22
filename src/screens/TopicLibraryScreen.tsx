import { useNav } from "../store/nav";
import { TOPICS, type Topic } from "../lib/topicLibrary";
import { createStory, linkSessionToStory } from "../db/stories";
import { createSession } from "../db/sessions";

export function TopicLibraryScreen() {
  const go = useNav((s) => s.go);

  async function pickTopic(topic: Topic) {
    const story = await createStory({
      title: topic.theme,
      mood: topic.suggestedMood,
    });
    const session = await createSession({
      storyId: story.id,
      topicPrompt: topic.prompt,
    });
    await linkSessionToStory(story.id, session.id);
    go({ name: "story-setup", storyId: story.id, sessionId: session.id });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <header className="flex items-baseline justify-between mb-6">
        <button
          type="button"
          onClick={() => go({ name: "dashboard" })}
          className="text-sm text-ink/60 hover:text-ink"
        >
          ← Volver
        </button>
      </header>

      <h1 className="text-3xl font-medium text-ink mb-2">¿De qué hablar hoy?</h1>
      <p className="text-base text-ink/60 mb-8">
        Si no sabes por dónde empezar, escoge un tema. Es solo una idea
        para arrancar — puedes hablar de lo que quieras una vez empieces.
      </p>

      <ul className="space-y-3">
        {TOPICS.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => pickTopic(t)}
              className="block w-full text-left rounded-xl border border-ink/10 bg-white px-5 py-4 hover:border-warm/60 hover:shadow-sm transition"
            >
              <p className="text-sm font-medium text-warm uppercase tracking-wide">
                {t.theme}
              </p>
              <p className="mt-1 text-base text-ink leading-relaxed">{t.prompt}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
