const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const escapeRegExp = (value) => value.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
const projectDirPattern = (relativePath) => {
  const absolutePath = path.resolve(__dirname, relativePath);
  const normalized = absolutePath.split(path.sep).map(escapeRegExp).join("[\\\\/]");
  return new RegExp(`^${normalized}(?:[\\\\/].*)?$`);
};

config.resolver.blockList = [
  projectDirPattern(".gradle"),
  projectDirPattern(".gradle-local"),
  projectDirPattern(".expo"),
  projectDirPattern("android/build"),
  projectDirPattern("android/app/build"),
  projectDirPattern("dist"),
  projectDirPattern("local-jdk"),
  projectDirPattern("release"),
];

module.exports = config;
