// Print-ready PDF for a kid story. Letter size, image and text alternate as
// separate pages so you can print at home or hand the PDF to any POD service
// (Lulu, KDP, Mixam, Blurb) and get a paperback or hardcover printed.

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
import type { KidCharacter, KidStory, StoryLanguage } from "../db/types";
import { splitStoryIntoSections } from "./splitStory";
import { getStoryInLanguage } from "./translateStory";

// React-pdf can't read IndexedDB Blobs directly — we convert to data URLs.
async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// Register Fraunces (serif) and Fredoka (display) from Google Fonts so the
// printed book uses the same typography as the on-screen experience. The
// PDF embeds the fonts so it renders identically on any device.
Font.register({
  family: "Fraunces",
  src: "https://fonts.gstatic.com/s/fraunces/v32/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk.ttf",
});
Font.register({
  family: "FrauncesBold",
  src: "https://fonts.gstatic.com/s/fraunces/v32/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk.ttf",
  fontWeight: 600,
});
Font.register({
  family: "Fredoka",
  src: "https://fonts.gstatic.com/s/fredoka/v14/X7nP4b87HvSqjb_WIi2yDCRwoQ_k7367_B-i2yQag0-mac3O.ttf",
});

const styles = StyleSheet.create({
  // Cover and back use full-bleed images
  coverPage: {
    position: "relative",
    width: "100%",
    height: "100%",
  },
  coverImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  coverFill: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "#a78bfa",
  },
  coverOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 48,
    paddingVertical: 56,
    paddingTop: 200,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  coverKicker: {
    fontFamily: "Fredoka",
    fontSize: 11,
    color: "white",
    letterSpacing: 4,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  coverTitle: {
    fontFamily: "Fredoka",
    fontSize: 42,
    color: "white",
    lineHeight: 1.1,
  },
  coverForChild: {
    fontFamily: "Fraunces",
    fontSize: 13,
    color: "white",
    marginTop: 18,
    opacity: 0.9,
  },
  coverWith: {
    fontFamily: "Fraunces",
    fontSize: 11,
    color: "white",
    marginTop: 6,
    opacity: 0.85,
  },

  // Title page (page 2)
  titlePage: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 72,
    paddingVertical: 90,
    backgroundColor: "#fbf7ee",
  },
  titleBookTitle: {
    fontFamily: "Fredoka",
    fontSize: 32,
    color: "#1f1612",
    textAlign: "center",
    lineHeight: 1.15,
    marginBottom: 24,
  },
  titleDedication: {
    fontFamily: "Fraunces",
    fontSize: 14,
    color: "#4b3a2f",
    textAlign: "center",
    fontStyle: "italic",
  },
  titleDecor: {
    fontFamily: "Fredoka",
    fontSize: 24,
    color: "#b85c1f",
    marginTop: 32,
  },

  // Image pages
  imagePage: {
    width: "100%",
    height: "100%",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fbf7ee",
    padding: 24,
  },
  fullImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },

  // Text pages
  textPage: {
    paddingHorizontal: 90,
    paddingVertical: 100,
    backgroundColor: "#fbf7ee",
    flexDirection: "column",
  },
  textMoment: {
    fontFamily: "Fredoka",
    fontSize: 10,
    color: "#b85c1f",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 18,
  },
  textBody: {
    fontFamily: "Fraunces",
    fontSize: 16,
    color: "#1f1612",
    lineHeight: 1.75,
  },
  textParagraph: {
    marginBottom: 14,
  },
  textFolio: {
    position: "absolute",
    bottom: 36,
    left: 0,
    right: 0,
    textAlign: "center",
    fontFamily: "Fredoka",
    fontSize: 10,
    color: "#1f1612",
    opacity: 0.4,
  },

  // End page
  endPage: {
    width: "100%",
    height: "100%",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fbf7ee",
  },
  endTitle: {
    fontFamily: "Fredoka",
    fontSize: 72,
    color: "#1f1612",
  },
  endStoryTitle: {
    fontFamily: "Fraunces",
    fontSize: 14,
    color: "#4b3a2f",
    marginTop: 16,
    fontStyle: "italic",
  },
});

interface PdfProps {
  title: string;
  forChild: string;
  cast: KidCharacter[];
  coverImageDataUrl: string | null;
  scenes: {
    momentTitle: string;
    text: string;
    imageDataUrl: string | null;
  }[];
  language: StoryLanguage;
}

