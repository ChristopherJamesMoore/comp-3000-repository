# Sellxa Design System — Theme Reference

This document captures the complete design language of the Sellxa platform, extracted directly from the codebase. Use it as a reference when building other projects in the same visual style.

---

## Design Philosophy

**Clean, minimal, professional B2B SaaS.** No decorative colour, no gradients, no shadows beyond a subtle `shadow-sm`. The UI gets out of the way and lets the data be the focus.

Key principles extracted from the codebase:
- **Light mode only** — no dark mode is used in the app
- **Monochromatic zinc palette** — the entire UI is built on shades of zinc (warm grey). No accent blues, purples, or brand colours anywhere in the UI chrome. Semantic colour (green, red) appears only in status indicators.
- **Density without clutter** — tables and toolbars pack a lot of information without feeling cramped, achieved through consistent small text sizes and tight but not stingy padding
- **Borders define space** — structure comes from `border-zinc-200` dividers and card borders, not background colour changes
- **shadcn/ui component base** — all components are built on shadcn/ui with Radix UI primitives, styled via Tailwind CSS v4

---

## Colour Palette

The entire palette is defined in CSS variables in `globals.css` using `oklch()` colour values.

### Light mode (default — the only mode used)

| Role | CSS variable | Tailwind equivalent | Visual |
|------|-------------|---------------------|--------|
| Page background | `--background` | `bg-zinc-50` | Very light warm grey |
| Card / panel background | `--card` | `bg-white` | Pure white |
| Sidebar background | `--sidebar` | `bg-white` | Pure white |
| Primary text | `--foreground` | `text-zinc-900` | Near-black |
| Secondary text | `--muted-foreground` | `text-zinc-500` | Mid grey |
| Borders | `--border` | `border-zinc-200` | Light grey |
| Input borders | `--input` | `border-zinc-200` | Same as above |
| Primary button bg | `--primary` | `bg-zinc-900` | Near-black |
| Primary button text | `--primary-foreground` | `text-white` | White |
| Secondary / muted bg | `--muted` / `--secondary` | `bg-zinc-100` | Very light grey |
| Destructive | `--destructive` | `text-red-600` / `bg-red-...` | Red (delete/danger only) |
| Ring / focus | `--ring` | `ring-zinc-400` | Mid grey outline |

### Semantic status colours

These appear only on status indicators (badges, icons), never on structural UI:

| Status | Colour | Usage |
|--------|--------|-------|
| Active / success | `text-emerald-700`, `bg-emerald-50`, `ring-emerald-600/20` | Active records, connected integrations |
| Inactive / neutral | `bg-zinc-100 text-zinc-900` (secondary badge) | Inactive records |
| Error / danger | `text-red-600`, `bg-red-50` | Errors, delete confirmations |
| Warning | `text-amber-600`, `bg-amber-50` | Cautionary states |

---

## Typography

**Font:** Inter, loaded from Google Fonts via `next/font/google`. Four weights in use: 400, 500, 600, 700.

```ts
// In layout.tsx
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
// Applied: className={`${inter.variable} font-sans antialiased`}
```

### Type scale

| Element | Classes | Notes |
|---------|---------|-------|
| Page title (h1) | `text-2xl font-bold text-zinc-900` | Used on every list/detail page |
| Section heading | `text-lg font-semibold text-zinc-900` | Card headers, wizard step titles |
| Subheading / label | `text-sm font-semibold text-zinc-900` | Column headers, group labels |
| Body / table cell | `text-sm text-zinc-600` or `text-zinc-900` | Standard readable text |
| Helper / description | `text-sm text-zinc-500` | Subtitle under page title, form hints |
| Micro / metadata | `text-xs text-zinc-500` | Timestamps, secondary detail |
| Monospace (codes) | `font-mono text-xs` | Account codes, reference IDs in badges |
| Brand name | `text-lg font-bold tracking-tight` | "Sellxa" in sidebar |

