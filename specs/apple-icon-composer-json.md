# Apple Icon Composer JSON

Apple icons appear in a folder ending with `.icon`. Inside the `.icon` folder, there's an `icon.json` file, and an `Assets` folder, containing files referenced by `icon.json`.

## JSON Schema

A JSON Schema definition for `icon.json` files has been generated based on example files. The schema is available at:

- [`apple-icon-composer-json-schema.json`](./apple-icon-composer-json-schema.json)

Copied from https://github.com/dfabulich/unofficial-apple-icon-composer-json-schema

This schema defines the structure of `icon.json` files, including:

- Root-level properties (fill, fill-specializations, groups, supported-platforms)
- Groups with layers, blend modes, shadows, translucency, and specializations
- Layers with images, fills, positions, opacity, and specializations
- Specializations based on appearance (dark, tinted) and idiom (square, watchOS)
- Color formats (display-p3, srgb, extended-gray)
- Fill types (solid, linear-gradient, automatic-gradient, automatic, system-dark, none)