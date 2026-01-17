# Android Adaptive Icons

Android Adaptive Icons have no formal specification or reference documentation. The official doc for them is here:

https://developer.android.com/develop/ui/views/launch/icon_design_adaptive

They provide two examples:

```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
    <monochrome android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
```

```xml
<foreground>
   <inset
       android:insetBottom="18dp"
       android:insetLeft="18dp"
       android:insetRight="18dp"
       android:insetTop="18dp">
       <shape android:shape="oval">
           <solid android:color="#0000FF" />
       </shape>
   </inset>
</foreground>
```

## Informal specification

An adaptive icon is an XML file containing an `<adaptive-icon>` element, with no attributes other than the standard `xmlns:android` namespace.

`<adaptive-icon>` can have up to three child elements called "layers":

* `<foreground>`
* `<background>`
* `<monochrome>` (added in Android 13 for themed icons)

Each layer can either have a `drawable=` attribute, referencing an Android Drawable defined in resources, or it can have exactly one child element that is an XML representation of a drawable.

Android Drawables _do_ have reference documentation, available here: https://developer.android.com/guide/topics/resources/drawable-resource

## Where did this informal specification come from?

The source code for adaptive icons is here: https://cs.android.com/android/platform/superproject/+/android-latest-release:frameworks/base/graphics/java/android/graphics/drawable/AdaptiveIconDrawable.java

(I've also checked that in here as ./AdaptiveIconDrawable.java)

The code references AdaptiveIconDrawableLayer, which turns out to be https://cs.android.com/android/platform/superproject/+/android-latest-release:frameworks/base/core/res/res/values/attrs.xml;l=7338?q=AdaptiveIconDrawableLayer&ss=android%2Fplatform%2Fsuperproject

```xml
<!-- Drawable used to draw adaptive icons with foreground and background layers. -->
<declare-styleable name="AdaptiveIconDrawableLayer">
    <!-- The drawable to use for the layer. -->
    <attr name="drawable" />
</declare-styleable>
```

So, I read the code, and wrote that informal specification.