### Page header pattern (used on every main page)

```tsx
<div>
  <h1 className="text-2xl font-bold text-zinc-900">Accounts</h1>
  <p className="mt-1 text-sm text-zinc-500">
    Manage vendors, buyers, contacts, and addresses.
  </p>
</div>
```

---

## Buttons

Built on shadcn/ui `cva`. All buttons use `rounded-md`, `text-sm font-medium`, `transition-all`.

### Variants

**Default (primary)**
```
bg-zinc-900 text-white hover:bg-zinc-900/90
```
Near-black background, white text. Used for the primary action on any screen (New, Save, Continue).

**Outline**
```
border border-zinc-200 bg-white hover:bg-zinc-50 hover:text-zinc-900
```
White background, zinc border. Used for secondary actions (Edit, Cancel in dialogs, filters).

**Ghost**
```
hover:bg-zinc-50 hover:text-zinc-900
```
No background or border at rest. Used for tertiary actions (row action buttons, icon-only buttons).

**Destructive**
```
bg-red-600 text-white hover:bg-red-600/90
```
Red. Used exclusively for delete/danger confirm actions. Never used on the initial trigger — only on the confirm button inside a `ConfirmDialog`.

**Link**
```
text-zinc-900 underline-offset-4 hover:underline
```
Inline link style. Rare.

### Sizes

| Size name | Height | Padding | Font | Use case |
|-----------|--------|---------|------|----------|
| `xs` | `h-6` | `px-2` | `text-xs` | Compact inline actions |
| `sm` | `h-8` | `px-3` | `text-sm` | Toolbar actions, card actions |
| `default` | `h-9` | `px-4` | `text-sm` | Standard buttons (forms, dialogs) |
| `lg` | `h-10` | `px-6` | `text-sm` | Auth pages (Sign in, Continue) |
| `icon` | `h-9 w-9` | — | — | Icon-only (e.g. row kebab menu) |
| `icon-sm` | `h-8 w-8` | — | — | Compact icon-only |

### Icon inside a button

Icons always come **before** the label text. Size `h-4 w-4`, margin `mr-2`:
```tsx
<Button size="sm">
  <Plus className="mr-2 h-4 w-4" />
  New Account
</Button>
```

For icon-only buttons, use `variant="ghost" size="icon"`:
```tsx
<Button variant="ghost" size="icon" className="h-8 w-8">
  <MoreHorizontal className="h-4 w-4" />
</Button>
```

---

## Cards

All cards use: `bg-white rounded-xl border border-zinc-200 shadow-sm`

Internal structure uses `gap-6` between header, content, and footer sections.

```tsx
// Exact shadcn Card classes
<Card>                          // bg-white rounded-xl border py-6 shadow-sm flex flex-col gap-6
  <CardHeader>                  // px-6 — title + description, auto grid
    <CardTitle>Title</CardTitle>            // font-semibold leading-none
    <CardDescription>Subtitle</CardDescription>  // text-sm text-muted-foreground
  </CardHeader>
  <CardContent>                 // px-6
    ...
  </CardContent>
  <CardFooter>                  // px-6 flex items-center
    ...
  </CardFooter>
</Card>
```

Auth pages (login, onboarding) use a narrower card: `w-full max-w-sm` centred in a `flex min-h-screen items-center justify-center bg-zinc-50` container.

---

## Inputs and Form Controls

### Text input
```
h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-xs
placeholder:text-zinc-400
focus-visible:border-zinc-400 focus-visible:ring-[3px] focus-visible:ring-zinc-200
disabled:opacity-50 disabled:cursor-not-allowed
```

### Search input with icon
The search icon sits absolutely inside a relative container:
```tsx
<div className="relative">
  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
  <Input className="max-w-xs pl-9" placeholder="Search accounts..." />
</div>
```

### Label
```
text-sm font-medium text-zinc-700
```
Always placed above the input with `space-y-2` between label and input:
```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" />
</div>
```

