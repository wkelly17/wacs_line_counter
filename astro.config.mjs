import {defineConfig} from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import solidJs from "@astrojs/solid-js";
import UnoCSS from "unocss/astro";
import presetUno from "@unocss/preset-uno";
import transformerVariantGroup from "@unocss/transformer-variant-group";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: cloudflare({
    mode: "directory",
  }),
  integrations: [
    solidJs(),
    UnoCSS({
      presets: [presetUno()],
      transformers: [transformerVariantGroup()],
    }),
  ],
});
