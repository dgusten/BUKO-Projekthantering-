"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";

// Leaflet's default marker icon path is inferred from its own script URL,
// which breaks under any bundler (icons load as broken images). Point it at
// the same CDN build instead of wrestling with Turbopack asset imports.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DRAW_COLORS = ["#e8720c", "#e03131", "#1971c2", "#2f9e44", "#7048e8", "#1a1a1a"];

function textLabelIcon(text: string) {
  const span = document.createElement("span");
  span.textContent = text;
  return L.divIcon({
    className: "sketch-label-icon",
    html: `<span class="sketch-label-pill">${span.innerHTML}</span>`,
  });
}

export default function SketchMap({
  name,
  initialValue,
  editable,
}: {
  name?: string;
  initialValue?: GeoJSON.FeatureCollection | null;
  editable: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const colorRef = useRef(DRAW_COLORS[0]);
  const textArmedRef = useRef(false);

  const [color, setColor] = useState(DRAW_COLORS[0]);
  const [geoJsonStr, setGeoJsonStr] = useState(initialValue ? JSON.stringify(initialValue) : "");
  const [textArmed, setTextArmed] = useState(false);
  const [pendingLatLng, setPendingLatLng] = useState<L.LatLng | null>(null);
  const [labelText, setLabelText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState("");

  function syncGeoJson() {
    const items = drawnItemsRef.current;
    if (!items) return;
    setGeoJsonStr(items.getLayers().length ? JSON.stringify(items.toGeoJSON()) : "");
  }

  function buildDrawControl(map: L.Map, drawnItems: L.FeatureGroup, col: string) {
    if (drawControlRef.current) map.removeControl(drawControlRef.current);
    const shapeOptions = { color: col, weight: 3 };
    const control = new L.Control.Draw({
      position: "topright",
      edit: { featureGroup: drawnItems },
      draw: {
        marker: {},
        polygon: { shapeOptions },
        rectangle: { shapeOptions },
        polyline: { shapeOptions },
        circle: { shapeOptions },
        circlemarker: { color: col } as unknown as L.Control.DrawOptions["circlemarker"],
      },
    });
    map.addControl(control);
    drawControlRef.current = control;
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([58.55, 16.05], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;
    mapRef.current = map;

    if (initialValue) {
      try {
        L.geoJSON(initialValue, {
          pointToLayer: (feature, latlng) =>
            feature.properties?.label ? L.marker(latlng, { icon: textLabelIcon(feature.properties.label) }) : L.marker(latlng),
          style: (feature) => (feature?.properties?.color ? { color: feature.properties.color, weight: 3 } : { weight: 3 }),
        }).eachLayer((l) => drawnItems.addLayer(l));
        map.fitBounds(drawnItems.getBounds(), { maxZoom: 17, padding: [20, 20] });
      } catch {
        // ignore malformed geojson
      }
    }

    if (editable) {
      buildDrawControl(map, drawnItems, colorRef.current);

      map.on(L.Draw.Event.CREATED, (e) => {
        const layer = (e as L.DrawEvents.Created).layer;
        const layerType = (e as L.DrawEvents.Created).layerType;
        if (layerType !== "marker") {
          (layer as L.Layer & { feature?: GeoJSON.Feature }).feature = {
            type: "Feature",
            properties: { color: colorRef.current },
            geometry: null as unknown as GeoJSON.Geometry,
          };
        }
        drawnItems.addLayer(layer);
        syncGeoJson();
      });
      map.on(L.Draw.Event.EDITED, syncGeoJson);
      map.on(L.Draw.Event.DELETED, syncGeoJson);

      map.on("click", (e) => {
        if (!textArmedRef.current) return;
        textArmedRef.current = false;
        setTextArmed(false);
        document.body.classList.remove("sketch-text-armed");
        setPendingLatLng(e.latlng);
      });
    }

    setTimeout(() => map.invalidateSize(), 60);

    return () => {
      // React 19's dev-only StrictMode double-invoke (mount -> cleanup -> mount)
      // can otherwise leave leaflet-draw's internal handler state pointing at a
      // torn-down map; clearing every ref here (not just mapRef) ensures the
      // second mount starts from a clean slate instead of reusing stale state.
      try {
        map.remove();
      } catch {
        // ignore - already torn down
      }
      mapRef.current = null;
      drawnItemsRef.current = null;
      drawControlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleColorClick(c: string) {
    setColor(c);
    colorRef.current = c;
    if (mapRef.current && drawnItemsRef.current) {
      buildDrawControl(mapRef.current, drawnItemsRef.current, c);
    }
  }

  function armText() {
    textArmedRef.current = true;
    setTextArmed(true);
    document.body.classList.add("sketch-text-armed");
  }

  function confirmLabel() {
    const text = labelText.trim();
    if (text && pendingLatLng && drawnItemsRef.current) {
      const marker = L.marker(pendingLatLng, { icon: textLabelIcon(text) });
      (marker as L.Layer & { feature?: GeoJSON.Feature }).feature = {
        type: "Feature",
        properties: { label: text },
        geometry: null as unknown as GeoJSON.Geometry,
      };
      drawnItemsRef.current.addLayer(marker);
      syncGeoJson();
    }
    setPendingLatLng(null);
    setLabelText("");
  }

  async function doSearch() {
    if (!searchQuery.trim() || !mapRef.current) return;
    setSearchError("");
    try {
      const res = await fetch(
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(searchQuery + ", Sverige")
      );
      const data = await res.json();
      if (data && data[0]) {
        mapRef.current.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 16);
      } else {
        setSearchError("Adressen hittades inte.");
      }
    } catch {
      setSearchError("Kunde inte söka adress (kräver internetanslutning).");
    }
  }

  return (
    <div>
      {editable && (
        <>
          <div className="map-toolbar">
            <input
              type="text"
              placeholder="Sök adress..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  doSearch();
                }
              }}
            />
            <button type="button" className="btn btn-sm" onClick={doSearch}>
              Sök
            </button>
          </div>
          {searchError && <div className="hint" style={{ marginBottom: 8 }}>{searchError}</div>}
          <div className="sketch-toolbar">
            <span className="sketch-toolbar-label">Färg:</span>
            {DRAW_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`sketch-swatch ${c === color ? "active" : ""}`}
                style={{ background: c }}
                title={c}
                onClick={() => handleColorClick(c)}
              />
            ))}
            <button type="button" className="btn btn-sm" onClick={armText}>
              🏷️ Lägg till text
            </button>
          </div>
        </>
      )}

      <div ref={containerRef} className="map-box" />

      {!editable && !initialValue && <div className="hint" style={{ marginTop: 8 }}>Ingen kartskiss tillagd för detta ärende.</div>}

      {editable && <input type="hidden" name={name} value={geoJsonStr} />}

      {pendingLatLng &&
        createPortal(
          <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setPendingLatLng(null)}>
            <div className="modal">
              <h3>Lägg till textetikett</h3>
              <p>Skriv texten som ska visas på kartan, t.ex. &quot;Avstängning&quot; eller &quot;Alternativ väg&quot;.</p>
              {/* Not a real <form>: this whole map can itself be mounted inside the
                  surrounding page's <form>, and nested <form> elements are invalid
                  HTML (breaks hydration). A plain div + Enter-key handler avoids it. */}
              <div
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmLabel();
                  }
                }}
              >
                <input
                  type="text"
                  placeholder="Etikettext"
                  maxLength={120}
                  autoFocus
                  value={labelText}
                  onChange={(e) => setLabelText(e.target.value)}
                  style={{ marginBottom: 16 }}
                />
                <div className="modal-actions">
                  <button type="button" className="btn" onClick={() => setPendingLatLng(null)}>
                    Avbryt
                  </button>
                  <button type="button" className="btn btn-primary" onClick={confirmLabel}>
                    Lägg till
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
