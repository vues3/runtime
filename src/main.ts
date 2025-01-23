/* -------------------------------------------------------------------------- */
/*                                   Imports                                  */
/* -------------------------------------------------------------------------- */

import type { Preset } from "@unocss/core";
import type { RuntimeOptions } from "@unocss/runtime";
import type { TImportmap, TPage } from "@vues3/shared";
import type { Component } from "vue";
import type { RouteRecordRaw } from "vue-router";

import { createHead } from "@unhead/vue";
import presetWebFonts from "@unocss/preset-web-fonts";
import "@unocss/reset/tailwind-compat.css";
import initUnocssRuntime from "@unocss/runtime";
import {
  consoleError,
  customFetch,
  getFonts,
  importmap,
  nodes,
  pages,
} from "@vues3/shared";
import { computed, createApp, nextTick, readonly } from "vue";

import defaults from "../uno.config";
import vueApp from "./App.vue";
import { router, setScroll } from "./stores/monolit";
import "./style.css";

/* -------------------------------------------------------------------------- */
/*                                Computations                                */
/* -------------------------------------------------------------------------- */

const id = computed(() => router.currentRoute.value.name);

/* -------------------------------------------------------------------------- */
/*                               Initialization                               */
/* -------------------------------------------------------------------------- */

window.app = createApp(vueApp as Component);

/* -------------------------------------------------------------------------- */

window.app.use(createHead());

/* -------------------------------------------------------------------------- */

window.app.provide("id", readonly(id));

/* -------------------------------------------------------------------------- */
/*                                  Functions                                 */
/* -------------------------------------------------------------------------- */

const rootElement: RuntimeOptions["rootElement"] = () =>
  document.getElementById("app") ?? undefined;

/* -------------------------------------------------------------------------- */

const getChildren = (
  component: RouteRecordRaw["component"],
  name: RouteRecordRaw["name"],
  path: RouteRecordRaw["path"],
) => [{ component, name, path }] as RouteRecordRaw[];

/* -------------------------------------------------------------------------- */
/*                                   Objects                                  */
/* -------------------------------------------------------------------------- */

const initRouter: Promise<void> = (async () => {
  const [{ imports }, [page = {} as TPage]] = await Promise.all(
    ["index.importmap", "index.json"].map(async (value, index) => {
      const response = await fetch(value);
      const body = index ? "[]" : "{}";
      return (response.ok ? response : new Response(body)).json() as Promise<
        TImportmap | TPage[]
      >;
    }) as [Promise<TImportmap>, Promise<TPage[]>],
  );
  importmap.imports = imports;
  nodes.push(page);
  await nextTick();
  window.app.provide(
    "pages",
    readonly(Object.fromEntries(pages.value.map((value) => [value.id, value]))),
  );
  pages.value.forEach(({ along, id: name, loc, parent, path: relative }) => {
    const component = () => import("./views/SingleView.vue");
    if (relative !== undefined) {
      const path = relative.replace(/^\/?/, "/").replace(/\/?$/, "/");
      const alias = loc
        ?.replaceAll(" ", "_")
        .replace(/^\/?/, "/")
        .replace(/\/?$/, "/");
      const children = getChildren(
        (parent?.along ?? along)
          ? () => import("./views/MultiView.vue")
          : component,
        name,
        "",
      );
      router.addRoute({
        ...(alias && loc ? { alias } : { undefined }),
        children,
        component,
        path,
      });
    }
  });
  const path = "/:pathMatch(.*)*";
  const component = () => import("./views/NotFoundView.vue");
  const name = "404";
  router.addRoute({ component, name, path });
})();

/* -------------------------------------------------------------------------- */
/*                                  Functions                                 */
/* -------------------------------------------------------------------------- */

const ready: RuntimeOptions["ready"] = async (runtime) => {
  const { toggleObserver } = runtime;
  setScroll(runtime);
  await initRouter;
  window.app.use(router);
  window.app.mount(rootElement());
  toggleObserver(true);
  return false;
};

/* -------------------------------------------------------------------------- */
/*                                    Main                                    */
/* -------------------------------------------------------------------------- */

(async () => {
  const response = await fetch("fonts.json");
  const fonts = getFonts(
    (await (response.ok ? response : new Response("[]")).json()) as string[],
  );
  defaults.presets.push(
    presetWebFonts({
      customFetch,
      fonts,
    }) as Preset,
  );
  await initUnocssRuntime({ defaults, ready, rootElement });
})().catch(consoleError);

/* -------------------------------------------------------------------------- */

window.console.info(
  "⛵",
  "vueS3",
  `ver:${__APP_VERSION__}`,
  "https://github.com/vues3",
);

/* -------------------------------------------------------------------------- */
