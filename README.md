# CSSDM Florida Species Atlas

A static, browser-only atlas of all 3,123 modeled species across the 66 Florida
counties with available imagery. Select a species to view its statewide map.
Monroe is explicitly marked as unavailable, not predicted as zero.

Predictions are the arithmetic mean of five calibrated CSSDM models, on the
original approximately 504 m EPSG:32617 grid. This is an ecological-review tool,
not independent performance validation or a map of validated occupancy probabilities.

## Deployment

See [the detailed Chinese GitHub guide](README_GITHUB_CN.md).
Upload the **contents of this folder** to a dedicated repository. Enable GitHub
Pages from the `main` branch, `/(root)`. No API key, backend, npm build, or paid
map service is required. Do not upload the delivery ZIP itself.

The website contains every species, but only loads one species raster at a time.
The original scientific float32 rasters remain separate on HPC.

## Local preview

From this folder, with Python installed:

```bash
python -m http.server 8000 --bind 127.0.0.1
```

Visit `http://127.0.0.1:8000`. Do not double-click `index.html` because browsers
restrict local-file fetches. Use a current Chrome, Edge, Firefox, or Safari.

## Precision and interpretation

All original prediction cells are retained. Web values use 128 uniformly spaced
levels **within each species' statewide minimum–maximum range**, stored as uint8
and gzip compressed. The maximum numerical error is half that species' step,
never more than 1/254 (approximately 0.00394). This is an absolute score error,
not a relative-percent error; relative error can be appreciable for tiny scores.
It is a visualization product, not a substitute for float32 analysis inputs.

The default colors use the same 0–1 scale for every county and species. The
optional enhanced scale uses statewide 2nd–98th percentiles for the selected
species, and is explicitly labeled. Color limits do not change clicked values.

See [DATA_FORMAT.md](DATA_FORMAT.md) and [data/READY.json](data/READY.json).

## Third-party software and basemap

Pinned OpenLayers and proj4js distributions and licenses are in `vendor/`.
The optional street basemap uses OpenStreetMap tiles with visible attribution.
Do not bulk-download or prefetch tiles. If traffic grows beyond a modest
research audience, review the provider's usage policy and hosting quotas.

The source imagery, observation locations, credentials, model weights, and
individual-model rasters are not bundled. Before public deployment, ensure the
project team is comfortable publishing the derived prediction maps. No new
license for the project's research data is granted by this README.
