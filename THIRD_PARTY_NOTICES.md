# Third-party materials and notices

The root [MIT License](LICENSE) covers the original UrbanFlow AI software and
documentation. It does not replace the licenses, terms, attribution obligations,
or ownership notices of third-party material. Existing upstream notices must be
retained when redistributing their material.

## Taxi records and derived observation panels

The project uses historical NYC Yellow Taxi records and derived regional count
panels. The City of New York and the source providers retain their applicable
rights and terms. The project's MIT license does not relicense the underlying
source data. Source processing, filters, dataset identifiers and modifications
are described in the README and acquisition provenance.

- [NYC Open Data Terms of Use](https://data.cityofnewyork.us/stories/s/Terms-of-Use/k9k7-3cje)
- [NYC TLC trip-record data](https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page)

The source is historical data for this project's defined retained-trip target.
Neither the project nor its results imply endorsement by NYC Open Data or the
New York City Taxi and Limousine Commission.

## Software dependencies

Python and JavaScript dependencies retain their own upstream licenses and
copyright notices. The repository's MIT license is not a replacement for those
licenses. Consult the pinned dependency files, each package's distribution
metadata, and the license files shipped with installed packages when
redistributing an environment or application bundle.

## Homepage photographs

The photographs in `frontend/src/assets/` and their matching
`frontend/public/images/` copies are third-party photographs, not MIT-licensed
UrbanFlow artwork. They were recovered from the public reference frontend
identified in the supplied screen recording. All five image hashes match the
intended assets listed in the supplied reference ZIP.

The reference credits identify the following photographers. Four original
Pexels photo pages were independently located; the fifth photographer credit is
retained from the reference README. Exact hashes, retrieval provenance and the
available source links are recorded in [photo provenance](docs/photo-provenance.json).

| File | Photographer credit | Located original photo page |
|---|---|---|
| `hero-manhattan.jpg` | Olivia Chen | [Night skyline](https://www.pexels.com/photo/bright-lights-of-city-buildings-at-night-4978696/) |
| `digital-twin.jpg` | Charles Parker | [City rooftops at night](https://www.pexels.com/photo/drone-shot-of-a-city-at-night-5847761/) |
| `street-rain.jpg` | Jane Mir | [Rainy New York street](https://www.pexels.com/photo/a-person-crossing-the-road-on-a-rainy-day-10398361/) |
| `times-canyon.jpg` | Mateusz Walendzik | [Times Square at night](https://www.pexels.com/photo/advertising-on-skyscrapers-at-time-square-at-night-17096028/) |
| `aerial-intersection.jpg` | Matthis Volquardsen, as credited in the reference | See the recorded reference site in the provenance file |

Refer to the [Pexels License](https://www.pexels.com/license/) for Pexels material.
Do not remove existing credits or present photographs, people or visible brands
as endorsing UrbanFlow AI. Identifying the exact files does not transfer the
photographers' copyright to this project.

## Map services and cartographic attribution

City Explorer requests external Esri basemap tiles and preserves the attribution
displayed in the map. Those tiles and their service terms are separate from the
MIT license for application code. OpenStreetMap contributors are credited where
applicable; see [OpenStreetMap copyright and licensing](https://www.openstreetmap.org/copyright).
The schematic fallback is labeled as orientation material, not an authoritative
survey or a set of model-region polygons.

## Fonts

The interface requests Bebas Neue, Space Grotesk and JetBrains Mono through
Google Fonts. Font files retain their respective font licenses. The application
code's MIT license does not replace those licenses.

## Historical README visuals

Images under `docs/legacy/` are preserved from the repository owner's earlier
README attachments. Their original canonical URLs, revisions and hashes are in
`docs/legacy/provenance.json`. Existing embedded map, tile or other third-party
attributions remain applicable. The figures are labeled as historical material;
the root MIT license does not relabel third-party material inside a screenshot.

## Historical weather and neighborhood area labels

Weather data is obtained from [Open-Meteo](https://open-meteo.com/en/docs/historical-weather-api),
using Copernicus ERA5 reanalysis; attribution: Open-Meteo and Copernicus Climate
Change Service/ECMWF. Open-Meteo data is provided under
[CC BY 4.0](https://open-meteo.com/en/licence). The public API's
[non-commercial usage terms](https://open-meteo.com/en/terms) apply.

Centroid area labels derive from NYC Department of City Planning's
[2020 Neighborhood Tabulation Areas](https://data.cityofnewyork.us/City-Government/2020-Neighborhood-Tabulation-Areas-NTAs-/9nt8-h7nd).
The data's NYC Open Data terms remain applicable. The project MIT license does
not replace provider data terms. Area labels do not define model boundaries.
