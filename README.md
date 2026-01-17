# Convert Apple Icon Composer to Android Adaptive Icon

[Apple's Icon Composer](https://developer.apple.com/icon-composer/) generates `.icon` folders, containing `icon.json` and an `Assets` folder containing images referenced by the JSON.

It's a pretty nifty icon editor, and now, you can use it to export an [Android Adaptive Icon](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive), with separated background/foreground layers and monochrome support (on Android 13+) for tinted mode.

## Usage

```
$ npm install
$ node convert-icon.mjs MyIcon.icon [output-path]
```

## How it works

Android Adaptive Icons have three elements:

* `<foreground>`
* `<background>`
* `<monochrome>` (Android 13+, used in tinted mode)

We convert Icon Composer files to Android Adaptive Icons by generating PNGs for `<foreground>` and `<monochrome>`, and computing a drawable gradient for the `<background>`.

1. First we use `/Applications/Xcode.app/Contents/Applications/Icon Composer.app/Contents/Executables/ictool` to convert your Apple Icon Composer into PNG.
2. We then hide all groups and layers, rerunning `ictool` to export the canvas background.
3. We then extract the foreground (including alpha) by comparing against the background. If the foreground is semi-opaque, we can measure that and save it in the foreground PNG alpha channel.
4. We read the `icon.json` file inside your `.icon` bundle to read the canvas fill color/gradient. (If using automatic gradient, we read Apple's computed top color out of the exported background image.)
5. We then generate an Android drawable gradient based on those colors, and use that as the adaptive background.
6. Lastly, we run `ictool` to export a monochrome icon (`--rendition ClearLight`), and its background, and extract the foreground from the difference.

This preserves all Liquid Glass specular highlights (shiny reflective bits) and transparency/translucency. If that's not what you want, you might consider turning some of those effects off in Icon Composer before exporting to Android.
