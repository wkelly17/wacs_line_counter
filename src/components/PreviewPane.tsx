import {Show} from "solid-js";
import {htmlPreview} from "../sharedSignals";

export function PreviewPane() {
  return (
    <Show when={htmlPreview()}>
      <div
        id="previewPane"
        class="p-3 bg-green-200  sticky top-0 max-h-screen overflow-y-auto"
        innerHTML={htmlPreview()}
      />
    </Show>
  );
}
