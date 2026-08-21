import { useState, useRef, useEffect } from "react";
import * as maplibregl from "maplibre-gl";

interface SearchBarProps {
  map: maplibregl.Map | null;
}

interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  boundingbox: string[];
}

export default function SearchBar({ map }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim().length > 2) {
        performSearch(query);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const performSearch = async (q: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          q
        )}&format=json&limit=5`
      );
      if (!response.ok) throw new Error("Search failed");
      const data: SearchResult[] = await response.json();
      setResults(data);
      setIsOpen(true);
    } catch (error) {
      console.error("Geocoding error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (result: SearchResult) => {
    if (!map) return;
    
    setQuery(result.display_name);
    setIsOpen(false);

    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    if (!isNaN(lat) && !isNaN(lon)) {
      if (result.boundingbox && result.boundingbox.length === 4) {
        const [minLat, maxLat, minLon, maxLon] = result.boundingbox.map(parseFloat);
        map.fitBounds(
          [
            [minLon, minLat], // sw
            [maxLon, maxLat], // ne
          ],
          { padding: 50, duration: 1500 }
        );
      } else {
        map.flyTo({ center: [lon, lat], zoom: 14, duration: 1500 });
      }
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        width: "90%",
        maxWidth: "400px",
        fontFamily: "var(--font-primary)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
          borderRadius: "24px",
          padding: "8px 16px",
          transition: "all 0.3s ease",
        }}
      >
        <span style={{ fontSize: "1.2rem", marginRight: "8px" }}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Search for places..."
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            outline: "none",
            fontSize: "1rem",
            color: "var(--text-primary)",
          }}
        />
        {isSearching && (
          <div
            style={{
              width: "16px",
              height: "16px",
              border: "2px solid rgba(0,0,0,0.1)",
              borderTopColor: "var(--primary)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div
          style={{
            marginTop: "8px",
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
            borderRadius: "16px",
            overflow: "hidden",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {results.map((r, i) => (
            <div
              key={r.place_id}
              onClick={() => handleSelect(r)}
              style={{
                padding: "12px 16px",
                cursor: "pointer",
                borderBottom: i < results.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                fontSize: "0.95rem",
                color: "var(--text-primary)",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {r.display_name}
            </div>
          ))}
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