### Form field group spacing
```
space-y-4   ← between fields
space-y-2   ← between label and input
```

### Error text
```
text-sm text-red-600
```
Placed immediately below the input that has the error.

### Select, Textarea
Same border/radius/height conventions as Input. Consistent `h-9` height for selects; textarea is taller as needed.

### Checkbox
Standard shadcn checkbox — `rounded-sm border border-zinc-200`, checked state uses primary colour.

---

## Badges

Fully `rounded-full`. Size: `px-2 py-0.5 text-xs font-medium`. Built with `cva`.

### Variants

| Variant | Classes | When to use |
|---------|---------|------------|
| `default` | `bg-zinc-900 text-white` | Active / positive status (Active, connected) |
| `secondary` | `bg-zinc-100 text-zinc-900` | Neutral / inactive status (Inactive) |
| `outline` | `border border-zinc-200 text-zinc-900` | Labels, metadata tags, inactive filter toggles |
| `destructive` | `bg-red-600 text-white` | Error states (used sparingly) |

### Filter toggle pattern (toolbar badges)
Badges are used as toggleable filters in toolbars. Toggle between `default` and `outline` based on active state:
```tsx
<Badge
  variant={isActive ? "default" : "outline"}
  className="cursor-pointer"
  onClick={() => toggle()}
>
  Vendors
</Badge>
```

### Status + code in page headers
```tsx
<h1 className="text-2xl font-bold text-zinc-900">{account.name}</h1>
<Badge variant="outline" className="font-mono text-xs">{account.code}</Badge>
// → outlined badge with monospace font for reference codes
```

---

## Navigation (Sidebar)

The sidebar is a fixed-width left panel, not a top nav. Width: `w-56`.

### Overall structure
```
aside  w-56 flex flex-col border-r border-zinc-200 bg-white
  ├── header   h-14 px-4  flex items-center justify-between
  │     └── brand name: text-lg font-bold tracking-tight
  ├── org name  px-4 pb-3  text-xs font-medium text-zinc-500 truncate
  ├── <Separator />  (border-t border-zinc-200)
  ├── nav  flex-1 space-y-1 px-2 py-3
  │     └── nav items (see below)
  ├── <Separator />
  └── user footer  p-3
        ├── name: text-sm font-medium text-zinc-900 truncate
        ├── email: text-xs text-zinc-500 truncate
        └── Sign out button (ghost, sm, justify-start)
```

### Nav item
```tsx
<Link
  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-zinc-100 text-zinc-900"
      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
  }`}
>
  <Icon className="h-4 w-4" />
  {label}
</Link>
```

Key details:
- Icon size: `h-4 w-4`
- Gap between icon and label: `gap-3`
- Padding: `px-3 py-2` (comfortable touch target)
- Active: `bg-zinc-100 text-zinc-900` — subtle filled pill
- Inactive: `text-zinc-600` — dimmed text, no background
- Hover: `hover:bg-zinc-50 hover:text-zinc-900` — very light fill
- Border radius: `rounded-md`

### Brand display
The brand name "Sellxa" is plain bold text — no logo mark, no icon, no colour:
```tsx
<span className="text-lg font-bold tracking-tight">Sellxa</span>
```

---

## Page Layout

### App shell
```
div  flex h-screen overflow-hidden
  ├── <Sidebar />  w-56 flex-shrink-0
  └── main  flex-1 overflow-y-auto bg-zinc-50 p-6
```

### Content structure within `main`
```
div  space-y-6
  ├── Page header (title + subtitle)
  ├── Toolbar (search + filters + action button)
  └── Table or card content
```

### Auth / onboarding pages
Centred single-column card layout:
```
div  flex min-h-screen items-center justify-center bg-zinc-50 px-4
  └── Card  w-full max-w-sm
