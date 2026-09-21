# Atlas data contract

Version 1. This is a static visualization of five-model mean scores. It has no
server-side inference, external feature queries, or tracking service.

## Coverage

- All 3,123 species in the original model order.
- All 579,752 available prediction cells in 66 counties.
- Monroe has no county Planet raster, so is drawn as unavailable.
- Stored cells retain the common projected 504 m grid in EPSG:32617; no spatial
  aggregation or spatial downsampling is used in the stored web data.
- County geometry is simplified to approximately 120 m for display only. It is
  not used to recalculate the prediction mask or assign clicked grid cells.

## Files

`data/metadata.json` describes the grid, provenance, cell count, and coding.
`data/species.json` contains 3,123 species records: name, speciesKey, kingdom,
model index (`id`, zero-based), file, min, max, step, observed quantization error,
file bytes, compressed SHA-256, and original-score statewide 2nd/50th/98th percentiles.

`data/grid-indices.u32.gz` is a gzip stream of 579,752 little-endian uint32
indices, strictly increasing. Each index is `row * width + column`. The origin
is the **upper left** of `metadata.extent` and rows increase southwards.

`data/county-ids.u8.gz` is a gzip stream of 579,752 uint8 county IDs in the same
order. They index `metadata.counties`, which includes the county name and FIPS.

Each `data/species/XX/IIII.u8.gz` is a gzip stream of 579,752 uint8 codes in
the same index order. `XX` is `floor(model_index / 100)` and `IIII` is the
zero-padded model index. The record's `file` is authoritative.

Decoded score:

```text
score = species.min + code * species.step
step = (species.max - species.min) / 127
code is an integer from 0 to 127
```

For a constant-valued species, step and all codes are zero. Code zero is a valid
prediction, generally equal to the species minimum; it is NOT a missing-data
marker. Missing cells are absent from the shared grid index. Float32 source
NoData is never encoded as a prediction score.

Cell center in EPSG:32617:

```text
x = xmin + (column + 0.5) * 504
y = ymax - (row + 0.5) * 504
```

`data/counties.geojson` is WGS84, with all 67 county display boundaries and an
`available` flag. `data/READY.json` records exhaustive export checks. Do not
publish a package without a passing READY marker.

## Precision

The export compares every decoded value against its source float32 mean.
Maximum absolute rounding error is `step / 2` (up to floating-point arithmetic
tolerance), bounded by 1/254 ≈ 0.003937. Actual per-species errors are recorded.
The browser labels clicked values as approximate and reports this error bound.
Small nonzero differences can collapse into one display value, especially for
low scores. Use the original float32 data for thresholds, statistical analyses,
or conclusions relying on such differences.

The model mean is calculated before quantization; the site does not average
separately rounded member predictions. Full-precision source rasters, model
weights, and all five member predictions are unchanged on HPC.

## Map rendering

The browser expands codes into a transparent image on the original UTM grid,
then OpenLayers projects it to Web Mercator for display. Interpolation is off.
At small map scales, screen resolution necessarily hides individual cells;
click queries always use the original grid index and decoded value.

Fixed colors map scores 0–1 consistently. Enhanced colors clip to the selected
species' original statewide P2–P98 range; if constant, its min–max or 0–1 range
is used. Enhanced colors are not directly comparable between species.

Inputs include 2023 Planet and AlphaEarth plus WorldClim. The trained models
use observations collected across years. This is not evidence of temporal
change, a current species census, or a validated 2023 occupancy distribution.

## References

- [OpenLayers image reprojection](https://openlayers.org/en/latest/examples/reprojection-image.html)
- [OpenStreetMap tile usage](https://operations.osmfoundation.org/policies/tiles/)
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
