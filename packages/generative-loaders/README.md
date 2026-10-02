# generative-loaders

Accessible React loading states designed for generative interfaces: sixteen animated text reveals, eighteen compact activity indicators, and twelve image-generation placeholders.

[Live gallery](https://generativeloaders.com) · [Documentation](https://generativeloaders.com/docs) · [GitHub](https://github.com/kasturibuilds/generative-loaders) · [Report an issue](https://github.com/kasturibuilds/generative-loaders/issues/new/choose)

## Install

```bash
npm install generative-loaders
```

The package supports React 18 and newer. Import the stylesheet once near your application root.

```tsx
import { ImageLoader, InlineLoader, TextLoader } from "generative-loaders";
import "generative-loaders/styles.css";

<TextLoader text={streamedText} variant="decode" color="#111111" />

<span>
  <InlineLoader variant="matrix" /> Thinking through the details…
</span>

<ImageLoader variant="bands" size={160} label="Generating image" />
```

## Streaming text

Pass the complete response received so far—not only the newest token. `TextLoader` keeps the existing prefix stable and animates only the newly appended suffix.

```tsx
const [text, setText] = useState("");

// Append each decoded response chunk as it arrives.
setText((current) => current + chunk);

return <TextLoader text={text} variant="cascade" />;
```

## Variants

**Text:** `decode`, `typewriter`, `skeleton`, `cascade`, `focus`, `wipe`, `flip`, `redact`, `line`, `terminal`, `wave`, `dissolve`, `slice`, `tracking`, `coalesce`, `fragments`

**Inline:** `glyph`, `matrix`, `orbit`, `ripple`, `signal`, `spark`, `rotor`, `pixel-drift`, `chomp`, `snake`, `fold`, `gravity`, `domino`, `aperture`, `dot-pulse`, `vortex`, `halo`, `count-up`

**Image:** `skeleton`, `bands`, `tiles`, `scan`, `pixel-grid`, `resolution`, `coalesce`, `diffusion`, `raster`, `bloom`, `focus`, `shutter`

## Props

### `TextLoader`

| Prop | Type | Default |
| --- | --- | --- |
| `text` | `string` | required |
| `variant` | `TextLoaderVariant` | required |
| `color` | CSS color string | `"#111111"` |
| `speed` | positive number | `1` |
| `paused` | `boolean` | `false` |
| `className` | `string` | — |
| `aria-label` | `string` | normalized `text` |

`InlineLoader` accepts `variant`, `size`, `color`, `speed`, `paused`, `className`, and an optional accessible `label`.

`ImageLoader` accepts `variant`, `size`, `color`, `radius`, `speed`, `paused`, `className`, and `label`. Its default label is “Generating image.”

All prop and variant types are exported from the package root.

## Accessibility and behavior

- Polite live status output for streamed text.
- Decorative animation layers hidden from assistive technology.
- Reduced-motion support with meaningful static states.
- Stable SSR markup and append-aware text updates.
- Safe fallback for invalid speed values.

Read the [complete documentation](https://generativeloaders.com/docs) for integration examples and troubleshooting.

## License

[MIT](./LICENSE) © Kasturi Khanke and Generative Loaders contributors.