```

### Detail pages (e.g. Account detail)
```
div  space-y-6
  ├── Account header (back arrow + h1 + badges + edit button)
  ├── <Separator />
  └── <Tabs> with content panels
```

---

## Tables

Wrapped in `rounded-md border` container:
```tsx
<div className="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>  // h-10 px-2 font-medium text-sm text-foreground
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow className="cursor-pointer hover:bg-zinc-50">
        <TableCell>Value</TableCell>  // p-2 text-sm whitespace-nowrap
      </TableRow>
    </TableBody>
  </Table>
</div>
```

Key details:
- All text: `text-sm`
- Header: `font-medium` (not bold), `text-foreground` (zinc-900)
- Row separator: `border-b border-zinc-200` (from `[&_tr]:border-b`)
- Row hover: `hover:bg-zinc-50` (for clickable rows add `cursor-pointer`)
- Empty state cell: `h-24 text-center text-zinc-500` with colspan=all
- Table search/toolbar sits **above** the `rounded-md border` wrapper, in a `space-y-4` container

### Toolbar pattern above a table
```
div  space-y-4
  ├── div  flex items-center justify-between gap-4
  │     ├── <Input />  max-w-sm  (search)
  │     └── {toolbar}  (action button slot)
  └── div  rounded-md border
        └── <Table />
```

---

## Tabs

Used on settings pages and detail pages. Two visual variants:

### Default (pill tabs — settings page)
```
<TabsList>  bg-zinc-100 rounded-lg p-[3px] h-9 inline-flex
  <TabsTrigger>  rounded-md px-2 py-1 text-sm font-medium
    // inactive: text-zinc-500
    // active:   bg-white shadow-sm text-zinc-900
```

### Line variant (for larger navigation-style tabs)
```
<TabsList variant="line">
  // bg-transparent, triggers show an underline on active
```

Content area:
```tsx
<TabsContent className="mt-4">
  ...content...
</TabsContent>
```

---

## Dialogs / Modals

Built on Radix Dialog primitive via shadcn.

### Structure
```
DialogContent  // bg-white rounded-xl border shadow-xl, max-w-md by default
  ├── DialogHeader
  │     ├── DialogTitle      // text-lg font-semibold
  │     └── DialogDescription  // text-sm text-zinc-500
  ├── [form content]  // space-y-4 fields
  └── DialogFooter  // flex items-center justify-end gap-2
        ├── <Button variant="outline">Cancel</Button>
        └── <Button variant="default|destructive">Confirm</Button>
```

### Confirm / destructive dialog pattern
Cancel is always `variant="outline"`, on the left. Confirm is `variant="destructive"` for delete actions, `variant="default"` for non-destructive confirms. Both disabled while `isPending`:
```tsx
<DialogFooter>
  <Button variant="outline" onClick={onClose} disabled={isPending}>
    Cancel
  </Button>
  <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
    {isPending ? "Processing..." : "Delete"}
  </Button>
</DialogFooter>
```

---

## Toolbar / Page Action Pattern

Every list page has a toolbar above its table following this layout:

```
div  flex flex-wrap items-center gap-3
  ├── Search input (with icon, max-w-xs)
  ├── Filter badges  flex items-center gap-2
  │     ├── <Badge variant={active ? "default" : "outline"} className="cursor-pointer">
  │     └── ...more toggles
  └── div  ml-auto
        └── <Button size="sm"><Plus />New Item</Button>
```

The primary action button is always `size="sm"` with a `<Plus>` icon, pushed to the right with `ml-auto`.

---

## Dropdown Menus (Row Actions)

Used on every table row for edit/delete. The trigger is always a ghost icon button:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
    <DropdownMenuItem className="text-destructive" onClick={onDelete}>
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

Delete item always uses `className="text-destructive"` (red text). Clicking delete opens a `ConfirmDialog` — never deletes immediately.

---

## Separators

Used to divide structural sections (sidebar header / nav / user footer, card sections):
```tsx
<Separator />  // renders as border-t border-zinc-200, full width
```

---

## Loading States

### Spinner in card (full-page loading)
```tsx
<Card>
  <CardHeader className="text-center">
    <CardTitle>Setting up your workspace</CardTitle>
  </CardHeader>
  <CardContent className="flex flex-col items-center gap-3">
    <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
    <p className="text-sm text-zinc-500">Loading...</p>
  </CardContent>
