# Cocoda SDK
[![Build Status](https://travis-ci.com/gbv/cocoda-sdk.svg?branch=master)](https://travis-ci.com/gbv/cocoda-sdk)
[![GitHub package version](https://img.shields.io/github/package-json/v/gbv/cocoda-sdk.svg?label=version)](https://github.com/gbv/cocoda-sdk)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg)](https://github.com/RichardLitt/standard-readme)

> SDK for [Cocoda](https://github.com/gbv/cocoda) and [coli-conc](https://coli-conc.gbv.de/) services

**Note: This is currently evolving and methods can be removed or changed without notice! If you're not prepared for that, please wait until version 1.0.0.**

## Table of Contents
- [Install](#install)
- [Usage](#usage)
- [Maintainers](#maintainers)
- [Contribute](#contribute)
- [License](#license)

## Install
```bash
npm i gbv/cocoda-sdk
```

We suggest to install it referring to a certain commit and updating only after making sure that everything works (at least until version 1.0.0 is released):

```bash
npm i gbv/cocoda-sdk#abc1def
```

**Note:** Replace the commit hash with the desired commit.

## Usage

### Import
`cocoda-sdk` exports a singleton, that means that the same object is used anywhere in a project where `cocoda-sdk` is imported.

```js
const cdk = require("cocoda-sdk")
```

### Methods
...

## Maintainers
- [@stefandesu](https://github.com/stefandesu)
- [@nichtich](https://github.com/nichtich)

## Contribute
PRs accepted.

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License
MIT Copyright (c) 2020 Verbundzentrale des GBV (VZG)
