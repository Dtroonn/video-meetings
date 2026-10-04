import path from 'node:path';

const apps = ['api', 'web'];

const quote = (files) => files.map((file) => `"${file}"`).join(' ');

// ESLint must run from the owning app's directory so it picks up that app's flat config.
const eslintForApp = (app) => (files) => {
  const root = path.resolve('apps', app);
  const relative = files.map((file) => path.relative(root, file).split(path.sep).join('/'));
  return `pnpm --dir apps/${app} exec eslint --fix --no-warn-ignored ${quote(relative)}`;
};

export default {
  ...Object.fromEntries(
    apps.map((app) => [`apps/${app}/**/*.{js,jsx,mjs,ts,tsx}`, eslintForApp(app)]),
  ),
  '*': 'prettier --write --ignore-unknown',
};
