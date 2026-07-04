import * as layout from "./layout.mjs";
import { createJudgmentKitComponentFactories } from "./components.mjs";
import {
  JUDGMENTKIT_COLOR_TOKENS,
  JUDGMENTKIT_CSS_CUSTOM_PROPERTIES,
} from "./tokens.mjs";
import { JUDGMENTKIT_STYLE_NAMES } from "./styles.mjs";

export * from "./tokens.mjs";
export * from "./styles.mjs";
export * from "./layout.mjs";
export * from "./components.mjs";
export * from "./theme.mjs";
export * from "./qa.mjs";

export const jk = {
  colors: JUDGMENTKIT_COLOR_TOKENS.light,
  cssCustomProperties: JUDGMENTKIT_CSS_CUSTOM_PROPERTIES.light,
  layout,
  styles: JUDGMENTKIT_STYLE_NAMES,
  components: {
    withHelpers: createJudgmentKitComponentFactories,
  },
};
