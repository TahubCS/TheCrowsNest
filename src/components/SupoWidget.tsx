"use client";

import { useEffect } from "react";

const SUPO_PRODUCT_ID = "e0e8bd03-68fd-4252-8be1-934fd71617f5";
const SUPO_WIDGET_URL = "https://supo-mu.vercel.app/widget.js";

declare global {
  interface Window {
    SupoSettings?: {
      productId?: string;
      apiUrl?: string;
    };
  }
}

export default function SupoWidget() {
  useEffect(() => {
    window.SupoSettings = {
      ...window.SupoSettings,
      productId: SUPO_PRODUCT_ID,
    };

    if (document.getElementById("supo-widget-script")) return;

    const script = document.createElement("script");
    script.id = "supo-widget-script";
    script.src = SUPO_WIDGET_URL;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return null;
}
