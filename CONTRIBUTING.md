# Contributing to cocoda-sdk

> Thanks for your interest in improving cocoda-sdk and its documentation, your contributions are welcome!

To start contributing please make sure you have a [GitHub account](https://github.com/signup/free). Bug reports and feature requests can best be given [as GitHub issues](https://github.com/gbv/cocoda-sdk/issues). We use a [GitHub repository](https://github.com/gbv/cocoda-sdk) for version control and CI. 

## Development

Please work on the `dev` branch during development (or better yet, develop in a feature branch and merge into `dev` when ready).

```bash
git clone https://github.com/gbv/cocoda-sdk.git
cd cocoda-sdk
npm install
```

## Build

Create minimized build files in `dist/`, both ESM (`import`) and CommonJS (`require`):

```bash
npm run build
```

## Tests

Please always run tests and aim at high test coverage.

```bash
npm test
npm run coverage
```

## Documentation

If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## Release

When a new release is ready (i.e. the features are finished, merged into `dev`, and all tests succeed), run the included release script (replace "patch" with "minor" or "major" if necessary):

```bash
npm run release:patch
```

This will:
- Check that we are on `dev`
- Run tests and build to make sure everything works
- Make sure `dev` is up-to-date
- Run `npm version patch` (or "minor"/"major")
- Push changes to `dev`
- Switch to `main`
- Merge changes from `dev`
- Push `main` with tags
- Switch back to `dev`

After running this, GitHub Actions will **automatically publish the new version to npm**. It will also create a new GitHub Release draft. Please **edit and publish the release draft manually**.