</Card>
```

### Button loading state
```tsx
<Button disabled={isPending}>
  {isPending ? "Saving..." : "Save"}
</Button>
```

No spinner inside the button — just change the label text. Button is `disabled` during the pending state.

---

## Toast Notifications

Using **Sonner** with `richColors` enabled (set in root layout):
```tsx
<Toaster richColors />
```

Usage in components:
```ts
toast.success("Brand deleted")
toast.error(result.error)
```

No custom toast styling — richColors maps success → green, error → red automatically.

---

## Icons

All icons from **lucide-react**. Consistent sizing:

| Context | Size classes |
|---------|-------------|
| Navigation icons | `h-4 w-4` |
| Button icon (with label) | `h-4 w-4 mr-2` |
| Button icon (icon-only) | `h-4 w-4` |
| Back navigation arrow | `h-5 w-5` |
| Search field icon | `h-4 w-4 text-zinc-400` |
| Loading spinner | `h-8 w-8 animate-spin text-zinc-400` |
| Small inline icon | `h-3 w-3` or `h-3.5 w-3.5` |

---

## Spacing & Radius

### Border radius
| Context | Class | Value |
|---------|-------|-------|
| Cards | `rounded-xl` | ~14px |
| Buttons, inputs, dropdowns | `rounded-md` | ~8px |
| Badges | `rounded-full` | fully round |
| Table wrapper | `rounded-md` | ~8px |
| Tabs list | `rounded-lg` | ~10px |

### Spacing scale
| Gap | Tailwind | Use |
|-----|----------|-----|
| `gap-2` / `space-x-2` | 8px | Tight inline elements (badges, small icon+text) |
| `gap-3` | 12px | Nav icon+label, toolbar items |
| `gap-4` | 16px | Standard horizontal spacing |
| `space-y-4` | 16px | Form fields |
| `space-y-6` | 24px | Page sections |
| `p-6` | 24px | Main content padding |
| `px-6` | 24px | Card content horizontal padding |
| `py-6` | 24px | Card vertical padding |
| `px-3 py-2` | 12/8px | Nav item padding |
| `px-4` | 16px | Button default horizontal padding |

---

## Shadows

Very restrained — only `shadow-sm` (used on cards and inputs). No `shadow-md`, `shadow-lg`, or coloured shadows anywhere. Structure comes from borders, not shadows.

| Element | Shadow |
|---------|--------|
| Cards | `shadow-sm` |
| Inputs | `shadow-xs` |
| Dialogs | `shadow-xl` (from Radix defaults) |
| Buttons | none by default |
| Active tab | `shadow-sm` (on the trigger pill) |

---

## Component Dependencies

To replicate this design system in another project:

| Package | Purpose |
|---------|---------|
| `tailwindcss` v4 | Utility CSS |
| `shadcn/ui` | Component primitives (button, card, input, badge, table, tabs, dialog, dropdown) |
| `radix-ui` | Headless primitives underlying shadcn |
| `class-variance-authority` | `cva()` for variant-based component styling |
| `lucide-react` | All icons |
| `sonner` | Toast notifications |
| `@fontsource/inter` or `next/font/google` | Inter typeface |
| `tw-animate-css` | Animation utilities (used in globals.css) |

The CSS variable definitions in `globals.css` are the single source of truth. All Tailwind colour utilities (`bg-background`, `text-foreground`, `border-border`, etc.) resolve to these variables. Copy the `:root` and `.dark` blocks verbatim and the palette is portable.
