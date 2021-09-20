import esbuild from "esbuild"
import glob from "glob"
import pkg from "./package.json"
import checker from "license-checker"
import fs from "fs"

const sourceFolder = process.env.BUILD_SOURCE_FOLDER || "./src"
const targetFolder = process.env.BUILD_TARGET_FOLDER || "./dist"

// Node ESM build
esbuild.buildSync({
  entryPoints: glob.sync(`${sourceFolder}/**/*.js`),
  platform: "node",
  format: "esm",
  outdir: `${targetFolder}/esm`,
})

// Node CJS build
esbuild.buildSync({
  entryPoints: [`${sourceFolder}/index.js`],
  platform: "node",
  format: "cjs",
  outdir: `${targetFolder}/cjs`,
  outExtension: {
    ".js": ".cjs",
  },
  bundle: true,
  external: Object.keys(pkg.dependencies),
})

// Browser
const browserTargetFile = `${targetFolder}/${pkg.name}.js`
const browserTargetFileLicenses = `${browserTargetFile}.LICENSES.txt`
let licenseFile = "./LICENSE"

// Licenses file
checker.init({
  start: "./",
  production: true,
}, (error, packages) => {
  if (error) {
    console.error("Error assembling licenses:", error)
    process.exit(1)
  }
  let text = ""
  for (const name of Object.keys(packages)) {
    const pkgInfo = packages[name]
    if (pkgInfo.path === "./") {
      if (pkgInfo.licenseFile) {
        licenseFile = `${pkgInfo.path}${pkgInfo.licenseFile}`
      }
      continue
    }
    text += `\n${name} by ${pkgInfo.publisher} (${pkgInfo.repository})\n`
    text += `License: ${pkgInfo.licenses}\n\n`
    text += fs.readFileSync(pkgInfo.licenseFile, "utf-8")
    text += "\n---\n"
  }
  fs.writeFileSync(browserTargetFileLicenses, text)
})

// Copyright for banner
const bannerCopyright = fs.readFileSync(licenseFile, "utf-8").split("\n").find(l => l.startsWith("Copyright"))

// Browser build
esbuild.buildSync({
  entryPoints: [`${sourceFolder}/index.js`],
  bundle: true,
  minify: true,
  sourcemap: true,
  target: "es2015",
  format: "iife",
  globalName: "CDK",
  outfile: browserTargetFile,
  banner: {
    js: `/*!
* ${pkg.name} v${pkg.version}
* ${bannerCopyright}
* @license ${pkg.license}
*
* For dependency license information, please see ${browserTargetFileLicenses}.
*/`,
  },
})
