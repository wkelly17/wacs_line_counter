import {defineConfig} from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import solidJs from "@astrojs/solid-js";
// import UnoCSS from "unocss/astro";
// import {presetUno} from "unocss";
// import transformerVariantGroup from "@unocss/transformer-variant-group";
// import presetIcons from "@unocss/preset-icons";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: cloudflare({
    mode: "advanced",
  }),
  integrations: [solidJs()],
});
