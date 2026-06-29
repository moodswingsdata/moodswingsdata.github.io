# Mood Swings Data

This site is like mtgjson but for Mark Rosewater's game [Mood Swings](https://magic.wizards.com/en/news/feature/mood-swings-extended-rules).

## Search engine

We recommend [Moodiest](https://moodiest.app/), the premier Mood Swings search engine.
It's powered by this data and works a lot like Scryfall.

There is also [Feelings](/feelings), a client-side search engine used as a proof-of-concept for the data pipeline.
But really, just use Moodiest.

## Available data

- Meta info (like schema version): [meta.yaml](/msw/meta.yaml) • [meta.json](/msw/meta.json)
- Editions: [editions.yaml](/msw/editions.yaml) • [editions.json](/msw/editions.json)
- Cards: [cards.yaml](/msw/cards.yaml) • [cards.json](/msw/cards.json)
- Printings:
  - Edition 1 (MSW) [printings.yaml](/msw/printings.yaml) • [printings.json](/msw/printings.json)

## Data pipeline

The [data pipeline for this content](https://github.com/moodswingsdata/moodswingsdatapipeline) uses publicly available data and some human curation to generate these files.

### Data/schema versioning

See the [changelog](https://github.com/moodswingsdata/moodswingsdatapipeline/blob/main/CHANGELOG.md) for schema version changes. Data can be fetched from [releases](https://github.com/moodswingsdata/moodswingsdatapipeline/releases), where the tag is `v<schema>/<release_date>`.

## Fan content

Mood Swings Data is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
