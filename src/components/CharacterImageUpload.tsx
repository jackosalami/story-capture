import { useRef, useState } from "react";
import { useSettings } from "../store/settings";
import { resizeImage } from "../lib/image";
import { describeCharacterFromImage } from "../lib/describeCharacter";
import type { KidCharacterKind } from "../db/types";

// Reusable upload+describe widget shared by the inline KidCharacterPicker
// and the full-page KidCharactersScreen create form.
//
// onDescribed fires after the vision model returns. The parent decides
// whether to auto-fill description / kind / image fields.

interface Props {
  existingImage?: Blob;            // already-set image when editing
  existingMimeType?: string;
  onImageChange: (image: Blob | undefined, mimeType: string | undefined) => void;
  onDescribed: (result: { description: string; suggestedKind: KidCharacterKind }) => void;
  compact?: boolean;
}

export function CharacterImageUpload({
  existingImage,
  existingMimeType,
  onImageChange,
  onDescribed,
  compact,
}: Props) {
  const chatModel = useSettings((s) => s.chatModel);
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(() => {
    if (existingImage) return URL.createObjectURL(existingImage);
    return null;
  });
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Tiene que ser una imagen.");
      return;
    }
    setWorking(true);
    try {
      // Resize once, use the same data for preview, storage, and the vision call.
      const resized = await resizeImage(file, 1024, 0.85);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(resized.blob));
      onImageChange(resized.blob, resized.mimeType);

      const result = await describeCharacterFromImage({
        model: chatModel,
        imageDataUrl: resized.dataUrl,
      });
      onDescribed(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setWorking(false);
    }
  }

  function pick() {
    fileRef.current?.click();
  }

  function clearImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onImageChange(undefined, undefined);
  }

  return (
    <div className={compact ? "" : "rounded-2xl bg-cloud border-2 border-dashed border-grape/30 p-4"}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          // reset so picking the same file again works
          e.target.value = "";
        }}
      />

      <div className="flex items-center gap-3">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Personaje subido"
            className="size-16 rounded-2xl object-cover border-2 border-white shadow-sm shrink-0"
          />
        ) : (
          <div className="size-16 rounded-2xl bg-grape-soft border-2 border-dashed border-grape/40 shrink-0 flex items-center justify-center text-2xl">
            📷
          </div>
        )}

        <div className="flex-1 min-w-0">
          {previewUrl ? (
            <>
              <p className="text-sm h-display font-semibold text-night">
                {working ? "Describiendo…" : "Foto lista"}
              </p>
              <p className="text-xs text-night/60">
                {working
                  ? "Estoy mirando la imagen para describir al personaje."
                  : "La descripción se rellenó debajo. Puedes editarla."}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm h-display font-semibold text-night">
                Subir foto del personaje
              </p>
              <p className="text-xs text-night/60">
                Yo describo cómo se ve. Funciona con fotos, dibujos, juguetes, recortes.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={pick}
          disabled={working}
          className="kid-button rounded-full bg-grape text-white px-4 py-1.5 text-xs h-display font-semibold disabled:opacity-50"
        >
          {previewUrl ? "Cambiar foto" : "📷 Subir foto"}
        </button>
        {previewUrl && !working && (
          <button
            type="button"
            onClick={clearImage}
            className="rounded-full bg-white border border-night/15 px-3 py-1.5 text-xs h-display text-night/60 hover:text-night"
          >
            Quitar
          </button>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs text-strawberry">{error}</p>
      )}

      {/* Keep existingMimeType referenced for parent migrations even when unused here */}
      <span className="hidden" data-existing-mime={existingMimeType} />
    </div>
  );
}
