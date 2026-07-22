#!/usr/bin/env python3
"""Builds a precomputed, effort-weighted walking graph for one city.

Pipeline: fetch the OSM pedestrian network for a bounding box (OSMnx),
attach elevation from Copernicus DEM GLO-30, compute a Tobler's-hiking-
function time cost per directed edge, and serialize the result as compact
parallel arrays consumed by the app's routing code (see api/_lib/graph.ts).

To add a new city, rerun this script with a new --city and --bbox — no
application code changes needed, just one new entry in api/_lib/cities.ts
pointing at the output file.

Usage:
    python build_graph.py --city lisbon \\
        --bbox -9.2328,38.6912,-9.0857,38.7936 \\
        --output ../data/cities/lisbon.json
"""

from __future__ import annotations

import argparse
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlretrieve

import osmnx as ox

TOBLER_MAX_SPEED_KMH = 6.0
DEM_BUCKET_URL = "https://copernicus-dem-30m.s3.amazonaws.com"

# Mirrors api/_lib/grade.ts's MAX_ABS_GRADE. No real street sustains a grade
# beyond this; clamping guards against DEM sampling noise on very short edges
# (adjacent raster pixels can disagree by several meters of elevation over a
# 1-2m edge, implying an impossible slope that would blow up Tobler's cost
# function toward absurd values).
MAX_ABS_GRADE = 1.5


def tobler_speed_kmh(grade: float) -> float:
    """Tobler's hiking function: predicted walking speed at a given slope."""
    return TOBLER_MAX_SPEED_KMH * math.exp(-3.5 * abs(grade + 0.05))


def edge_cost_seconds(length_m: float, grade: float) -> float:
    clamped_grade = max(-MAX_ABS_GRADE, min(MAX_ABS_GRADE, grade))
    speed_m_per_s = tobler_speed_kmh(clamped_grade) * 1000 / 3600
    return length_m / speed_m_per_s


def dem_tile_id(lat_floor: int, lon_floor: int) -> str:
    lat_hem = "N" if lat_floor >= 0 else "S"
    lon_hem = "E" if lon_floor >= 0 else "W"
    return f"Copernicus_DSM_COG_10_{lat_hem}{abs(lat_floor):02d}_00_{lon_hem}{abs(lon_floor):03d}_00_DEM"


def download_dem_tiles(bbox: tuple[float, float, float, float], cache_dir: Path) -> list[str]:
    """Downloads (or reuses cached) Copernicus DEM GLO-30 tiles covering bbox."""
    min_lon, min_lat, max_lon, max_lat = bbox
    lat_floors = {math.floor(min_lat), math.floor(max_lat)}
    lon_floors = {math.floor(min_lon), math.floor(max_lon)}

    cache_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for lat_floor in sorted(lat_floors):
        for lon_floor in sorted(lon_floors):
            tile_id = dem_tile_id(lat_floor, lon_floor)
            local_path = cache_dir / f"{tile_id}.tif"
            if not local_path.exists():
                url = f"{DEM_BUCKET_URL}/{tile_id}/{tile_id}.tif"
                print(f"Downloading DEM tile: {url}")
                urlretrieve(url, local_path)
            paths.append(str(local_path))
    return paths


def build_graph(city_id: str, bbox: tuple[float, float, float, float], cache_dir: Path) -> dict:
    dem_paths = download_dem_tiles(bbox, cache_dir)

    print(f"Fetching OSM walk network for bbox={bbox}...")
    graph = ox.graph_from_bbox(bbox=bbox, network_type="walk", simplify=True)
    print(f"Fetched graph: {graph.number_of_nodes()} nodes, {graph.number_of_edges()} edges")

    print("Attaching elevation from DEM...")
    # Passing a single path (rather than a list) skips OSMnx's VRT-merging
    # step entirely, which is both unnecessary for one tile and currently
    # broken in rio-vrt for single-file inputs.
    dem_source = dem_paths[0] if len(dem_paths) == 1 else dem_paths
    graph = ox.elevation.add_node_elevations_raster(graph, dem_source)
    graph = ox.elevation.add_edge_grades(graph, add_absolute=False)

    node_ids = list(graph.nodes)
    node_index = {node_id: i for i, node_id in enumerate(node_ids)}

    lat = [graph.nodes[n]["y"] for n in node_ids]
    lon = [graph.nodes[n]["x"] for n in node_ids]
    elevation = [float(graph.nodes[n]["elevation"]) for n in node_ids]

    edges = sorted(graph.edges(keys=True, data=True), key=lambda e: node_index[e[0]])

    edge_from, edge_to, edge_distance, edge_cost = [], [], [], []
    for u, v, _key, data in edges:
        length_m = float(data["length"])
        grade = float(data.get("grade", 0.0))
        edge_from.append(node_index[u])
        edge_to.append(node_index[v])
        edge_distance.append(length_m)
        edge_cost.append(edge_cost_seconds(length_m, grade))

    node_edge_start = [0] * (len(node_ids) + 1)
    edge_cursor = 0
    for node_idx in range(len(node_ids)):
        node_edge_start[node_idx] = edge_cursor
        while edge_cursor < len(edge_from) and edge_from[edge_cursor] == node_idx:
            edge_cursor += 1
    node_edge_start[len(node_ids)] = edge_cursor

    return {
        "cityId": city_id,
        "bbox": list(bbox),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "nodes": {"lat": lat, "lon": lon, "elevation": elevation},
        "edges": {
            "from": edge_from,
            "to": edge_to,
            "distanceM": edge_distance,
            "costS": edge_cost,
        },
        "nodeEdgeStart": node_edge_start,
    }


def parse_bbox(raw: str) -> tuple[float, float, float, float]:
    parts = [float(p) for p in raw.split(",")]
    if len(parts) != 4:
        raise argparse.ArgumentTypeError("bbox must be 'minLon,minLat,maxLon,maxLat'")
    return tuple(parts)  # type: ignore[return-value]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--city", required=True, help="City id, e.g. 'lisbon'")
    parser.add_argument("--bbox", required=True, type=parse_bbox, help="minLon,minLat,maxLon,maxLat")
    parser.add_argument("--output", required=True, type=Path, help="Path to write the graph JSON")
    parser.add_argument(
        "--cache-dir", type=Path, default=Path(__file__).parent / ".cache", help="DEM tile download cache"
    )
    args = parser.parse_args()

    data = build_graph(args.city, args.bbox, args.cache_dir)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with open(args.output, "w") as f:
        json.dump(data, f)

    node_count = len(data["nodes"]["lat"])
    edge_count = len(data["edges"]["from"])
    size_kb = args.output.stat().st_size / 1024
    print(f"Wrote {args.output}: {node_count} nodes, {edge_count} edges, {size_kb:.0f} KB")


if __name__ == "__main__":
    main()
