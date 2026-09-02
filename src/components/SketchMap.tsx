"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window` at module-evaluation time, which crashes during
// server rendering even inside a "use client" component. Loading it with
// ssr:false skips the server render entirely and only mounts in the browser.
// (The ssr:false option itself must live inside a Client Component - see
// https://nextjs.org/docs/app/api-reference/functions/dynamic - hence this
// separate wrapper around SketchMapInner instead of dynamic-importing it
// directly from the Server Component pages that use it.)
const SketchMap = dynamic(() => import("./SketchMapInner"), {
  ssr: false,
  loading: () => <div className="map-box" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, color: "var(--ink-faint)" }}>Laddar karta...</div>,
});

export default SketchMap;
