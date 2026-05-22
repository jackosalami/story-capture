// Memoir book PDF — 6×9 inch trade paperback, the standard trim size for
// printed memoirs. Pages: cover, title, dedication, table of contents, each
// chapter (chapter title page + stories), final "Fin".
//
// We use the same fonts as the on-screen reader: Fraunces serif for body
// and chapter titles, Fredoka for decorative ornaments.

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
  Font,
} from "@react-pdf/renderer";
import type { Chapter, MemoirBook, Story } from "../db/types";

// 6×9 inch in points (72 dpi PDF): 432 × 648
const PAGE_SIZE = { width: 432, height: 648 };

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

Font.register({
  family: "Fraunces",
  src: "https://fonts.gstatic.com/s/fraunces/v32/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk.ttf",
});
Font.register({
  family: "FrauncesItalic",
  src: "https://fonts.gstatic.com/s/fraunces/v32/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk.ttf",
  fontStyle: "italic",
});
Font.register({
  family: "Fredoka",
  src: "https://fonts.gstatic.com/s/fredoka/v14/X7nP4b87HvSqjb_WIi2yDCRwoQ_k7367_B-i2yQag0-mac3O.ttf",
});

const styles = StyleSheet.create({
  // Cover (front, page 1) — full bleed image with title overlay
  coverPage: { width: "100%", height: "100%", position: "relative" },
  coverImage: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
  coverFill: { position: "absolute", inset: 0, backgroundColor: "#b85c1f" },
  coverGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: "rgba(31, 22, 18, 0.45)",
  },
  coverContent: {
    position: "absolute",
    bottom: 48,
    left: 36,
    right: 36,
    flexDirection: "column",
  },
  coverEra: {
    fontFamily: "Fredoka",
    fontSize: 9,
    color: "rgba(255, 255, 255, 0.85)",
    textTransform: "uppercase",
    letterSpacing: 3,
    marginBottom: 6,
  },
  coverTitle: {
    fontFamily: "Fraunces",
    fontSize: 32,
    color: "white",
    lineHeight: 1.15,
  },
  coverSubtitle: {
    fontFamily: "FrauncesItalic",
    fontStyle: "italic",
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 8,
  },

  // Title page
  titlePage: {
    paddingHorizontal: 72,
    paddingVertical: 100,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fbf7ee",
  },
  titleH: {
    fontFamily: "Fraunces",
    fontSize: 28,
    color: "#1f1612",
    textAlign: "center",
    lineHeight: 1.15,
  },
  titleSub: {
    fontFamily: "FrauncesItalic",
    fontStyle: "italic",
    fontSize: 13,
    color: "#4b3a2f",
    textAlign: "center",
    marginTop: 14,
  },
  titleOrnament: {
    fontFamily: "Fredoka",
    fontSize: 22,
    color: "#b85c1f",
    marginTop: 36,
  },

  // Dedication page
  dedicationPage: {
    paddingHorizontal: 72,
    paddingVertical: 100,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fbf7ee",
  },
  dedicationText: {
    fontFamily: "FrauncesItalic",
    fontStyle: "italic",
    fontSize: 13,
    color: "#4b3a2f",
    textAlign: "center",
    lineHeight: 1.7,
  },

  // Table of contents
  tocPage: {
    paddingHorizontal: 60,
    paddingVertical: 70,
    backgroundColor: "#fbf7ee",
    flexDirection: "column",
  },
  tocTitle: {
    fontFamily: "Fraunces",
    fontSize: 22,
    color: "#1f1612",
    marginBottom: 28,
    textAlign: "center",
  },
  tocItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  tocChapter: {
    fontFamily: "Fraunces",
    fontSize: 11,
    color: "#1f1612",
  },
  tocPageNum: {
    fontFamily: "Fraunces",
    fontSize: 11,
    color: "#4b3a2f",
  },

  // Chapter title page
  chapterTitlePage: {
    paddingHorizontal: 60,
    paddingVertical: 100,
    backgroundColor: "#fbf7ee",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  chapterNum: {
    fontFamily: "Fredoka",
    fontSize: 10,
    color: "#b85c1f",
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  chapterTitle: {
    fontFamily: "Fraunces",
    fontSize: 26,
    color: "#1f1612",
    textAlign: "center",
    lineHeight: 1.15,
  },
  chapterDesc: {
    fontFamily: "FrauncesItalic",
    fontStyle: "italic",
    fontSize: 11,
    color: "#4b3a2f",
    textAlign: "center",
    marginTop: 16,
    maxWidth: 320,
    lineHeight: 1.6,
  },

  // Story pages (body)
  storyPage: {
    paddingHorizontal: 54,
    paddingTop: 56,
    paddingBottom: 72,
    backgroundColor: "#fbf7ee",
    flexDirection: "column",
  },
  storyTitle: {
    fontFamily: "Fraunces",
    fontSize: 17,
    color: "#1f1612",
    marginBottom: 6,
  },
  storyMeta: {
    fontFamily: "FrauncesItalic",
    fontStyle: "italic",
    fontSize: 10,
    color: "#4b3a2f",
    marginBottom: 14,
  },
  storyBody: {
    fontFamily: "Fraunces",
    fontSize: 11,
    color: "#1f1612",
    lineHeight: 1.55,
  },
  storyParagraph: {
    marginBottom: 8,
  },
  storySeparator: {
    fontFamily: "Fredoka",
    fontSize: 14,
    color: "#c49a4a",
    textAlign: "center",
    marginVertical: 18,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: "center",
    fontFamily: "Fraunces",
    fontSize: 8.5,
    color: "#4b3a2f",
  },

  // End page
  endPage: {
    backgroundColor: "#fbf7ee",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  endTitle: {
    fontFamily: "Fraunces",
    fontSize: 36,
    color: "#1f1612",
  },
});

function preferredStoryBody(story: Story): string {
  // The Story's summary is the cleaned AI prose. If there's no summary
  // (older stories), fall back to whatever's in mentionedPeople or a
  // placeholder. (The raw transcript could be included as an alternative
  // in a future setting.)
  if (story.summary && story.summary.trim()) return story.summary.trim();
  return "(Esta historia todavía no tiene un resumen escrito. Vuelve a la historia y termina la sesión para generarlo.)";
}

interface MemoirPDFProps {
  book: MemoirBook;
  coverDataUrl: string | null;
  chapters: { chapter: Chapter; stories: Story[] }[];
  unassigned: Story[];
}

function MemoirPDF(props: MemoirPDFProps): React.ReactElement {
  const { book, coverDataUrl, chapters, unassigned } = props;
  return (
    <Document title={book.title} author={book.dedication || undefined}>
      {/* Cover */}
      <Page size={PAGE_SIZE} style={styles.coverPage}>
        {coverDataUrl ? (
          <Image src={coverDataUrl} style={styles.coverImage} />
        ) : (
          <View style={styles.coverFill} />
        )}
        <View style={styles.coverGradient} />
        <View style={styles.coverContent}>
          {book.era ? <Text style={styles.coverEra}>{book.era}</Text> : null}
          <Text style={styles.coverTitle}>{book.title || "Memorias"}</Text>
          {book.subtitle ? <Text style={styles.coverSubtitle}>{book.subtitle}</Text> : null}
        </View>
      </Page>

      {/* Title page */}
      <Page size={PAGE_SIZE} style={styles.titlePage}>
        <Text style={styles.titleH}>{book.title || "Memorias"}</Text>
        {book.subtitle ? <Text style={styles.titleSub}>{book.subtitle}</Text> : null}
        <Text style={styles.titleOrnament}>✦</Text>
      </Page>

      {/* Dedication */}
      {book.dedication ? (
        <Page size={PAGE_SIZE} style={styles.dedicationPage}>
          <Text style={styles.dedicationText}>{book.dedication}</Text>
        </Page>
      ) : null}

      {/* Table of contents (only if there are chapters) */}
      {chapters.length > 0 ? (
        <Page size={PAGE_SIZE} style={styles.tocPage}>
          <Text style={styles.tocTitle}>Índice</Text>
          {chapters.map((c, i) => (
            <View key={c.chapter.id} style={styles.tocItem}>
              <Text style={styles.tocChapter}>
                {i + 1}. {c.chapter.title}
              </Text>
              <Text style={styles.tocPageNum}>—</Text>
            </View>
          ))}
          {unassigned.length > 0 ? (
            <View style={styles.tocItem}>
              <Text style={styles.tocChapter}>{chapters.length + 1}. Otras historias</Text>
              <Text style={styles.tocPageNum}>—</Text>
            </View>
          ) : null}
        </Page>
      ) : null}

      {/* Chapters */}
      {chapters.map((c, ci) => (
        <View key={c.chapter.id}>
          <Page size={PAGE_SIZE} style={styles.chapterTitlePage}>
            <Text style={styles.chapterNum}>Capítulo {ci + 1}</Text>
            <Text style={styles.chapterTitle}>{c.chapter.title}</Text>
            {c.chapter.description ? (
              <Text style={styles.chapterDesc}>{c.chapter.description}</Text>
            ) : null}
          </Page>
          {c.stories.map((story) => (
            <Page key={story.id} size={PAGE_SIZE} style={styles.storyPage}>
              <Text style={styles.storyTitle}>{story.title || "Sin título"}</Text>
              <Text style={styles.storyMeta}>
                {[story.storyDate, story.location].filter(Boolean).join(" · ") || ""}
              </Text>
              <View style={styles.storyBody}>
                {preferredStoryBody(story)
                  .split(/\n{2,}/)
                  .filter((p) => p.trim())
                  .map((para, pi) => (
                    <Text key={pi} style={styles.storyParagraph}>
                      {para.trim()}
                    </Text>
                  ))}
              </View>
              <Text style={styles.footer} render={({ pageNumber }) => `${pageNumber}`} fixed />
            </Page>
          ))}
        </View>
      ))}

      {/* Unassigned stories — appear at the end as "Otras historias" */}
      {unassigned.length > 0 ? (
        <View>
          <Page size={PAGE_SIZE} style={styles.chapterTitlePage}>
            <Text style={styles.chapterNum}>
              Capítulo {chapters.length + 1}
            </Text>
            <Text style={styles.chapterTitle}>Otras historias</Text>
          </Page>
          {unassigned.map((story) => (
            <Page key={story.id} size={PAGE_SIZE} style={styles.storyPage}>
              <Text style={styles.storyTitle}>{story.title || "Sin título"}</Text>
              <Text style={styles.storyMeta}>
                {[story.storyDate, story.location].filter(Boolean).join(" · ") || ""}
              </Text>
              <View style={styles.storyBody}>
                {preferredStoryBody(story)
                  .split(/\n{2,}/)
                  .filter((p) => p.trim())
                  .map((para, pi) => (
                    <Text key={pi} style={styles.storyParagraph}>
                      {para.trim()}
                    </Text>
                  ))}
              </View>
              <Text style={styles.footer} render={({ pageNumber }) => `${pageNumber}`} fixed />
            </Page>
          ))}
        </View>
      ) : null}

      {/* End */}
      <Page size={PAGE_SIZE} style={styles.endPage}>
        <Text style={styles.endTitle}>Fin</Text>
      </Page>
    </Document>
  );
}

export async function buildMemoirBookPdfBlob(args: {
  book: MemoirBook;
  stories: Story[];
  chapters: Chapter[];
}): Promise<Blob> {
  const coverDataUrl = args.book.coverImage ? await blobToDataUrl(args.book.coverImage) : null;

  // Group stories by chapter
  const orderedChapters = [...args.chapters].sort((a, b) => a.order - b.order);
  const chapterGroups: { chapter: Chapter; stories: Story[] }[] = orderedChapters.map((c) => ({
    chapter: c,
    stories: args.stories
      .filter((s) => s.chapterId === c.id)
      .sort((a, b) => (a.storyDate || a.createdAt).localeCompare(b.storyDate || b.createdAt)),
  }));
  const unassigned = args.stories
    .filter((s) => !s.chapterId)
    .sort((a, b) => (a.storyDate || a.createdAt).localeCompare(b.storyDate || b.createdAt));

  const doc = (
    <MemoirPDF
      book={args.book}
      coverDataUrl={coverDataUrl}
      chapters={chapterGroups}
      unassigned={unassigned}
    />
  );
  return pdf(doc).toBlob();
}

export async function downloadMemoirBookPdf(args: {
  book: MemoirBook;
  stories: Story[];
  chapters: Chapter[];
}): Promise<void> {
  const blob = await buildMemoirBookPdfBlob(args);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = (args.book.title || "memoir")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "memoir";
  a.href = url;
  a.download = `${slug}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
