import fs from 'fs';

export default function(filePath: string, ...params: any[]) {
  const targetPath = require("path").join(__dirname, filePath);
  const files = fs.readdirSync(targetPath);
  files.forEach((file: string) => {
    const controller = require(`${targetPath}/${file}`);
    controller.default(...params);
  });
}
