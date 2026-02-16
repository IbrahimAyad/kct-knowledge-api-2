# Color Science Data Cleanup Notes

## Duplicate Files (DO NOT LOAD)
These `_1` suffix files are duplicates from the original Perplexity research export:

- `colorblind_perception_analysis_1.csv` — EXACT duplicate of `colorblind_perception_analysis.csv`. Ignore.
- `video_call_undertones_1.csv` — EXACT duplicate of `video_call_undertones.csv`. Ignore.
- `script_1.py` — Duplicate generation script. Ignore.

## Preferred Version
- `lighting_color_perception_1.csv` — Has an extra `Overall_Accuracy` column that the original lacks. **USE THIS ONE** instead of `lighting_color_perception.csv` when loading data.

## Canonical Files to Load
1. `colorblind_perception_analysis.csv` (8 vision types, accessibility data)
2. `lighting_color_perception_1.csv` (12 lighting types with Overall_Accuracy column)
3. `video_call_undertones.csv` (12 undertone types, webcam performance)