function BookPDF(props: PdfProps): React.ReactElement {
  const lang = props.language;
  const labels = {
    aStory: lang === "en" ? "A Story" : "Un Cuento",
    for: lang === "en" ? "For" : "Para",
    with: lang === "en" ? "With" : "Con",
    dedication: lang === "en" ? "For" : "Para",
    end: lang === "en" ? "The End" : "Fin",
  };
  return (
    <Document title={props.title}>
      {/* COVER (page 1) — full bleed */}
      <Page size="LETTER" style={styles.coverPage}>
        {props.coverImageDataUrl ? (
          <Image src={props.coverImageDataUrl} style={styles.coverImage} />
        ) : (
          <View style={styles.coverFill} />
        )}
        <View style={styles.coverOverlay}>
          <Text style={styles.coverKicker}>{labels.aStory}</Text>
          <Text style={styles.coverTitle}>{props.title || "Cuento"}</Text>
          {props.forChild ? (
            <Text style={styles.coverForChild}>
              {labels.for} {props.forChild}
            </Text>
          ) : null}
          {props.cast.length > 0 ? (
            <Text style={styles.coverWith}>
              {labels.with} {props.cast.map((c) => c.name).join(", ")}
            </Text>
          ) : null}
        </View>
      </Page>

      {/* TITLE PAGE (page 2) */}
      <Page size="LETTER" style={styles.titlePage}>
        <Text style={styles.titleBookTitle}>{props.title || "Cuento"}</Text>
        {props.forChild ? (
          <Text style={styles.titleDedication}>
            {labels.dedication} {props.forChild}
          </Text>
        ) : null}
        <Text style={styles.titleDecor}>✦</Text>
      </Page>

      {/* SCENE PAGES — image then text, alternating */}
      {props.scenes.map((scene, i) => {
        const sceneNum = i + 1;
        const totalScenes = props.scenes.length;
        return (
          <View key={i}>
            {/* Image page */}
            <Page size="LETTER" style={styles.imagePage}>
              {scene.imageDataUrl ? (
                <Image src={scene.imageDataUrl} style={styles.fullImage} />
              ) : (
                <Text
                  style={{
                    fontFamily: "Fraunces",
                    fontSize: 14,
                    color: "#4b3a2f",
                    fontStyle: "italic",
                  }}
                >
                  (Imagen de la escena {sceneNum} pendiente)
                </Text>
              )}
            </Page>
            {/* Text page */}
            <Page size="LETTER" style={styles.textPage}>
              {scene.momentTitle ? (
                <Text style={styles.textMoment}>{scene.momentTitle}</Text>
              ) : null}
              <View style={styles.textBody}>
                {scene.text
                  .split(/\n{2,}/)
                  .filter((p) => p.trim())
                  .map((para, pi) => (
                    <Text key={pi} style={styles.textParagraph}>
                      {para.trim()}
                    </Text>
                  ))}
              </View>
              <Text style={styles.textFolio}>
                {sceneNum} / {totalScenes}
              </Text>
            </Page>
          </View>
        );
      })}

      {/* END PAGE */}
      <Page size="LETTER" style={styles.endPage}>
        <Text style={styles.endTitle}>{labels.end}</Text>
        <Text style={styles.endStoryTitle}>{props.title || "Cuento"}</Text>
      </Page>
    </Document>
  );
}

// Builds the PDF Blob (does not download it).
export async function buildBookPdfBlob(args: {
  story: KidStory;
  cast: KidCharacter[];
  language: StoryLanguage;
}): Promise<Blob> {
  const view = getStoryInLanguage(args.story, args.language);
  const sceneCount = args.story.imagePrompts?.scenes.length ?? 5;
  const sections = splitStoryIntoSections(view.content, sceneCount);

  // Pre-encode all images as data URLs (react-pdf needs URLs/data-URLs).
  const imageDataUrls: (string | null)[] = await Promise.all(
    Array.from({ length: sceneCount }).map(async (_, i) => {
      const blob = args.story.imagePrompts?.scenes[i]?.image;
      if (!blob) return null;
      return blobToDataUrl(blob);
    }),
  );
  const coverImageDataUrl = imageDataUrls.find((u) => u) ?? null;

  const scenes = sections.map((text, i) => ({
    momentTitle: args.story.imagePrompts?.scenes[i]?.momentTitle ?? "",
    text,
    imageDataUrl: imageDataUrls[i],
  }));

  const doc = (
    <BookPDF
      title={view.title}
      forChild={args.story.forChild}
      cast={args.cast}
      coverImageDataUrl={coverImageDataUrl}
      scenes={scenes}
      language={args.language}
    />
  );
  return pdf(doc).toBlob();
}

// Downloads the PDF locally.
export async function downloadBookPdf(args: {
  story: KidStory;
  cast: KidCharacter[];
  language: StoryLanguage;
}): Promise<void> {
  const blob = await buildBookPdfBlob(args);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = (args.story.title || "cuento")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "cuento";
  a.href = url;
  a.download = `${slug}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
