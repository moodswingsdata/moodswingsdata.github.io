# Mood Swings Data

This site is like mtgjson but for Mark Rosewater's game [Mood Swings](https://magic.wizards.com/en/news/feature/mood-swings-extended-rules).

## Search engine

[Feelings](/feelings) is a search engine for Mood Swings cards built on this data.

## Available data

- Meta info (like schema version): [meta.yaml](/msw/meta.yaml) • [meta.json](/msw/meta.json)
- Editions: [editions.yaml](/msw/editions.yaml) • [editions.json](/msw/editions.json)
- Cards: [cards.yaml](/msw/cards.yaml) • [cards.json](/msw/cards.json)
- Printings:
  - Edition 1 (MSW) [printings.yaml](/msw/printings.yaml) • [printings.json](/msw/printings.json)

## Caveats

This is a very early work in progress. We're still figuring out the right data shapes and API contracts to support.

## Data pipeline

The [data pipeline for this content](https://github.com/moodswingsdata/moodswingsdatapipeline) uses publicly available data and some human curation to generate these files.

## Fan content

Mood Swings Data is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
