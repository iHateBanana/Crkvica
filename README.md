# Crkvica

An Orthodox daily companion: calendar with red-letter feasts and fasting, saints and readings, prayer rule with streaks, journal, a personal daily check-in, a family and cycle tracker, and Serbian slava / name days. Available in English, Српски and Srpski.

Built with Expo (React Native + TypeScript, expo-router) for web, iOS and Android, with Supabase for accounts and data.

## Requirements

- Node.js 20+
- A [Supabase](https://supabase.com) project
- Optional: an [Expo](https://expo.dev) account (mobile builds) and a Vercel or Netlify account (web hosting)

## Setup

```bash
npm install
cp .env.example .env     # on Windows: copy .env.example .env
```

Fill in `.env` with your project's values (Supabase dashboard, Project Settings, API):

```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable / anon key>
```

Only the publishable (anon) key belongs here. Never put the `service_role` key or the database password in the app or in git.

```bash
npm run web        # run in the browser
npm run android    # or: npm run ios
npm run typecheck
```

## Database (Supabase)

Migrations live in `supabase/migrations`. Apply them to your project:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

If direct connections fail (IPv6), push through the pooler:

```bash
npx supabase db push --db-url "postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
```

Row Level Security is enabled on every table, so each user can only read and write their own rows.

### Auth settings (Supabase dashboard, Authentication)

- **Providers, Allow anonymous sign-ins:** turn on. This powers "Continue as guest" and the Create profile card.
- **Providers, Email:** keep on. "Confirm email" is kept off, so new users are signed in immediately. Emails are not verified, so consider CAPTCHA or rate limits against abuse.
- **URL Configuration:** set the Site URL to your deployed web address, and add it (and `theosis://`) to Redirect URLs so email links return to the app.
- **Rate limits and CAPTCHA:** turn on CAPTCHA if anonymous sign-ins get abused.
- For real email delivery at scale, configure a custom SMTP provider; the built-in sender is heavily rate-limited.

## Deploy the web app

The web build is a static single-page app exported to `dist/`.

```bash
npm run build:web
```

**Vercel:** import the repo. `vercel.json` already sets the build command, output directory and SPA rewrites. Add the two `EXPO_PUBLIC_*` variables under Project Settings, Environment Variables.

**Netlify:** import the repo. `netlify.toml` sets the build, publish directory and redirects. Add the same two variables in Site settings.

Any static host works if it serves `index.html` for unknown paths. `EXPO_PUBLIC_*` values are baked in at build time, so rebuild after changing them.

## Install as an app (PWA, free)

The web build is installable: `public/manifest.webmanifest`, the icons in `public/` and `public/index.html` make it open full screen with the Crkvica icon. After deploying over HTTPS, open the site on a phone and choose **Share, Add to Home Screen** (iPhone, in Safari) or **menu, Install app** (Android, in Chrome).

## Deploy the mobile apps (EAS)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview      # installable APK for testing
eas build --platform all --profile production       # store builds
eas submit --platform android                       # then: --platform ios
```

- Set the secrets so builds can reach Supabase:
  `eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value <url> --environment production --visibility plaintext`
  and the same for `EXPO_PUBLIC_SUPABASE_ANON_KEY` (repeat for the `preview` environment).
- The bundle identifier and Android package are `com.theosis.app` in `app.json`. Change them to an identifier you own before the first store build; they cannot be changed afterwards.
- Store listings need a privacy policy URL. The app stores account details, check-ins, journal and cycle data, so say so plainly.
- Apple and Google require in-app account deletion for apps with sign-up. Add that (or a clear deletion process) before submitting.

## Release checklist

- [ ] `npm run typecheck` passes and `npm run build:web` succeeds
- [ ] All migrations pushed; anonymous sign-ins and redirect URLs configured
- [ ] Database password reset if it was ever shared; delete test accounts
- [ ] Bundle identifier changed to your own
- [ ] Privacy policy published; account deletion available
- [ ] Content reviewed (see below)

## Content notice

Feast descriptions, saint stories, the slava / name-day table, fasting exceptions and the Serbian translations were written from general knowledge and should be reviewed by a priest or a reliable source before wide release. Fasting guidance is general; users should follow their own parish and spiritual father. The cycle tracker shows illustrative curves and estimates, not medical advice. Daily readings and saints come from [Orthocal](https://orthocal.info).

## Project layout

- `app/` screens and routing (tabs: Today, Calendar, Prayer, Journal, Family, Profile)
- `src/lib/` logic and shared UI (`orthodox.ts` calendar and fasting, `cycle.ts`, `i18n.ts` and `sr.ts` translations, `ui.tsx` theme)
- `supabase/migrations/` database schema
- `assets/` icons and splash

## License

See `LICENSE`.
