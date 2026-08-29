import React, { useEffect } from "react";
import { hydrateRoot } from "react-dom/client";

import "judgmentkit/react/styles.css";
import { ComponentSpecimenPreview } from "./component-specimen-runtime.mjs";

function HydratedComponentSpecimen({ root, props }) {
  useEffect(() => {
    root.dataset.componentSpecimenMounted = "true";
  }, [root]);

  return <ComponentSpecimenPreview {...props} />;
}

const roots = document.querySelectorAll("[data-component-specimen-runtime]");

for (const root of roots) {
  const serializedProps = root.getAttribute("data-component-specimen-props");
  if (!serializedProps) {
    root.dataset.componentSpecimenError = "missing-props";
    continue;
  }

  try {
    const props = JSON.parse(serializedProps);
    hydrateRoot(
      root,
      <HydratedComponentSpecimen root={root} props={props} />,
      {
        onRecoverableError(error) {
          root.dataset.componentSpecimenError = "recoverable-hydration";
          console.error(
            "JudgmentKit component specimen recovered from a hydration error.",
            error,
          );
        },
      },
    );
  } catch (error) {
    root.dataset.componentSpecimenError = "invalid-props";
    console.error("Unable to hydrate JudgmentKit component specimen.", error);
  }
}
