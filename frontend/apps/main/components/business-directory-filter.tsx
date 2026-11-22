"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SearchIcon, FilterIcon, GridIcon, ListIcon, MapIcon } from "./icons";

type ViewMode = "grid" | "list" | "map";

type FilterOption = {
  value: string;
  label: string;
  count?: number;
};

export default function BusinessDirectoryFilter({
  categories,
  areas,
  totalCount,
}: {
  categories: FilterOption[];
  areas: FilterOption[];
  totalCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showFilters, setShowFilters] = useState(false);

  // Get current filter values
  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const area = searchParams.get("area") || "";
  const verified = searchParams.get("verified") || "";
  const sort = searchParams.get("sort") || "";

  // Update search params
  const updateSearchParams = useCallback(
    (params: Record<string, string | undefined>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === "") {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });
      router.replace(`${pathname}?${newParams.toString()}`);
    },
    [pathname, searchParams, router]
  );

  // Handle search
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const searchQuery = formData.get("q") as string;
    updateSearchParams({ q: searchQuery.trim() || undefined });
  };

  // Handle filter change
  const handleFilterChange = (filterType: string, value: string) => {
    updateSearchParams({ [filterType]: value === "all" ? undefined : value });
  };

  // Handle view mode change
  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    // Could update URL with view param if needed
  };

  // Active filter count
  const activeFilters = [q, category, area, verified, sort].filter(
    (v) => v && v !== "all"
  ).length;

  return (
    <div className="business-directory-filter">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="business-directory-filter__search">
        <div className="business-directory-filter__search-inner">
          <SearchIcon size={18} />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search businesses..."
            className="business-directory-filter__search-input"
          />
          {q && (
            <button
              type="button"
              onClick={() => updateSearchParams({ q: undefined })}
              className="business-directory-filter__clear"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <button type="submit" className="business-directory-filter__search-button">
          Search
        </button>
      </form>

      {/* Filter Toggle */}
      <div className="business-directory-filter__controls">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="business-directory-filter__filter-toggle"
          aria-expanded={showFilters}
        >
          <FilterIcon size={16} />
          Filters
          {activeFilters > 0 && (
            <span className="business-directory-filter__filter-count">
              {activeFilters}
            </span>
          )}
        </button>

        {/* View Mode Toggle */}
        <div className="business-directory-filter__view-toggle">
          <button
            type="button"
            onClick={() => handleViewChange("grid")}
            className={`business-directory-filter__view-button ${
              viewMode === "grid" ? "business-directory-filter__view-button--active" : ""
            }`}
            aria-label="Grid view"
          >
            <GridIcon size={18} />
          </button>
          <button
            type="button"
            onClick={() => handleViewChange("list")}
            className={`business-directory-filter__view-button ${
              viewMode === "list" ? "business-directory-filter__view-button--active" : ""
            }`}
            aria-label="List view"
          >
            <ListIcon size={18} />
          </button>
          <button
            type="button"
            onClick={() => handleViewChange("map")}
            className={`business-directory-filter__view-button ${
              viewMode === "map" ? "business-directory-filter__view-button--active" : ""
            }`}
            aria-label="Map view"
          >
            <MapIcon size={18} />
          </button>
        </div>

        {/* Sort Options */}
        <select
          value={sort}
          onChange={(e) => handleFilterChange("sort", e.target.value)}
          className="business-directory-filter__sort"
          aria-label="Sort by"
        >
          <option value="">Sort by: Newest</option>
          <option value="name_asc">Name (A-Z)</option>
          <option value="name_desc">Name (Z-A)</option>
          <option value="verified">Verified First</option>
        </select>
      </div>

      {/* Filter Dropdown */}
      {showFilters && (
        <div className="business-directory-filter__dropdown">
          {/* Category Filter */}
          <div className="business-directory-filter__group">
            <h3 className="business-directory-filter__group-title">Category</h3>
            <select
              value={category}
              onChange={(e) => handleFilterChange("category", e.target.value)}
              className="business-directory-filter__select"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label} {cat.count && `(${cat.count})`}
                </option>
              ))}
            </select>
          </div>

          {/* Area Filter */}
          <div className="business-directory-filter__group">
            <h3 className="business-directory-filter__group-title">Area</h3>
            <select
              value={area}
              onChange={(e) => handleFilterChange("area", e.target.value)}
              className="business-directory-filter__select"
            >
              <option value="">All Areas</option>
              {areas.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label} {a.count && `(${a.count})`}
                </option>
              ))}
            </select>
          </div>

          {/* Verified Filter */}
          <div className="business-directory-filter__group">
            <h3 className="business-directory-filter__group-title">Status</h3>
            <select
              value={verified}
              onChange={(e) => handleFilterChange("verified", e.target.value)}
              className="business-directory-filter__select"
            >
              <option value="">All Businesses</option>
              <option value="verified">Verified Only</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="business-directory-filter__results">
            <strong>{totalCount}</strong> businesses found
          </div>

          {/* Clear Filters */}
          <button
            type="button"
            onClick={() => {
              updateSearchParams({
                q: undefined,
                category: undefined,
                area: undefined,
                verified: undefined,
                sort: undefined,
              });
              setShowFilters(false);
            }}
            className="business-directory-filter__clear-all"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}
