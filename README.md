# ayazbala портфолиосы

Қуат Ақылбектің қазақша, орысша және ағылшынша жеке портфолиосы. Жоба React + TypeScript + Vite және процедуралық Three.js сахнасында жасалған.

## Іске қосу

Қажетті бағдарламалар: Node.js 20 немесе одан жаңасы және VS Code.

VS Code терминалында:

```bash
npm install
npm run dev
```

Терминал көрсеткен жергілікті URL-ді браузерде ашыңыз. Production тексеруі үшін `npm run build`, ал дайын build-ті көру үшін `npm run preview` орындаңыз. Lint үшін `npm run lint` командасы бар.

## Контентті өзгерту

- Жеке ақпарат пен байланыстар: `src/data/profile.ts`
- Жобалар: `src/data/projects.ts`. Әр жазбаға кейін description, image, technologies және URL өрістерін қосуға болады.
- UGC жазбалары: `src/data/ugc.ts`. Видео қосылғанда 9:16 local video немесе сыртқы URL қолдануға болады.
- Үш тілдегі мәтіндер: `src/i18n/translations.ts`
- Стиль айнымалылары: `src/index.css`

Фото, студенттік ID, GPA және университет қосымшасының скриншотын жарияланатын бумаға қоспаңыз. Жеке портретті кейін компонентке нақты файл ретінде қосуға болады.

## 3D сахна

Қазіргі нұсқа сыртқы модельсіз жұмыс істейді: `src/components/Character.tsx` және `src/components/HeroScene.tsx` процедуралық геометрия қолданады. GLB/GLTF модельді ауыстыру жөніндегі нұсқау және қазіргі активтердің тізімі `SCENE_ASSETS.md` ішінде. Модельді `public/models/` ішіне қосып, `useGLTF` арқылы нақты файлды көрсетіңіз. Жоқ файлға немесе ойдан шығарылған URL-ге сілтеме жасамаңыз.

## Тексеру

Тіл localStorage-та сақталады, `html lang` өзгереді, мобильді мәзір клавиатурамен ашылады, email көшіру нәтижесін көрсетеді. 3D сыртқы модельге тәуелсіз, сондықтан модель жоқ кезде бос canvas мәселесі болмайды. `prefers-reduced-motion` режимінде pointer анимациясы тоқтайды.
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
