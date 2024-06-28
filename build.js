import esbuild from "esbuild"
import { globSync as glob } from "glob"
import checker from "license-checker"
import fs from "fs"
const readFile = fs.promises.readFile
import ifdef from "esbuild-plugin-ifdef";

(async () => {
  const pkg = JSON.parse(
    await readFile("./package.json"),
  )

  const sourceFolder = process.env.BUILD_SOURCE_FOLDER || "./src"
  const targetFolder = process.env.BUILD_TARGET_FOLDER || "./dist"
  let define = {}

  // Node ESM build
  await esbuild.build({
    entryPoints: glob(`${sourceFolder}/**/*.js`),
    platform: "node",
    format: "esm",
    outdir: `${targetFolder}/esm`,
    define,
    plugins: [ifdef(define)],
  })

  // Node CJS build
  await esbuild.build({
    entryPoints: [`${sourceFolder}/index.js`],
    platform: "node",
    format: "cjs",
    outdir: `${targetFolder}/cjs`,
    outExtension: {
      ".js": ".cjs",
    },
    bundle: true,
    external: Object.keys(pkg.dependencies),
    define,
    plugins: [ifdef(define)],
  })

  // Browser
  define["process.browser"] = "true"
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
  await esbuild.build({
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
    define,
    plugins: [ifdef(define)],
  })

})()
