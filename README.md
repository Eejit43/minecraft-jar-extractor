# minecraft-jar-extractor

Extract structured data from the minecraft jar

## Image name extractor

```text
$ node image-names.js <version|version1,version2,...>
```

ex: `node image-names.js 1.18,1.19`

## Lang extractor

```text
$ node lang.js <version|version1,version2,...>
```

ex: `node lang.js 1.18,1.19`

## Advancements extractor

```text
$ node advancements.js <version|version1,version2,...>
```

ex: `node advancements.js 1.18,1.19`

<!-- ## Protocol extractor

```text
$ node protocol-extractor.js <version|version1,version2,...>
```

ex: `$ node protocol-extractor.js 1.18,1.19` -->

## Block loot table extractor

**_Only works in 1.14+_**

```text
$ node extract-loot-tables.js <version|version1,version2,...>
```

ex: `$ node extract-loot-tables.js 1.18,1.19`

## Add/fix states in a `blocks.json`

```text
$ node patch-states.js <version> <fileName>
```

ex: `node patch-states.js 1.19 blocks.json`
