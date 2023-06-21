import fs from "fs";
import path from "path";
import { formatFile } from "./formatFile";

export const writeFileSafely = async (writeLocation: string, content: any) => {
  fs.mkdirSync(path.dirname(writeLocation), {
    recursive: true,
  });

  const fileContent = await formatFile(content, writeLocation);

  fs.writeFileSync(writeLocation, fileContent);
};
