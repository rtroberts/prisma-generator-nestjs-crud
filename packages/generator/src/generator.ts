import { generatorHandler, GeneratorOptions } from "@prisma/generator-helper";
import { logger } from "@prisma/internals";
import path from "path";
import { GENERATOR_NAME } from "./constants";
import { genModel } from "./helpers/genModel";
import prettier from "prettier";
import fs from "fs";

const { version } = require("../package.json");

generatorHandler({
  onManifest() {
    logger.info(`${GENERATOR_NAME}:Registered`);
    return {
      version,
      defaultOutput: "../generated",
      prettyName: GENERATOR_NAME,
    };
  },
  onGenerate: async (options: GeneratorOptions) => {
    const opts = await prettier.resolveConfig(process.cwd());

    options.dmmf.datamodel.models.forEach(async (modelInfo) => {
      // generate service
      const [modelName, service, mod, controller] = genModel(modelInfo);
      if (!modelName) return;

      const serviceWriteLocation = path.join(
        options.generator.output?.value!,
        "src",
        modelName,
        `${modelName}.service.ts`
      );
      const moduleWriteLocation = path.join(
        options.generator.output?.value!,
        "src",
        modelName,
        `${modelName}.module.ts`
      );
      const controllerWriteLocation = path.join(
        options.generator.output?.value!,
        "src",
        modelName,
        `${modelName}.controller.ts`
      );

      writeFile(serviceWriteLocation, service || "", opts);
      writeFile(moduleWriteLocation, mod || "", opts);
      writeFile(controllerWriteLocation, controller || "", opts);
    });
  },
});

function writeFile(dir: string, input: string, opts: prettier.Options | null) {
  let content = input;
  if (!!opts) content = prettier.format(content, { ...opts, parser: "typescript" });

  fs.mkdirSync(path.dirname(dir), { recursive: true });
  fs.writeFileSync(dir, content);
}
