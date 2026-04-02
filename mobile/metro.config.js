const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");
const sharedRoot = path.resolve(workspaceRoot, "packages/shared");

const config = getDefaultConfig(projectRoot);

// Tell Metro to watch the workspace root and shared package
config.watchFolders = [workspaceRoot, sharedRoot];

// Resolve modules from both mobile/node_modules and the root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Block server-only modules from being bundled by Metro
// kysely and pg are only used at runtime by the web server
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "pg" || moduleName === "kysely") {
    return { type: "empty" };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
