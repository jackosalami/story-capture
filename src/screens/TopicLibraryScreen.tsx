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
      <header className="mb-8">
        <button
          type="button"
          onClick={() => go({ name: "dashboard" })}
          className="text-sm text-ink-soft hover:text-ink"
        >
          ← Volver
        </button>
      </header>

      <p className="text-warm-deep/80 text-xs uppercase tracking-widest font-medium mb-3">
        Inspiración
      </p>
      <h1 className="h-serif text-4xl md:text-5xl text-ink mb-3 leading-tight">
        ¿De qué hablar hoy?
      </h1>
      <p className="text-lg text-ink-soft mb-10 leading-relaxed">
        Si no sabes por dónde empezar, escoge un tema. Es solo una idea para
        arrancar — puedes hablar de lo que quieras una vez empieces.
      </p>

      <ul className="space-y-3">
        {TOPICS.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => pickTopic(t)}
              className="paper-card paper-card-hover block w-full text-left rounded-2xl px-6 py-5 transition"
            >
              <p className="text-xs uppercase tracking-widest text-warm-deep font-medium">
                {t.theme}
              </p>
              <p className="mt-2 h-serif text-xl text-ink leading-snug">{t.prompt}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
