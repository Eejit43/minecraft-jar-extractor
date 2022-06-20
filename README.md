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

## Protocol extractor

```text
$ node protocol-extractor.js <version|version1,version2,...>
```

ex: `$ node protocol-extractor.js 1.18,1.19`

## Block loot table extractor

**_Only works in 1.14+_**

```text
$ node extract-loot-tables.js <version|version1,version2,...>
```

ex: `$ node extract-loot-tables.js 1.18,1.19`

## Add defaultState to a blocks.json

```text
$ node patch-states.js <version|version1,version2,...>
```

ex: `node patch-states.js 1.18,1.19`

## Add more accurate drops to a blocks.json

```text
$ node extract-data-folder.js <version|version1,version2,...>
```

Then:

```text
$ node extract-block-loot-tables.js <version|version1,version2,...>
```

ex:

`$ node extract-data-folder.js 1.18,1.19`

`$ node extract-block-loot-tables.js 1.18,1.19`
